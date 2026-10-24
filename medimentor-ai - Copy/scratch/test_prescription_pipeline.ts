import { parsePrescription, parseSpecialtyDocument } from '../src/services/parserService';
import { extractFactualBulletPoints } from '../src/services/aiService';
import { classifyMedicalDocument } from '../src/services/classifierService';
import { PRESCRIPTION_FALLBACKS } from '../src/types/document';

console.log('=== TEST: PRESCRIPTION ANALYSIS, FIELD SEPARATION & CLINICAL EXPLANATIONS ===\n');

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, msg: string) {
  totalCount++;
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  passedCount++;
  console.log(`✅ [Test ${passedCount}] PASSED: ${msg}`);
}

// =========================================================================
// TEST 1: Full Multi-Drug Prescription with Patient & Provider Metadata
// =========================================================================
console.log('--- Test Suite 1: Granular Field Separation & Extraction ---');

const complexPrescription = `
APOLLO HEALTHCARE CLINIC & MULTISPECIALTY HOSPITAL
124 MG Road, Indiranagar, Bangalore - 560038
Phone: +91 80 2525 8989 | Email: contact@apollo-care.org
Dr. Rajesh Sharma, MBBS, MD (Internal Medicine)
Reg No: KMC-78921

PATIENT RECORD:
Patient Name: Ananya Roy
Age: 38 yrs | Gender: Female | UHID: APL-908231
Date: 24/10/2026
Diagnosis / Chief Complaint: Acute upper respiratory tract infection with gastritis

PRESCRIPTION / Rx:
1. Tab Paracetamol 650mg 1-0-1 after food for 5 days with warm water
2. Cap Amoxicillin 500 mg TDS after food x 7 days
3. Cap Pantoprazole 40mg OD before breakfast for 14 days
4. Syrup Benadryl 10ml HS at bedtime for 3 days

Advice & Instructions:
Drink plenty of warm fluids. Avoid spicy, oily food. Complete the antibiotic course.
Follow-up in 7 days if symptoms persist.
`;

const classification = classifyMedicalDocument(complexPrescription);
assert(classification.type === 'prescription', `Document classified as prescription (got: ${classification.type})`);

const parsed = parsePrescription(complexPrescription);

// 1. Patient Metadata
assert(parsed.patientName === 'Ananya Roy', `Patient Name strictly isolated: "${parsed.patientName}"`);
assert(parsed.patientAge === '38', `Age extracted: "${parsed.patientAge}"`);
assert(parsed.patientGender === 'Female', `Gender extracted: "${parsed.patientGender}"`);
assert(parsed.patientUhid === 'APL-908231', `Patient UHID extracted: "${parsed.patientUhid}"`);
assert(parsed.prescriptionDate === '24/10/2026', `Date extracted: "${parsed.prescriptionDate}"`);

// 2. Doctor & Facility Metadata
assert(parsed.doctorName?.includes('Rajesh Sharma') || false, `Doctor Name extracted: "${parsed.doctorName}"`);
assert(parsed.doctorQualification?.includes('MBBS') || false, `Doctor Qualification extracted: "${parsed.doctorQualification}"`);
assert(parsed.doctorQualification?.includes('78921') || false, `Registration number extracted in qualification: "${parsed.doctorQualification}"`);
assert(parsed.hospitalOrClinic?.includes('APOLLO') || false, `Hospital Name extracted: "${parsed.hospitalOrClinic}"`);
assert(parsed.hospitalAddressContact?.includes('MG Road') || false, `Hospital Address extracted: "${parsed.hospitalAddressContact}"`);
assert(parsed.hospitalAddressContact?.includes('Phone') || false, `Hospital Phone extracted: "${parsed.hospitalAddressContact}"`);

// 3. Clinical Notes
assert(parsed.complaintOrDiagnosis?.includes('respiratory') || false, `Diagnosis notes extracted: "${parsed.complaintOrDiagnosis}"`);
assert(parsed.adviceOrInstructions?.includes('warm fluids') || false, `Advice extracted: "${parsed.adviceOrInstructions}"`);

// 4. Granular Medicine Field Separation
assert(parsed.medications.length === 4, `All 4 medications extracted separately (got: ${parsed.medications.length})`);

const med1 = parsed.medications[0];
console.log('\nMedication 1 separated fields:', med1);
assert(med1.name === 'Paracetamol', `Med 1 Name separated cleanly: "${med1.name}"`);
assert(med1.dosage === '650mg', `Med 1 Dosage separated: "${med1.dosage}"`);
assert(med1.dosageForm === 'Tablet', `Med 1 Form separated: "${med1.dosageForm}"`);
assert(med1.frequency?.includes('1-0-1') || false, `Med 1 Frequency separated: "${med1.frequency}"`);
assert(med1.timing === 'Morning & Night', `Med 1 Timing separated: "${med1.timing}"`);
assert(med1.foodRelation === 'After food', `Med 1 Food Relation separated: "${med1.foodRelation}"`);
assert(med1.duration === '5 days', `Med 1 Duration separated: "${med1.duration}"`);
assert(med1.instructions?.includes('warm water') || false, `Med 1 Instructions separated: "${med1.instructions}"`);

const med2 = parsed.medications[1];
console.log('\nMedication 2 separated fields:', med2);
assert(med2.name === 'Amoxicillin', `Med 2 Name separated cleanly: "${med2.name}"`);
assert(med2.dosage === '500 mg', `Med 2 Dosage separated: "${med2.dosage}"`);
assert(med2.dosageForm === 'Capsule', `Med 2 Form separated: "${med2.dosageForm}"`);
assert(med2.frequency?.includes('TDS') || false, `Med 2 Frequency separated: "${med2.frequency}"`);
assert(med2.timing === 'Morning, Noon & Night', `Med 2 Timing separated: "${med2.timing}"`);
assert(med2.foodRelation === 'After food', `Med 2 Food Relation separated: "${med2.foodRelation}"`);
assert(med2.duration === '7 days', `Med 2 Duration separated: "${med2.duration}"`);

const med3 = parsed.medications[2];
console.log('\nMedication 3 separated fields:', med3);
assert(med3.name === 'Pantoprazole', `Med 3 Name separated cleanly: "${med3.name}"`);
assert(med3.dosage === '40mg', `Med 3 Dosage separated: "${med3.dosage}"`);
assert(med3.dosageForm === 'Capsule', `Med 3 Form separated: "${med3.dosageForm}"`);
assert(med3.frequency?.includes('OD') || false, `Med 3 Frequency separated: "${med3.frequency}"`);
assert(med3.timing === 'Morning', `Med 3 Timing separated: "${med3.timing}"`);
assert(med3.foodRelation === 'Before food', `Med 3 Food Relation separated: "${med3.foodRelation}"`);
assert(med3.duration === '14 days', `Med 3 Duration separated: "${med3.duration}"`);

const med4 = parsed.medications[3];
console.log('\nMedication 4 separated fields:', med4);
assert(med4.name === 'Benadryl', `Med 4 Name separated cleanly: "${med4.name}"`);
assert(med4.dosage === '10ml', `Med 4 Dosage separated: "${med4.dosage}"`);
assert(med4.dosageForm === 'Syrup', `Med 4 Form separated: "${med4.dosageForm}"`);
assert(med4.timing === 'Night / Bedtime', `Med 4 Timing separated: "${med4.timing}"`);
assert(med4.duration === '3 days', `Med 4 Duration separated: "${med4.duration}"`);

// 5. Grounded Doctor Questions Generation
assert(Boolean(parsed.doctorQuestions && parsed.doctorQuestions.length >= 4), `Grounded doctor questions generated (${parsed.doctorQuestions?.length} items)`);
console.log('\nGenerated Doctor Consultation Questions:');
parsed.doctorQuestions?.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

// =========================================================================
// TEST 2: Consultation Record with Missing / Unmentioned Fields (Fallbacks)
// =========================================================================
console.log('\n--- Test Suite 2: Fallback Messages for Unmentioned Fields ---');

const partialConsultation = `
Consultation Note:
Patient examined for mild knee strain.
Advised rest, hot compress, and elevation.
Medication: None prescribed.
`;

const partialParsed = parsePrescription(partialConsultation);

assert(partialParsed.patientName === undefined, 'Patient name is undefined when missing');
assert(partialParsed.patientAge === undefined, 'Age is undefined when missing');
assert(partialParsed.patientGender === undefined, 'Gender is undefined when missing');
assert(partialParsed.patientUhid === undefined, 'UHID is undefined when missing');
assert(partialParsed.doctorName === undefined, 'Doctor name is undefined when missing');
assert(partialParsed.doctorQualification === undefined, 'Qualification is undefined when missing');
assert(partialParsed.hospitalAddressContact === undefined, 'Address & contact is undefined when missing');
assert(partialParsed.medications.length === 0, 'Medications list is empty when none prescribed');

// Verify exact fallback texts match user specifications
assert(PRESCRIPTION_FALLBACKS.patientName === 'Your name is not mentioned clearly in this prescription.', 'Fallback matches: patientName');
assert(PRESCRIPTION_FALLBACKS.patientAge === 'Age is not mentioned in this prescription.', 'Fallback matches: patientAge');
assert(PRESCRIPTION_FALLBACKS.patientGender === 'Gender is not mentioned in this prescription.', 'Fallback matches: patientGender');
assert(PRESCRIPTION_FALLBACKS.patientUhid === 'Patient ID / UHID is not mentioned in this prescription.', 'Fallback matches: patientUhid');
assert(PRESCRIPTION_FALLBACKS.prescriptionDate === 'Prescription date is not mentioned in this prescription.', 'Fallback matches: prescriptionDate');
assert(PRESCRIPTION_FALLBACKS.doctorName === 'Doctor name is not mentioned in this prescription.', 'Fallback matches: doctorName');
assert(PRESCRIPTION_FALLBACKS.doctorQualification === 'Doctor qualification or registration number is not mentioned in this prescription.', 'Fallback matches: doctorQualification');
assert(PRESCRIPTION_FALLBACKS.hospitalOrClinic === 'Hospital or clinic name is not mentioned in this prescription.', 'Fallback matches: hospitalOrClinic');
assert(PRESCRIPTION_FALLBACKS.hospitalAddressContact === 'Hospital address and contact details are not mentioned in this prescription.', 'Fallback matches: hospitalAddressContact');

// Test Verified Facts extraction with fallbacks
const extractedDoc = parseSpecialtyDocument(partialConsultation, {
  type: 'prescription',
  confidence: 90,
  isAmbiguous: false,
  detectedKeywords: ['consultation'],
  reason: 'Prescription/consultation note',
});

const facts = extractFactualBulletPoints(extractedDoc);
console.log('\nVerified Facts for Partial Record:');
facts.forEach((f) => console.log(`  • ${f}`));

assert(facts.some((f) => f.includes(PRESCRIPTION_FALLBACKS.patientName)), 'Facts include patientName fallback');
assert(facts.some((f) => f.includes(PRESCRIPTION_FALLBACKS.patientAge)), 'Facts include patientAge fallback');
assert(facts.some((f) => f.includes(PRESCRIPTION_FALLBACKS.doctorName)), 'Facts include doctorName fallback');

console.log(`\n🎉 ALL ${passedCount} PRESCRIPTION PIPELINE TESTS PASSED 100%!`);
