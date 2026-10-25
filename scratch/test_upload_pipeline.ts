import { classifyMedicalDocument } from '../src/services/classifierService';
import { parseSpecialtyDocument } from '../src/services/parserService';
import type { DocumentType } from '../src/types/document';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    testsPassed++;
    console.log(`✅ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
  } else {
    testsFailed++;
    console.error(`❌ [FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
  }
}

async function runUploadPipelineTests() {
  console.log('================================================================');
  console.log('       MEDIMENTOR AI — DOCUMENT UPLOAD & PARSER TEST SUITE       ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Prescription Classification & Precedence Guard
  // -------------------------------------------------------------
  console.log('--- TEST 1: Classification & Prescription Precedence ---');

  const standardPrescription = `CITY HEALTH CLINIC & OUTPATIENT CARE
Dr. Ramesh Gupta, MBBS, MD (Internal Medicine)
Reg. No: MCI-49201
Date: 12-Oct-2026
Patient: Arjun Sharma    Age: 42    Gender: Male

Diagnosis / Complaints: Acute upper respiratory tract infection with mild fever.

Rx (Prescription):
1. Tab. Paracetamol 650mg — 1-0-1 (Twice daily after food) for 3 days
2. Cap. Amoxicillin 500mg — 1-0-1 (Twice daily after food) for 5 days
3. Tab. Cetirizine 10mg — 0-0-1 (Once at bedtime) for 5 days

Doctor Advice / Instructions:
Drink plenty of warm fluids, rest well, and report back if fever exceeds 101°F.
Signature: Dr. R. Gupta`;

  const classRes1 = classifyMedicalDocument(standardPrescription);
  assert(classRes1.type === 'prescription', 'Standard prescription correctly classified as prescription', `Classified as: ${classRes1.type}`);
  assert(classRes1.confidence >= 70, 'Prescription classification confidence is high', `Confidence: ${classRes1.confidence}%`);

  // Tricky prescription that recommends lab tests in advice
  const prescriptionWithLabAdvice = `APOLLO HOSPITALS OUTPATIENT DEPARTMENT
Dr. Arvind Verma, MD (General Medicine)
Date: 10-Oct-2026
Patient: Arjun Sharma, Age 42, Male
Diagnosis: Type 2 Diabetes follow-up & hypertension

Rx:
1. Tab. Metformin 500mg 1-0-1 after meals
2. Tab. Telmisartan 40mg 1-0-0 morning

Advice:
Please get Fasting Blood Sugar, HbA1c, and Serum Creatinine blood test done before next visit.
Review after 2 weeks with CBC and lipid profile reports.`;

  const classRes2 = classifyMedicalDocument(prescriptionWithLabAdvice);
  assert(
    classRes2.type === 'prescription',
    'Prescription with recommended lab advice is NOT misclassified as lab report',
    `Classified as: ${classRes2.type} (Expected: prescription)`
  );

  // -------------------------------------------------------------
  // TEST 2: Medication Extraction & Dosage Isolation
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Medication Extraction & Zero Fabrication ---');

  const parsedPrescription = parseSpecialtyDocument(standardPrescription, classRes1);
  assert(!!parsedPrescription.prescriptionData, 'Prescription data block generated');

  const meds = parsedPrescription.prescriptionData?.medications || [];
  assert(meds.length >= 3, 'All 3 prescribed medications detected', `Count: ${meds.length}`);

  const paracetamol = meds.find((m) => m.name.toLowerCase().includes('paracetamol'));
  assert(!!paracetamol, 'Paracetamol extracted');
  if (paracetamol) {
    assert(paracetamol.dosage.includes('650'), 'Paracetamol dosage contains 650mg', `Dosage: ${paracetamol.dosage}`);
    assert(!paracetamol.name.includes('650mg'), 'Medicine name clean (dosage stripped from name)', `Name: ${paracetamol.name}`);
  }

  const amoxicillin = meds.find((m) => m.name.toLowerCase().includes('amoxicillin'));
  assert(!!amoxicillin, 'Amoxicillin extracted');
  if (amoxicillin) {
    assert(amoxicillin.dosage.includes('500'), 'Amoxicillin dosage contains 500mg', `Dosage: ${amoxicillin.dosage}`);
  }

  const cetirizine = meds.find((m) => m.name.toLowerCase().includes('cetirizine'));
  assert(!!cetirizine, 'Cetirizine extracted');

  assert(
    parsedPrescription.prescriptionData?.doctorName?.includes('Ramesh Gupta') || false,
    'Doctor name correctly parsed',
    `Doctor: ${parsedPrescription.prescriptionData?.doctorName}`
  );

  // -------------------------------------------------------------
  // TEST 3: Serial-Numbered Lab Report Metric Extraction
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Laboratory Metric Extraction (Fix Serial Numbers) ---');

  const serialNumberedCbc = `DIAGNOSTIC PATHOLOGY LABORATORY
COMPLETE BLOOD COUNT REPORT
Patient: Arjun Sharma   Age: 42   Gender: Male
Date: 12-Oct-2026

TEST PARAMETERS:
1. Hemoglobin: 14.4 g/dL (Reference Range: 13.0 - 17.0)
2. Total Leukocyte Count: 6900 cells/mcL (Reference Range: 4000 - 11000)
3. Platelet Count: 255000 /mcL (Reference Range: 150000 - 450000)
4. Packed Cell Volume (PCV): 43.5 % (Reference Range: 40.0 - 50.0)
5. Mean Corpuscular Volume (MCV): 86.2 fL (Reference Range: 80.0 - 100.0)`;

  const classResCbc = classifyMedicalDocument(serialNumberedCbc);
  assert(classResCbc.type === 'lab_report', 'CBC report classified as lab_report', `Type: ${classResCbc.type}`);

  const parsedCbc = parseSpecialtyDocument(serialNumberedCbc, classResCbc);
  const metrics = parsedCbc.labMetrics || [];
  assert(metrics.length >= 3, 'CBC metrics extracted', `Count: ${metrics.length}`);

  const hb = metrics.find((m) => m.name.toLowerCase().includes('hemoglobin'));
  assert(!!hb, 'Hemoglobin metric found');
  if (hb) {
    assert(
      hb.value === '14.4',
      'CRITICAL BUG FIX: Hemoglobin value is 14.4 (NOT serial number 1)',
      `Extracted: ${hb.value}`
    );
  }

  const wbc = metrics.find((m) => m.name.toLowerCase().includes('leukocyte') || m.name.toLowerCase().includes('wbc'));
  assert(!!wbc, 'WBC / Leukocyte count found');
  if (wbc) {
    assert(
      wbc.value === '6900',
      'CRITICAL BUG FIX: Leukocyte value is 6900 (NOT serial number 2)',
      `Extracted: ${wbc.value}`
    );
  }

  // -------------------------------------------------------------
  // TEST 4: Qualitative Urinalysis Extraction
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Qualitative Urinalysis Parameters ---');

  const urineReport = `METROPOLIS HEALTHCARE LABS
URINE ROUTINE EXAMINATION
Patient: Arjun Sharma   Age: 42   Gender: M
Date: 12-Oct-2026

Urine Glucose: Negative (Ref: Negative)
Urine Protein: Trace (Ref: Negative)
Urine Ketones: Negative (Ref: Negative)
Reaction (pH): 6.0 (Ref: 4.5 - 8.0)
Specific Gravity: 1.018 (Ref: 1.005 - 1.030)`;

  const classResUrine = classifyMedicalDocument(urineReport);
  assert(classResUrine.type === 'urine_test', 'Urinalysis classified as urine_test', `Type: ${classResUrine.type}`);

  const parsedUrine = parseSpecialtyDocument(urineReport, classResUrine);
  const urineMetrics = parsedUrine.labMetrics || [];

  const glucose = urineMetrics.find((m) => m.name.toLowerCase().includes('glucose'));
  assert(!!glucose, 'Urine Glucose found');
  if (glucose) {
    assert(
      glucose.value.toLowerCase() === 'negative',
      'Qualitative Urine Glucose correctly parsed as "Negative"',
      `Extracted: ${glucose.value}`
    );
  }

  const protein = urineMetrics.find((m) => m.name.toLowerCase().includes('protein'));
  assert(!!protein, 'Urine Protein found');
  if (protein) {
    assert(
      protein.value.toLowerCase() === 'trace',
      'Qualitative Urine Protein correctly parsed as "Trace"',
      `Extracted: ${protein.value}`
    );
  }

  // -------------------------------------------------------------
  // TEST 5: Eye Prescription Refraction Values
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Eye Refraction Prescription ---');

  const eyeText = `VISION CARE EYE CLINIC
REFRACTION SPECTACLE PRESCRIPTION:
Patient: Arjun Sharma    Age: 42
OD (Right Eye): SPH -2.25   CYL -0.75   AXIS 180°
OS (Left Eye):  SPH -1.75   CYL -0.50   AXIS 90°
P.D.: 63 mm`;

  const classResEye = classifyMedicalDocument(eyeText);
  assert(classResEye.type === 'eye_prescription', 'Eye prescription classified correctly');

  const parsedEye = parseSpecialtyDocument(eyeText, classResEye);
  assert(!!parsedEye.eyeData, 'Eye refraction data parsed');
  if (parsedEye.eyeData) {
    assert(parsedEye.eyeData.od.sph === '-2.25', 'Right eye SPH -2.25', `SPH: ${parsedEye.eyeData.od.sph}`);
    assert(parsedEye.eyeData.os.sph === '-1.75', 'Left eye SPH -1.75', `SPH: ${parsedEye.eyeData.os.sph}`);
    assert(parsedEye.eyeData.pd === '63', 'Pupillary distance 63 mm', `PD: ${parsedEye.eyeData.pd}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Unrelated Document Rejection (Zero Fabrication)
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Unrelated Document Guard ---');

  const groceryReceipt = `SUPERMART RETAIL OUTLET #441
Transaction: 994819
Apples 1kg: 140.00
Milk 2L: 120.00
Total: 260.00`;

  const classResUnsup = classifyMedicalDocument(groceryReceipt);
  assert(classResUnsup.type === 'unsupported', 'Grocery receipt classified as unsupported (No hallucinated medical record)');

  console.log('\n================================================================');
  console.log(`EXTRACTION TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runUploadPipelineTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
