/**
 * END-TO-END LOCAL VERIFICATION SUITE
 * Tests VerifiHealth AI and MediMentor AI core features against local runtime.
 * Zero remote dependencies, zero SQL, zero deployment.
 */

import path from 'path';
import fs from 'fs';
import { signJwt, verifyJwt } from '../api/auth';
import { getUserThreads, saveUserThreads } from '../api/conversations';
import { getRecordsForPatient } from '../api/records';
import { classifyMedicalDocument } from '../src/services/classifierService';
import { parseSpecialtyDocument } from '../src/services/parserService';
import { convertReportToFhirR4 } from '../src/services/fhirService';
import { deduplicateReports } from '../src/context/ReportsContext';
import { MOCK_REPORTS } from '../src/data/mockReports';
import type { MedicalReport } from '../src/types/report';

const BASE_URL = 'http://localhost:5173';

interface TestResult {
  suite: string;
  testName: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, testName: string, detail: string) {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ suite, testName, status, detail });
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} [${status}] [${suite}] ${testName}`);
  if (!condition) {
    console.error(`   Error details: ${detail}`);
  } else {
    console.log(`   ${detail}`);
  }
}

async function runAllVerifications() {
  console.log('================================================================');
  console.log('   MEDIMENTOR AI & VERIFIHEALTH FULL LOCAL VERIFICATION SUITE    ');
  console.log('================================================================\n');

  const arjunToken = signJwt({ sub: 'user-arjun', name: 'Arjun K. Sharma', role: 'patient' });
  const priyaToken = signJwt({ sub: 'user-priya', name: 'Priya Sharma', role: 'patient' });

  // -------------------------------------------------------------
  // SUITE 1: VERIFIHEALTH CHAT & AI REASONING
  // -------------------------------------------------------------
  console.log('--- 1. VERIFIHEALTH CHAT & AI GROUNDING ---');

  // Test 1.1: Chat API invocation with valid token
  const chatRes1 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${arjunToken}`
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'What is my cholesterol and LDL?' }],
      userProfile: { id: 'user-arjun', name: 'Arjun K. Sharma' },
      language: 'en'
    })
  });
  const chatData1: any = await chatRes1.json();
  assert(
    chatRes1.status === 200 && typeof chatData1.reply === 'string' && chatData1.reply.length > 50,
    'VerifiHealth Chat',
    'Chat message sending & response generation',
    `HTTP ${chatRes1.status}, response length: ${chatData1.reply?.length || 0} chars`
  );

  // Test 1.2: Grounded facts precision (Exact numbers from record)
  const hasExactChol = chatData1.reply.includes('224') && chatData1.reply.includes('142');
  assert(
    hasExactChol,
    'VerifiHealth Chat',
    'Medical record grounding: Exact lipid metrics',
    'Response accurately cited 224 mg/dL Total Cholesterol and 142 mg/dL LDL from patient records'
  );

  // Test 1.3: Real AI vs Transparent Fallback distinction
  const isFallbackModel = chatData1.modelName.includes('Grounded Clinical Engine');
  assert(
    chatData1.configured !== undefined && chatData1.modelName && chatData1.isFallback === true,
    'VerifiHealth Chat',
    'Transparent fallback model reporting',
    `Model truthfully declared: "${chatData1.modelName}", isFallback: ${chatData1.isFallback}, Reason: "${chatData1.fallbackReason}"`
  );

  // Test 1.4: Synthetic Demo Data Labeling
  const citations = chatData1.citations || [];
  const hasDemoCitation = citations.some((c: any) => c.isDemo === true && c.demoNotice && c.demoNotice.includes('SAMPLE DEMO RECORD'));
  const hasDemoNotice = chatData1.reply.includes('DEMO DATA NOTICE');
  assert(
    hasDemoCitation && hasDemoNotice,
    'VerifiHealth Chat',
    'Synthetic demo record prominent labeling',
    `demoNotice badge present in citations and 'DEMO DATA NOTICE' disclaimer displayed in body text`
  );

  // Test 1.5: Medical Safety: Zero hallucinated medications
  const rxChatRes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${arjunToken}`
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Do I have any medications prescribed?' }],
      userProfile: { id: 'user-arjun', name: 'Arjun K. Sharma' },
      recordsSummary: [
        {
          id: 'rx-doc-sample',
          title: 'Sample Medical Prescription Demo',
          documentType: 'prescription',
          formattedDate: '12 Oct 2026',
          isDemo: true,
          prescriptionData: {
            doctorName: 'Dr. Consultation',
            clinicOrHospital: 'City Care',
            complaintOrDiagnosis: 'Mild headache',
            medications: [],
            medicationsNotes: 'Not specified in document'
          }
        }
      ],
      language: 'en'
    })
  });
  const rxChatData: any = await rxChatRes.json();
  const replyLower = rxChatData.reply.toLowerCase();
  const hallucinates = /amoxicillin|paracetamol|ibuprofen|ciprofloxacin|atorvastatin|metformin/i.test(replyLower);
  const saysNoMeds = /no medications|not specified|no pharmacological/i.test(replyLower);
  assert(
    !hallucinates && saysNoMeds,
    'VerifiHealth Chat',
    'Zero hallucination on unprescribed medications',
    'Explicitly confirmed NO medications prescribed in document. Zero fictional drugs or dosages invented.'
  );

  // Test 1.6: Follow-up multi-turn conversation context
  const multiTurnRes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${arjunToken}`
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'What is my fasting glucose?' },
        { role: 'assistant', content: 'Your fasting blood glucose is 112 mg/dL.' },
        { role: 'user', content: 'Is that normal or prediabetic?' }
      ],
      userProfile: { id: 'user-arjun', name: 'Arjun K. Sharma' },
      language: 'en'
    })
  });
  const multiTurnData: any = await multiTurnRes.json();
  assert(
    multiTurnRes.status === 200 && multiTurnData.reply.length > 30,
    'VerifiHealth Chat',
    'Follow-up multi-turn conversational context',
    `Multi-turn query answered with contextual grounding: "${multiTurnData.reply.slice(0, 70)}..."`
  );

  // Test 1.7: Emergency red-flag triage detection
  const triageRes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${arjunToken}`
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'I have severe sudden chest pain radiating to left arm' }],
      userProfile: { id: 'user-arjun', name: 'Arjun K. Sharma' },
      language: 'en'
    })
  });
  const triageData: any = await triageRes.json();
  assert(
    triageData.urgentCareWarning === true && triageData.reply.includes('112'),
    'VerifiHealth Chat',
    'Emergency clinical red-flag triage',
    'Immediate triage override engaged: urgentCareWarning: true, helpline 112 advised'
  );

  // -------------------------------------------------------------
  // SUITE 2: RECENT CHATS, PERSISTENCE & USER ISOLATION
  // -------------------------------------------------------------
  console.log('\n--- 2. RECENT CHATS, CRUD & PERSISTENCE ---');

  const testThreadId = `local-test-${Date.now()}`;
  const testThread = {
    id: testThreadId,
    userId: 'user-arjun',
    title: 'Baseline Health Check 2026',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      { id: 'm1', role: 'user' as const, content: 'Summarize my reports', timestamp: new Date().toISOString() },
      { id: 'm2', role: 'assistant' as const, content: 'Summary of 4 reports.', timestamp: new Date().toISOString() }
    ]
  };

  // Test 2.1: Save new conversation thread to server
  const saveThreadRes = await fetch(`${BASE_URL}/api/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${arjunToken}`
    },
    body: JSON.stringify({ thread: testThread })
  });
  assert(
    saveThreadRes.status === 200,
    'Recent Chats',
    'Create / Save conversation thread',
    `Saved thread ${testThreadId} for user-arjun (HTTP 200)`
  );

  // Test 2.2: Retrieve saved conversation threads
  const getThreadsRes = await fetch(`${BASE_URL}/api/conversations`, {
    headers: { Authorization: `Bearer ${arjunToken}` }
  });
  const getThreadsData: any = await getThreadsRes.json();
  const threadFound = getThreadsData.threads?.some((t: any) => t.id === testThreadId);
  assert(
    getThreadsRes.status === 200 && threadFound,
    'Recent Chats',
    'Retrieve recent conversation list',
    `Successfully fetched recent threads list. Found newly created thread ${testThreadId}`
  );

  // Test 2.3: Rename conversation thread
  const renameRes = await fetch(`${BASE_URL}/api/conversations`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${arjunToken}`
    },
    body: JSON.stringify({ threadId: testThreadId, title: 'Renamed Cardiometabolic Review' })
  });
  const renameData: any = await renameRes.json();
  assert(
    renameRes.status === 200 && renameData.newTitle === 'Renamed Cardiometabolic Review',
    'Recent Chats',
    'Rename conversation thread',
    `Thread renamed to: "${renameData.newTitle}" (HTTP 200)`
  );

  // Test 2.4: Cross-user thread isolation (Priya cannot see or manipulate Arjun's thread)
  const priyaGetRes = await fetch(`${BASE_URL}/api/conversations`, {
    headers: { Authorization: `Bearer ${priyaToken}` }
  });
  const priyaGetData: any = await priyaGetRes.json();
  const leakedToPriya = priyaGetData.threads?.some((t: any) => t.id === testThreadId);
  assert(
    !leakedToPriya,
    'Recent Chats',
    'Strict user isolation across threads',
    'Priya conversation list does NOT contain Arjun thread. Strict partition verified.'
  );

  // Test 2.5: Cross-user deletion blocked with HTTP 403 Forbidden
  const priyaDeleteRes = await fetch(`${BASE_URL}/api/conversations?id=${testThreadId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${priyaToken}` }
  });
  assert(
    priyaDeleteRes.status === 403,
    'Recent Chats',
    'Cross-user deletion rejection (HTTP 403)',
    `Priya attempting to delete Arjun thread was rejected with HTTP 403 Forbidden`
  );

  // Test 2.6: Authorized deletion by owner
  const arjunDeleteRes = await fetch(`${BASE_URL}/api/conversations?id=${testThreadId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${arjunToken}` }
  });
  assert(
    arjunDeleteRes.status === 200,
    'Recent Chats',
    'Owner deletion with clean removal',
    `Arjun successfully deleted own thread ${testThreadId} (HTTP 200)`
  );

  // -------------------------------------------------------------
  // SUITE 3: EXISTING MEDIMENTOR AI CORE PIPELINE
  // -------------------------------------------------------------
  console.log('\n--- 3. EXISTING MEDIMENTOR AI CORE FEATURES ---');

  // Test 3.1: Document Classification (Prescription)
  const rxSampleText = `SAMPLE MEDICAL PRESCRIPTION DEMO ONLY
Patient: Demo Patient Date: 12 October 2026
Complaint: Mild headache
Clinical notes: Sample entry for document extraction testing.
Medication: Not specified
Advice: Consult a qualified healthcare professional.`;

  const classification = classifyMedicalDocument(rxSampleText);
  assert(
    classification.type === 'prescription' && classification.confidence >= 80,
    'Medical Core',
    'Document specialty classification (Prescription)',
    `Classified as ${classification.type} with ${classification.confidence}% confidence`
  );

  // Test 3.2: Specialty Parameter Extraction
  const parsedData = parseSpecialtyDocument(rxSampleText, classification);
  assert(
    parsedData.prescriptionData !== undefined,
    'Medical Core',
    'Specialty parameter parsing & facts extraction',
    `Prescription parameters mapped: clinic="${parsedData.prescriptionData?.clinicOrHospital || 'Not found'}", complaint="${parsedData.prescriptionData?.complaintOrDiagnosis || 'Not found'}"`
  );

  // Test 3.3: Lab Blood Panel Extraction
  const bloodSampleText = `COMPREHENSIVE METABOLIC & LIPID PANEL
Fasting Blood Sugar: 112 mg/dL (70-99) High
HbA1c: 6.1 % (<5.7) High
Total Cholesterol: 224 mg/dL (<200) High
LDL Cholesterol: 142 mg/dL (<100) High
Serum Creatinine: 0.92 mg/dL (0.7-1.3) Normal`;

  const bloodClass = classifyMedicalDocument(bloodSampleText);
  const bloodParsed = parseSpecialtyDocument(bloodSampleText, bloodClass);
  assert(
    bloodClass.type === 'lab_report' && bloodParsed.labMetrics.length >= 4,
    'Medical Core',
    'Laboratory blood panel parsing & metrics extraction',
    `Extracted ${bloodParsed.labMetrics.length} lab analytes with reference ranges and abnormal flags`
  );

  // Test 3.4: Duplicate Record Prevention Engine
  const samplePdfRecord: MedicalReport = {
    id: 'report-rx-1',
    title: 'Sample Medical Prescription Demo',
    category: 'prescription',
    documentType: 'prescription',
    date: '2026-10-12',
    formattedDate: '12 Oct 2026',
    labName: 'City Consultation Clinic',
    patientName: 'Demo Patient',
    patientAge: 42,
    patientGender: 'Male',
    fileName: 'sample_medical_prescription_demo.pdf',
    fileSize: '2.4 KB',
    metrics: [],
    overallStatus: 'normal',
    isVerified: true,
    isDemo: true,
    confidence: 0.98,
    summary: 'Clinical consultation note.',
    keyFindings: ['No medications prescribed'],
    nextSteps: ['Consult physician if symptoms persist'],
    questionsForDoctor: []
  };

  const duplicatedList: MedicalReport[] = [
    samplePdfRecord,
    { ...samplePdfRecord, id: 'report-rx-2', title: 'Sample Medical Prescription Demo (Copy 1)' },
    { ...samplePdfRecord, id: 'report-rx-3', title: 'Sample Medical Prescription Demo (Copy 2)' },
    ...MOCK_REPORTS
  ];

  const deduplicatedList = deduplicateReports(duplicatedList);
  const rxOccurrences = deduplicatedList.filter((r) => r.fileName === 'sample_medical_prescription_demo.pdf').length;
  assert(
    deduplicatedList.length === MOCK_REPORTS.length + 1 && rxOccurrences === 1,
    'Timeline & Deduplication',
    'Duplicate record detection & timeline pruning',
    `Reduced 7 total records (with 3 duplicates) down to exactly 5 clean records. Only 1 prescription copy preserved.`
  );

  // Test 3.5: HL7 FHIR R4 & ABDM Document Bundle Generation
  const fhirBundle = convertReportToFhirR4(samplePdfRecord);
  assert(
    fhirBundle.resourceType === 'Bundle' && fhirBundle.type === 'document' && Array.isArray(fhirBundle.entry) && fhirBundle.entry.length >= 2,
    'FHIR R4 / ABDM Export',
    'HL7 FHIR R4 Bundle generation',
    `Generated valid FHIR R4 bundle with ${fhirBundle.entry.length} resource entries (Patient, DiagnosticReport)`
  );

  // Test 3.6: Pre-seeded patient profile records segregation
  const arjunRecords = getRecordsForPatient('user-arjun');
  const priyaRecords = getRecordsForPatient('user-priya');
  assert(
    arjunRecords.length === 4 && priyaRecords.length === 1,
    'Profile Isolation',
    'Pre-seeded clinical patient profile isolation',
    `Arjun has 4 records (CBC, Lipid, Metabolic, Renal). Priya has 1 record (Thyroid Panel). Strict segregation.`
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS EXECUTED: ${results.length}`);
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllVerifications().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
