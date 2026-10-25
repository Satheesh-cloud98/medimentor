import { classifyMedicalDocument } from '../src/services/classifierService';
import { parseSpecialtyDocument } from '../src/services/parserService';
import { extractFactualBulletPoints } from '../src/services/aiService';
import { convertReportToFhirR4 } from '../src/services/fhirService';
import type { MedicalReport } from '../src/types/report';

let allPassed = true;
let testCount = 0;
const TOTAL_TESTS = 47;

function assert(condition: boolean, msg: string) {
  testCount++;
  if (!condition) {
    console.error(`❌ [Test ${testCount}/${TOTAL_TESTS}] FAILED: ${msg}`);
    allPassed = false;
  } else {
    console.log(`✅ [Test ${testCount}/${TOTAL_TESTS}] PASSED: ${msg}`);
  }
}

console.log('=== TEST SUITE: MEDIMENTOR AI MEDICAL PIPELINE (47 TESTS / 10 SCENARIOS) ===\n');

// ==========================================
// SCENARIO 1: Sample Medical Prescription Demo
// ==========================================
console.log('--- Scenario 1: Medical Prescription Processing ---');
const prescriptionText = `
SAMPLE MEDICAL PRESCRIPTION
City Hospital & Polyclinic
Doctor: Dr. Ramesh Verma, MBBS, MD
Patient: Demo Patient | Age: 42 | Gender: Male
Date: 12/10/2026
Complaint: Mild headache, fatigue, hypertension follow-up
Clinical notes: Sample entry for OCR parsing and verification pipeline.
Medication: Not specified in document
Advice: Consult a qualified healthcare professional before taking medications.
Follow-up in 2 weeks.
`;

const res1 = classifyMedicalDocument(prescriptionText);
assert(res1.type === 'prescription', `Type is prescription (got: ${res1.type})`);
assert(res1.confidence >= 80, `Confidence is high (got: ${res1.confidence}%)`);

const parsed1 = parseSpecialtyDocument(prescriptionText, res1);
assert(Boolean(parsed1.prescriptionData), 'prescriptionData is populated');
assert(parsed1.prescriptionData?.doctorName?.includes('Ramesh Verma') || false, 'Doctor name extracted');
assert(parsed1.prescriptionData?.clinicOrHospital?.includes('City Hospital') || false, 'Clinic extracted');
assert(parsed1.prescriptionData?.complaintOrDiagnosis?.includes('headache') || false, 'Complaint extracted');
assert(parsed1.prescriptionData?.medicationsNotes === 'Not specified in document', 'Medication notes flagged when missing');

// ==========================================
// SCENARIO 2: Eye Refraction Prescription
// ==========================================
console.log('\n--- Scenario 2: Eye Refraction Prescription ---');
const eyeText = `
VISION CARE EYE CLINIC
Spectacle Prescription
Dr. Anjali Mehta, Optometrist
Patient: Rajesh Patel | Date: 15/09/2026
OD (Right Eye): SPH -2.25 CYL -0.50 AXIS 90 ADD +1.50 VA 6/6
OS (Left Eye): SPH -1.75 CYL -0.75 AXIS 85 ADD +1.50 VA 6/6
Pupillary Distance (PD): 64 mm
Anti-reflective coating recommended.
`;

const res2 = classifyMedicalDocument(eyeText);
assert(res2.type === 'eye_prescription', `Type is eye_prescription (got: ${res2.type})`);
const parsed2 = parseSpecialtyDocument(eyeText, res2);
assert(Boolean(parsed2.eyeData), 'eyeData is populated');
assert(parsed2.eyeData?.od.sph === '-2.25', `OD SPH is -2.25 (got: ${parsed2.eyeData?.od.sph})`);
assert(parsed2.eyeData?.od.cyl === '-0.50', `OD CYL is -0.50 (got: ${parsed2.eyeData?.od.cyl})`);
assert(parsed2.eyeData?.od.axis?.includes('90') || false, `OD AXIS includes 90 (got: ${parsed2.eyeData?.od.axis})`);
assert(parsed2.eyeData?.od.add?.includes('1.50') || false, `OD ADD includes +1.50 (got: ${parsed2.eyeData?.od.add})`);
assert(parsed2.eyeData?.od.va?.includes('6/6') || false, `OD VA includes 6/6 (got: ${parsed2.eyeData?.od.va})`);
assert(parsed2.eyeData?.os.sph === '-1.75', `OS SPH is -1.75 (got: ${parsed2.eyeData?.os.sph})`);
assert(parsed2.eyeData?.os.cyl === '-0.75', `OS CYL is -0.75 (got: ${parsed2.eyeData?.os.cyl})`);
assert(parsed2.eyeData?.pd === '64 mm', `PD is 64 mm (got: ${parsed2.eyeData?.pd})`);

// ==========================================
// SCENARIO 3: Diagnostic Laboratory Blood Panel
// ==========================================
console.log('\n--- Scenario 3: Diagnostic Laboratory Blood Panel ---');
const labText = `
METROPOLIS DIAGNOSTIC SERVICES
Comprehensive Metabolic & Lipid Panel
Patient: Arjun Sharma | Age: 42 | Gender: Male
Date: 10/10/2026
Test Name               Result      Unit        Reference Range     Status
Fasting Blood Sugar     112         mg/dL       70 - 99             High
Total Cholesterol       224         mg/dL       < 200               High
Serum Creatinine        0.92        mg/dL       0.70 - 1.20         Normal
Hemoglobin              14.6        g/dL        13.0 - 17.0         Normal
`;

const res3 = classifyMedicalDocument(labText);
assert(res3.type === 'lab_report', `Type is lab_report (got: ${res3.type})`);
assert(res3.confidence >= 80, `Lab classification confidence is >= 80% (got: ${res3.confidence}%)`);
const parsed3 = parseSpecialtyDocument(labText, res3);
assert(parsed3.labMetrics.length >= 4, `Extracted ${parsed3.labMetrics.length} lab metrics`);

const fbs = parsed3.labMetrics.find(m => m.name.toLowerCase().includes('sugar') || m.name.toLowerCase().includes('glucose'));
assert(Boolean(fbs), 'Fasting sugar/glucose metric extracted');
assert(fbs?.value === '112', `FBS value is 112 (got: ${fbs?.value})`);
assert(fbs?.unit === 'mg/dL', `FBS unit is mg/dL (got: ${fbs?.unit})`);
assert(parsed3.labMetrics.some(m => m.name.toLowerCase().includes('cholesterol')), 'Total cholesterol metric extracted');
assert(parsed3.labMetrics.some(m => m.name.toLowerCase().includes('creatinine')), 'Serum creatinine metric extracted');
assert(parsed3.labMetrics.some(m => m.name.toLowerCase().includes('hemoglobin')), 'Hemoglobin metric extracted');

// ==========================================
// SCENARIO 4: Urine Routine Examination
// ==========================================
console.log('\n--- Scenario 4: Urine Routine Examination ---');
const urineText = `
PATHCARE LABS
Urine Routine Examination (Urinalysis)
Patient: Sunita Devi | Date: 05/10/2026
Color: Pale Yellow
Specific Gravity: 1.018 (1.005 - 1.030)
pH: 6.0 (4.5 - 8.0)
Protein / Albumin: Nil
Glucose / Sugar: Nil
Pus Cells: 2-3 /HPF
Epithelial Cells: 1-2 /HPF
`;

const res4 = classifyMedicalDocument(urineText);
assert(res4.type === 'urine_test', `Type is urine_test (got: ${res4.type})`);
assert(res4.confidence >= 70, `Urinalysis confidence is valid (got: ${res4.confidence}%)`);
const parsed4 = parseSpecialtyDocument(urineText, res4);
assert(parsed4.labMetrics.length >= 2, `Extracted ${parsed4.labMetrics.length} urine parameters`);
assert(parsed4.labMetrics.some(m => m.name.toLowerCase().includes('pus')), 'Pus cells parameter extracted');

// ==========================================
// SCENARIO 5: 12-Lead Electrocardiogram (ECG)
// ==========================================
console.log('\n--- Scenario 5: 12-Lead Electrocardiogram (ECG) ---');
const ecgText = `
CARDIOLOGY CLINIC
12-Lead Electrocardiogram (ECG)
Ventricular Rate: 74 bpm
PR Interval: 160 ms
QRS Duration: 88 ms
QT/QTc: 380/410 ms
P-R-T Axes: 45 60 40
Normal Sinus Rhythm. No ST-T segment elevation or depression.
`;

const res5 = classifyMedicalDocument(ecgText);
assert(res5.type === 'ecg_report', `Type is ecg_report (got: ${res5.type})`);
const parsed5 = parseSpecialtyDocument(ecgText, res5);
assert(Boolean(parsed5.ecgData), 'ecgData is populated');
assert(parsed5.ecgData?.heartRate === '74' || parsed5.ecgData?.ventricularRate?.includes('74') || false, `Heart rate is 74 (got: ${parsed5.ecgData?.ventricularRate})`);
assert(parsed5.ecgData?.rhythm?.toLowerCase().includes('sinus rhythm') || false, `Rhythm detected (got: ${parsed5.ecgData?.rhythm})`);
assert(Boolean(parsed5.ecgData?.prInterval), `PR interval extracted (got: ${parsed5.ecgData?.prInterval})`);
assert(Boolean(parsed5.ecgData?.qrsDuration), `QRS duration extracted (got: ${parsed5.ecgData?.qrsDuration})`);

// ==========================================
// SCENARIO 6: Radiology / Chest X-Ray
// ==========================================
console.log('\n--- Scenario 6: Radiology / Chest X-Ray ---');
const xRayText = `
DEPARTMENT OF RADIODIAGNOSIS
Chest X-Ray PA View
Clinical Indication: Chronic cough, rule out consolidation.
Technique: Standard PA erect view.
Findings: Lung fields appear clear. Normal bronchovascular markings. Cardiothoracic ratio is normal. Both costophrenic angles are clear. Diaphragmatic domes are normal.
Impression: Normal chest radiograph. No focal pulmonary consolidation or active infiltration.
`;

const res6 = classifyMedicalDocument(xRayText);
assert(res6.type === 'radiology_report', `Type is radiology_report (got: ${res6.type})`);
const parsed6 = parseSpecialtyDocument(xRayText, res6);
assert(Boolean(parsed6.radiologyData), 'radiologyData is populated');
assert(parsed6.radiologyData?.impression?.includes('Normal chest radiograph') || false, 'Impression extracted');

// ==========================================
// SCENARIO 7: Hospital Discharge Summary
// ==========================================
console.log('\n--- Scenario 7: Hospital Discharge Summary ---');
const dischargeText = `
APOLLO MULTISPECIALTY HOSPITAL
Inpatient Discharge Summary
Patient: Rohan Mehra | Admission Date: 28/09/2026 | Discharge Date: 02/10/2026
Diagnosis at Discharge: Acute Gastroenteritis with mild dehydration (Resolved).
Condition at Discharge: Hemodynamically stable, afebrile, tolerating oral diet.
Discharge Medications:
1. ORS sachets as required
2. Probiotic capsules once daily for 5 days
Advice: Adequate hydration, follow up in OPD if fever recurs.
`;

const res7 = classifyMedicalDocument(dischargeText);
assert(res7.type === 'discharge_summary', `Type is discharge_summary (got: ${res7.type})`);
const parsed7 = parseSpecialtyDocument(dischargeText, res7);
assert(Boolean(parsed7.dischargeData), 'dischargeData is populated');
assert(parsed7.dischargeData?.dischargeDiagnosis?.includes('Gastroenteritis') || false, 'Diagnosis extracted');

// ==========================================
// SCENARIO 8: Unsupported / Non-Medical File
// ==========================================
console.log('\n--- Scenario 8: Unsupported / Non-Medical File ---');
const randomText = `
INVOICE #9812
Acme Corporation
Item: Office desk chair, quantity: 2, price: $150
Payment terms: Net 30 days.
Thank you for your business!
`;

const res8 = classifyMedicalDocument(randomText);
assert(res8.type === 'unsupported', `Type is unsupported (got: ${res8.type})`);
assert(res8.confidence <= 30, `Confidence is low for non-medical file (got: ${res8.confidence}%)`);
const parsed8 = parseSpecialtyDocument(randomText, res8);
assert((parsed8.labMetrics?.length || 0) === 0 && !parsed8.eyeData && !parsed8.prescriptionData, 'No spurious metrics assigned for unsupported file');

// ==========================================
// SCENARIO 9: Grounded Facts Payload
// ==========================================
console.log('\n--- Scenario 9: Grounded Facts Payload Generation ---');
const factsPayload = extractFactualBulletPoints(parsed1);
assert(
  factsPayload.some(f => f.includes('Doctor:')) && factsPayload.some(f => f.includes('Mild headache')),
  'Facts payload strictly contains grounded doctor and complaint items'
);

// ==========================================
// SCENARIO 10: FHIR R4 / ABDM Document Bundle
// ==========================================
console.log('\n--- Scenario 10: FHIR R4 / ABDM Document Bundle ---');
const mockReport: MedicalReport = {
  id: 'rep-test-fhir',
  title: 'Diagnostic Blood Panel',
  category: 'blood',
  date: '2026-10-12',
  formattedDate: '12 Oct 2026',
  fileName: 'test-lab.pdf',
  labName: 'Metropolis Diagnostics',
  patientName: 'Arjun Sharma',
  patientAge: 42,
  patientGender: 'Male',
  confidence: 98,
  isVerified: true,
  isDemo: false,
  overallStatus: 'normal',
  summary: 'Routine health panel',
  keyFindings: [],
  nextSteps: [],
  questionsForDoctor: [],
  metrics: [
    {
      id: 'm1',
      name: 'Fasting Blood Sugar',
      value: 112,
      unit: 'mg/dL',
      referenceRange: '70 - 99',
      status: 'high',
      verified: true,
    },
  ],
};

const fhirBundle = convertReportToFhirR4(mockReport, {
  id: 'user-arjun',
  name: 'Arjun Sharma',
  age: 42,
  gender: 'Male',
  bloodGroup: 'B+',
  emergencyContact: '+91 98765 43210',
  allergies: 'None',
  chronicConditions: 'None',
});

assert(
  fhirBundle.resourceType === 'Bundle' &&
  fhirBundle.entry.some(e => e.resource.resourceType === 'Patient') &&
  fhirBundle.entry.some(e => e.resource.resourceType === 'Observation') &&
  fhirBundle.entry.some(e => e.resource.resourceType === 'DiagnosticReport'),
  'FHIR Bundle generated with valid Patient, Observation, and DiagnosticReport entries'
);

console.log('\n========================================');
if (allPassed && testCount === TOTAL_TESTS) {
  console.log(`🎉 ALL ${TOTAL_TESTS} TESTS ACROSS 10 SCENARIOS PASSED WITH FLYING COLORS!`);
} else {
  console.error(`❌ SOME TESTS FAILED OR COUNT MISMATCH (ran ${testCount}/${TOTAL_TESTS}).`);
  process.exit(1);
}
