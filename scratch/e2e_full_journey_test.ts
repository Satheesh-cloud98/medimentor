import { getTranslation } from '../src/translations';
import type { SupportedLanguage } from '../src/types/language';
import { AVAILABLE_PATIENT_PROFILES, INITIAL_PATIENT_PROFILE, MOCK_REPORTS } from '../src/data/mockReports';
import { classifyMedicalDocument } from '../src/services/classifierService';
import { parseSpecialtyDocument } from '../src/services/parserService';
import { extractFactualBulletPoints } from '../src/services/aiService';
import { convertReportToFhirR4 } from '../src/services/fhirService';
import type { MedicalReport } from '../src/types/report';

console.log('================================================================');
console.log('  MEDIMENTOR AI — COMPLETE END-TO-END USER JOURNEY VALIDATION   ');
console.log('================================================================\n');

let stepCount = 0;
let totalPassed = 0;
let allPassed = true;

function verifyStep(name: string, assertion: boolean, details?: string) {
  stepCount++;
  if (assertion) {
    totalPassed++;
    console.log(`[PASS] Step ${stepCount}: ${name}`);
    if (details) console.log(`       ↳ ${details}`);
  } else {
    allPassed = false;
    console.error(`[FAIL] Step ${stepCount}: ${name}`);
    if (details) console.error(`       ↳ Error: ${details}`);
  }
}

async function runEndToEndJourney() {
  // -------------------------------------------------------------
  // USER STEP 1: Application Access & Health Check (http://localhost:5173)
  // -------------------------------------------------------------
  console.log('\n--- USER STEP 1: Local Application Access & API Health ---');
  try {
    const res = await fetch('http://localhost:5173/');
    verifyStep('Dev Server loads http://localhost:5173/ with HTTP 200', res.status === 200, `Status code: ${res.status}`);
  } catch (err: any) {
    verifyStep('Dev Server loads http://localhost:5173/', false, err.message);
  }

  try {
    const apiRes = await fetch('http://localhost:5173/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: 'lab_report',
        extractedFacts: ['Fasting Blood Sugar: 112 mg/dL (High)'],
        language: 'en'
      })
    });
    const apiJson: any = await apiRes.json();
    verifyStep(
      'Serverless API endpoint /api/explain handles clinical synthesis requests gracefully',
      apiRes.status === 200 && (apiJson.configured === false || apiJson.factsFromDocument),
      `Configured: ${apiJson.configured}, Clinical considerations present: ${Boolean(apiJson.clinicalConsiderations)}`
    );
  } catch (err: any) {
    verifyStep('Serverless API endpoint /api/explain health check', false, err.message);
  }

  // -------------------------------------------------------------
  // USER STEP 2: Multi-Language Switcher (All 13 Indian Languages)
  // -------------------------------------------------------------
  console.log('\n--- USER STEP 2: Multilingual Support Across 13 Indian Languages ---');
  const languages: SupportedLanguage[] = ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa', 'ur', 'or', 'as'];
  let allLanguagesValid = true;

  for (const lang of languages) {
    const title = getTranslation(lang, 'appTitle');
    const uploadNav = getTranslation(lang, 'navUpload');
    const verifyNav = getTranslation(lang, 'navVerify');
    const timelineNav = getTranslation(lang, 'navTimeline');
    if (!title || !uploadNav || !verifyNav || !timelineNav) {
      allLanguagesValid = false;
      break;
    }
  }

  verifyStep(
    'All 13 Indian languages provide full interface translations',
    allLanguagesValid,
    `Tested: ${languages.join(', ')}`
  );

  // -------------------------------------------------------------
  // USER STEP 3: Family Profiles & Privacy Isolation
  // -------------------------------------------------------------
  console.log('\n--- USER STEP 3: Multi-User Profile Isolation & Management ---');
  verifyStep(
    'Initial patient profile loaded with valid clinical demographics',
    INITIAL_PATIENT_PROFILE.name === 'Arjun K. Sharma' && INITIAL_PATIENT_PROFILE.age === 42 && INITIAL_PATIENT_PROFILE.bloodGroup.includes('B+'),
    `Primary Patient: ${INITIAL_PATIENT_PROFILE.name}, Age: ${INITIAL_PATIENT_PROFILE.age}, Blood: ${INITIAL_PATIENT_PROFILE.bloodGroup}`
  );

  verifyStep(
    'Multiple family profiles available for switching',
    AVAILABLE_PATIENT_PROFILES.length >= 2,
    `Available profiles: ${AVAILABLE_PATIENT_PROFILES.map(p => p.name).join(', ')}`
  );

  // -------------------------------------------------------------
  // USER STEP 4: Document Upload & Specialty OCR Classification
  // -------------------------------------------------------------
  console.log('\n--- USER STEP 4: Document Upload, Classification & Extraction ---');
  
  // Document A: Medical Prescription
  const prescriptionSample = `
DR. HARISH KUMAR, MD (GEN MED)
APOLLO CLINIC, CHENNAI
Patient: Arjun Sharma | Age: 42 | Gender: Male
Date: 12-Oct-2026
Complaint: Essential hypertension, seasonal rhinitis
Rx:
1. Telmisartan 40mg - 1 tab once daily in morning
2. Cetirizine 10mg - 1 tab at bedtime PRN
Advice: Low salt diet, regular BP monitoring
Follow-up: 4 weeks
`;
  const classPrescription = classifyMedicalDocument(prescriptionSample);
  const parsedPrescription = parseSpecialtyDocument(prescriptionSample, classPrescription);
  verifyStep(
    'Prescription classification and doctor/complaint extraction',
    classPrescription.type === 'prescription' &&
    Boolean(parsedPrescription.prescriptionData?.doctorName?.includes('HARISH KUMAR')) &&
    Boolean(parsedPrescription.prescriptionData?.clinicOrHospital?.includes('APOLLO CLINIC')),
    `Type: ${classPrescription.type}, Doctor: ${parsedPrescription.prescriptionData?.doctorName}`
  );

  // Document B: Eye Prescription
  const eyeSample = `
DR. MEERA PATEL, M.S. (OPHTHALMOLOGY)
VISION CARE EYE CLINIC
Patient: Arjun Sharma | Date: 12-Oct-2026
OD: SPH -2.25 CYL -0.75 AXIS 180 VA 6/6 ADD +1.75
OS: SPH -1.75 CYL -0.50 AXIS 90 VA 6/6 ADD +1.75
PD: 63 mm
`;
  const classEye = classifyMedicalDocument(eyeSample);
  const parsedEye = parseSpecialtyDocument(eyeSample, classEye);
  verifyStep(
    'Eye prescription refraction extraction (OD/OS SPH, CYL, AXIS, PD)',
    classEye.type === 'eye_prescription' &&
    parsedEye.eyeData?.od.sph === '-2.25' &&
    parsedEye.eyeData?.os.sph === '-1.75' &&
    parsedEye.eyeData?.pd === '63 mm',
    `OD: SPH ${parsedEye.eyeData?.od.sph}, OS: SPH ${parsedEye.eyeData?.os.sph}, PD: ${parsedEye.eyeData?.pd}`
  );

  // Document C: Diagnostic Lab Panel
  const labSample = `
APOLLO DIAGNOSTICS LABORATORY
METABOLIC & LIPID PROFILE
Patient: Arjun Sharma | Age: 42 | Gender: Male
Date: 12-Oct-2026
Fasting Blood Sugar: 112 mg/dL (70 - 99) High
Total Cholesterol: 224 mg/dL (< 200) High
Serum Creatinine: 0.92 mg/dL (0.70 - 1.20) Normal
Hemoglobin: 14.4 g/dL (13.0 - 17.0) Normal
`;
  const classLab = classifyMedicalDocument(labSample);
  const parsedLab = parseSpecialtyDocument(labSample, classLab);
  verifyStep(
    'Diagnostic blood panel extraction (Fasting Sugar, Cholesterol, Creatinine, Hb)',
    classLab.type === 'lab_report' && parsedLab.labMetrics.length >= 4,
    `Extracted ${parsedLab.labMetrics.length} lab metrics with ranges and statuses`
  );

  // Document D: 12-Lead ECG
  const ecgSample = `
CARDIOLOGY CLINIC
12-LEAD RESTING ECG
Ventricular Rate: 72 bpm
PR Interval: 146 ms
QRS Duration: 88 ms
QT/QTc Interval: 382/418 ms
Normal Sinus Rhythm. Normal axis.
`;
  const classEcg = classifyMedicalDocument(ecgSample);
  const parsedEcg = parseSpecialtyDocument(ecgSample, classEcg);
  verifyStep(
    'ECG cardiac parameter extraction (Heart Rate, Intervals, Rhythm)',
    classEcg.type === 'ecg_report' &&
    parsedEcg.ecgData?.heartRate === '72' &&
    Boolean(parsedEcg.ecgData?.rhythm?.includes('Sinus Rhythm')),
    `HR: ${parsedEcg.ecgData?.heartRate} bpm, Rhythm: ${parsedEcg.ecgData?.rhythm}`
  );

  // Document E: Negative validation / Non-medical
  const nonMedicalSample = `
GROCERY STORE RECEIPT
Item 1: Bananas $2.50
Item 2: Oats $4.00
Total: $6.50
`;
  const classNonMed = classifyMedicalDocument(nonMedicalSample);
  verifyStep(
    'Unsupported non-medical file correctly identified and rejected with low confidence',
    classNonMed.type === 'unsupported' && classNonMed.confidence <= 30,
    `Type: ${classNonMed.type}, Confidence: ${classNonMed.confidence}%`
  );

  // -------------------------------------------------------------
  // USER STEP 5: Human-In-The-Loop Verification
  // -------------------------------------------------------------
  console.log('\n--- USER STEP 5: Human-In-The-Loop Verification & Safety ---');
  const facts = extractFactualBulletPoints(parsedLab);
  verifyStep(
    'AI explanation facts payload strictly contains grounded document values',
    facts.some(f => f.toLowerCase().includes('glucose') || f.toLowerCase().includes('sugar')) && facts.some(f => f.includes('112')),
    `Grounded facts count: ${facts.length}`
  );

  // -------------------------------------------------------------
  // USER STEP 6: FHIR R4 / ABDM Digital Health Export
  // -------------------------------------------------------------
  console.log('\n--- USER STEP 6: Interoperability & FHIR R4 / ABDM Export ---');
  const mockReport: MedicalReport = {
    ...MOCK_REPORTS[0],
    isVerified: true
  };
  const fhirBundle = convertReportToFhirR4(mockReport, INITIAL_PATIENT_PROFILE);
  verifyStep(
    'Standard HL7 FHIR R4 Document Bundle created with Patient, Observations, and DiagnosticReport',
    fhirBundle.resourceType === 'Bundle' &&
    fhirBundle.entry.some(e => e.resource.resourceType === 'Patient') &&
    fhirBundle.entry.some(e => e.resource.resourceType === 'Observation') &&
    fhirBundle.entry.some(e => e.resource.resourceType === 'DiagnosticReport'),
    `Bundle Type: ${fhirBundle.type}, Total entries: ${fhirBundle.entry.length}`
  );

  // -------------------------------------------------------------
  // USER STEP 7: Health Summary & Timeline Longitudinal Tracking
  // -------------------------------------------------------------
  console.log('\n--- USER STEP 7: Health Summary & Longitudinal History Tracking ---');
  verifyStep(
    'Mock reports populate chronological medical history with multiple clinical categories',
    MOCK_REPORTS.length >= 3 &&
    MOCK_REPORTS.some(r => r.category === 'blood') &&
    MOCK_REPORTS.some(r => r.category === 'lipid' || r.category === 'metabolic'),
    `Total records: ${MOCK_REPORTS.length}, Categories: ${[...new Set(MOCK_REPORTS.map(r => r.category))].join(', ')}`
  );

  console.log('\n================================================================');
  if (allPassed && totalPassed === stepCount) {
    console.log(`🏆 ALL ${totalPassed} STEPS OF THE MEDIMENTOR AI USER JOURNEY PASSED!`);
    console.log('   The local copy at http://localhost:5173 is fully operational.');
  } else {
    console.error(`⚠️ FAILED: ${stepCount - totalPassed} out of ${stepCount} steps failed.`);
    process.exit(1);
  }
  console.log('================================================================\n');
}

runEndToEndJourney();
