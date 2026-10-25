import { deduplicateReports } from '../src/context/ReportsContext';
import { MOCK_REPORTS } from '../src/data/mockReports';
import type { MedicalReport } from '../src/types/report';

console.log('=== VERIFYING DEDUPLICATION ENGINE ===\n');

// Test 1: Deduplication of mock reports (no duplicates, length should remain 4)
const initial = deduplicateReports(MOCK_REPORTS);
console.log(`[Test 1] Initial mock reports count: ${initial.length} (Expected: 4)`);
if (initial.length !== 4) {
  console.error('❌ Failed Test 1: mock reports count altered');
  process.exit(1);
}
console.log('✅ Passed Test 1: Baseline mock reports intact.');

// Test 2: Simulating 3 uploads of sample_medical_prescription_demo.pdf with different timestamps
const report1: MedicalReport = {
  id: 'rep-1728750000000',
  title: 'Clinical Medication Prescription',
  category: 'prescription',
  documentType: 'prescription',
  date: '2026-10-12',
  formattedDate: '12 Oct 2026',
  labName: 'Polyclinic',
  patientName: 'Demo Patient',
  patientAge: 42,
  patientGender: 'Male',
  fileName: 'sample_medical_prescription_demo.pdf',
  fileSize: '2.4 KB',
  metrics: [],
  isVerified: true,
  isDemo: false,
  confidence: 98,
  overallStatus: 'normal',
  summary: 'Prescription 1',
  keyFindings: [],
  nextSteps: [],
  questionsForDoctor: [],
};

const report2: MedicalReport = {
  ...report1,
  id: 'rep-1728750010000',
  summary: 'Prescription 2 (Latest)',
};

const report3: MedicalReport = {
  ...report1,
  id: 'rep-1728749900000',
  summary: 'Prescription 3 (Older)',
};

const duplicatedList = [report2, report1, report3, ...MOCK_REPORTS];
console.log(`\n[Test 2] List with 3 copies of sample_medical_prescription_demo.pdf + 4 mocks = ${duplicatedList.length} items`);

const cleanedList = deduplicateReports(duplicatedList);
console.log(`Cleaned list count: ${cleanedList.length} items`);

const prescriptionOccurrences = cleanedList.filter(
  (r) => r.fileName === 'sample_medical_prescription_demo.pdf'
);
console.log(`Prescription occurrences after deduplication: ${prescriptionOccurrences.length} (Expected: 1)`);

if (prescriptionOccurrences.length !== 1) {
  console.error(`❌ Failed Test 2: Found ${prescriptionOccurrences.length} occurrences instead of 1`);
  process.exit(1);
}

if (prescriptionOccurrences[0].summary !== 'Prescription 2 (Latest)') {
  console.error('❌ Failed Test 2: Did not preserve the most recent upload');
  process.exit(1);
}

console.log('✅ Passed Test 2: Duplicates pruned, most recent record preserved.');

// Test 3: Total reports count in cleaned list should be exactly 5 (1 prescription + 4 mocks)
if (cleanedList.length !== 5) {
  console.error(`❌ Failed Test 3: Total count is ${cleanedList.length}, expected 5`);
  process.exit(1);
}
console.log('✅ Passed Test 3: Total timeline count is 5 as expected.');

console.log('\n🎉 ALL DEDUPLICATION TESTS PASSED SUCCESSFULLY!');
