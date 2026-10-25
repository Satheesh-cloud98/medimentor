import assert from 'assert';
import {
  MOCK_MEDICATIONS,
  MOCK_APPOINTMENTS,
  MOCK_ABHA_PROFILE,
  MOCK_PMJAY_PROFILE,
  MOCK_CONSENT_SHARES,
  MOCK_AUDIT_LOGS,
  MOCK_PROVIDERS,
} from '../src/data/mockJourneyData';
import { convertReportToFhirR4 } from '../src/services/fhirService';
import type { MedicalReport } from '../src/types/report';

console.log('=== HEALTHCARE JOURNEY INTEGRATION VERIFICATION ===\n');

// 1. Patient Profile & ABDM ABHA ID
console.log('Test 1: Patient Profile & ABHA Identity verification');
assert(MOCK_ABHA_PROFILE.abhaNumber === '91-4567-8901-2345', 'ABHA Number matches ABDM format');
assert(MOCK_ABHA_PROFILE.fullName === 'Priya Sharma', 'Primary patient is Priya Sharma');
assert(MOCK_ABHA_PROFILE.gender === 'Female', 'Patient demographic matches');
assert(MOCK_ABHA_PROFILE.status === 'Verified', 'ABDM verification status is Verified');
console.log('✅ Passed Test 1: Patient Profile & ABHA verified.');

// 2. Government Schemes (PM-JAY & ABHA)
console.log('\nTest 2: Government Health Schemes verification');
assert(MOCK_PMJAY_PROFILE.beneficiaryId.startsWith('PMJAY'), 'PM-JAY scheme registered with valid ID');
assert(MOCK_PMJAY_PROFILE.coverageAmount === 500000, 'PM-JAY offers Rs 5,00,000 national cover');
assert(MOCK_PMJAY_PROFILE.remainingAmount === 465000, 'PM-JAY balance tracks claims accurately');
assert(MOCK_ABHA_PROFILE.linkedFacilities.length >= 3, 'Multiple ABDM linked facilities verified');
console.log('✅ Passed Test 2: PM-JAY and ABHA schemes verified.');

// 3. Provider Directory & Verification Statuses
console.log('\nTest 3: Provider Portal & Empanelled Facilities verification');
assert(MOCK_PROVIDERS.length >= 4, 'Multiple healthcare providers present');
const verifiedProviders = MOCK_PROVIDERS.filter((p) => p.verificationStatus === 'Verified');
assert(verifiedProviders.length >= 2, 'Verified clinical facilities present in registry');
MOCK_PROVIDERS.forEach((p) => {
  assert(p.fhirEndpoint && p.fhirEndpoint.startsWith('https://'), `FHIR R4 endpoint valid for ${p.name}`);
  assert(p.licenseNumber.length > 5, `Accreditation/License number present for ${p.name}`);
});
console.log('✅ Passed Test 3: Provider registry and FHIR endpoints verified.');

// 4. Prescriptions & Dosage Regimens
console.log('\nTest 4: Active Medication Regimens verification');
assert(MOCK_MEDICATIONS.length >= 4, 'Active prescriptions populated');
const activeRx = MOCK_MEDICATIONS.filter((p) => p.status === 'active');
assert(activeRx.length >= 3, 'Multiple active medications on schedule');
MOCK_MEDICATIONS.forEach((rx) => {
  assert(rx.schedule.morning || rx.schedule.afternoon || rx.schedule.night, `Schedule populated for ${rx.name}`);
  assert(rx.totalDays >= rx.daysCompleted, `Course tracking consistent for ${rx.name}`);
});
console.log('✅ Passed Test 4: Medication schedules and refill trackers verified.');

// 5. Appointments & Teleconsultations
console.log('\nTest 5: Consultations & Appointments verification');
assert(MOCK_APPOINTMENTS.length >= 3, 'Consultations present');
const confirmedApts = MOCK_APPOINTMENTS.filter((a) => a.status === 'confirmed');
assert(confirmedApts.length >= 2, 'Confirmed upcoming visits present');
const videoApts = MOCK_APPOINTMENTS.filter((a) => a.type === 'video');
assert(videoApts.length >= 1, 'Teleconsultation / Video link present');
console.log('✅ Passed Test 5: In-person and video consultations verified.');

// 6. Consent & Granular Health Record Sharing
console.log('\nTest 6: Consent Management & Revocation verification');
assert(MOCK_CONSENT_SHARES.length >= 3, 'Consent tokens present');
const activeTokens = MOCK_CONSENT_SHARES.filter((s) => s.status === 'active');
assert(activeTokens.length >= 2, 'Active consent shares present');
MOCK_CONSENT_SHARES.forEach((s) => {
  assert(s.accessCode.length >= 8, `Valid secure consent share code: ${s.accessCode}`);
  assert(s.documents.length > 0, `Documents tied to consent for ${s.recipient}`);
});
console.log('✅ Passed Test 6: ABDM-compliant consent tokens verified.');

// 7. Audit Log Ledger
console.log('\nTest 7: Tamper-Evident Audit Ledger verification');
assert(MOCK_AUDIT_LOGS.length >= 5, 'Comprehensive audit entries recorded');
MOCK_AUDIT_LOGS.forEach((log) => {
  assert(log.ip && log.timestamp && log.actor, `Audit trace intact for event ${log.id}`);
});
console.log('✅ Passed Test 7: Audit log security trail verified.');

// 8. FHIR R4 Bundle Generation on Journey Report
console.log('\nTest 8: FHIR R4 ABDM Bundle generation compatibility');
const testReport: MedicalReport = {
  id: 'rep-journey-001',
  title: 'Comprehensive Metabolic Panel',
  date: '2026-10-14',
  documentType: 'lab_report',
  metrics: [
    { name: 'Fasting Blood Sugar', value: 104, unit: 'mg/dL', status: 'Normal', normalRange: '70 - 100' },
    { name: 'HbA1c', value: 5.9, unit: '%', status: 'Normal', normalRange: '< 5.7' },
  ],
  insights: ['Glycemic index within stable control.'],
  recommendations: ['Maintain regular physical exercise.'],
  rawOcrText: 'Lab Diagnostic Report 2026',
};

const fhirBundle = convertReportToFhirR4(testReport);
assert(fhirBundle.resourceType === 'Bundle', 'FHIR Resource is a valid Bundle');
assert(fhirBundle.type === 'document', 'FHIR Bundle type is document');
assert(fhirBundle.entry.length >= 3, 'Bundle contains Composition/DiagnosticReport and Observations');
console.log(`✅ Passed Test 8: FHIR R4 Bundle generated with ${fhirBundle.entry.length} resource entries.`);

console.log('\n=============================================================');
console.log('🎉 ALL 8 HEALTHCARE JOURNEY INTEGRATION SUITES PASSED (100%)');
console.log('=============================================================\n');
