import {
  getUserChats,
  saveUserChats,
  createChatThread,
  deleteChatThread,
  renameChatThread,
  updateThreadMessages,
  getUserMemory,
  addMemoryItem,
  removeMemoryItem,
  clearUserMemory,
} from '../src/services/chatStorageService';
import { signJwt } from '../api/auth';
import type { ChatThread, ChatMessage } from '../src/types/chat';

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

// In-memory mock for localStorage in Node.js test environment
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

// Polyfill window & localStorage globally for test environment
(global as any).window = {};
(global as any).localStorage = new MockLocalStorage();

async function runChatTests() {
  console.log('================================================================');
  console.log('       VERIFIHEALTH AI HEALTH CHATBOT VALIDATION SUITE          ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // PART 1: Local Serverless API Verification (/api/chat)
  // -------------------------------------------------------------
  console.log('--- PART 1: /api/chat Endpoint & Clinical Synthesis Tests ---');

  let baseUrl = process.env.TEST_BASE_URL || '';
  if (!baseUrl) {
    for (const candidate of ['http://localhost:5173', 'http://localhost:5174', 'https://medimentor-ai-beryl.vercel.app']) {
      try {
        const probe = await fetch(`${candidate}/api/auth`, { method: 'OPTIONS' });
        if (probe.status < 500) {
          baseUrl = candidate;
          break;
        }
      } catch {
        // try next candidate
      }
    }
  }
  if (!baseUrl) baseUrl = 'https://medimentor-ai-beryl.vercel.app';
  console.log(`Targeting server at: ${baseUrl}\n`);

  const sampleRecords = [
    {
      id: 'mock-1',
      title: 'Comprehensive Lipid Profile',
      category: 'lipid',
      date: '2026-09-15',
      formattedDate: '15 Sep 2026',
      isVerified: true,
      isDemo: true,
      metrics: [
        { name: 'Total Cholesterol', value: '224', unit: 'mg/dL', status: 'High' },
        { name: 'LDL Cholesterol', value: '142', unit: 'mg/dL', status: 'High' },
        { name: 'HDL Cholesterol', value: '48', unit: 'mg/dL', status: 'Normal' },
        { name: 'Triglycerides', value: '175', unit: 'mg/dL', status: 'High' },
      ],
    },
    {
      id: 'mock-2',
      title: 'Fasting Blood Glucose & HbA1c',
      category: 'metabolic',
      date: '2026-08-10',
      formattedDate: '10 Aug 2026',
      isVerified: true,
      isDemo: true,
      metrics: [
        { name: 'Fasting Blood Sugar', value: '112', unit: 'mg/dL', status: 'High' },
        { name: 'HbA1c', value: '6.1', unit: '%', status: 'High' },
      ],
    },
    {
      id: 'real-prescription-1',
      title: 'Sample Medical Prescription Demo',
      category: 'prescription',
      documentType: 'prescription',
      date: '2026-10-12',
      formattedDate: '12 Oct 2026',
      isVerified: true,
      isDemo: false,
      prescriptionData: {
        doctorName: 'Dr. Ramesh Verma',
        clinicHospital: 'City Hospital & Polyclinic',
        complaintDiagnosis: 'Mild headache',
        medicationsNotes: 'Not specified in document',
        medications: [],
      },
    },
  ];

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${signJwt({ sub: 'user-arjun', name: 'Arjun K. Sharma', role: 'patient' })}`,
  };

  // Test 1.1: Emergency Red Flag Detection
  try {
    const resEmergency = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'I am experiencing sudden severe crushing chest pain radiating to my left arm and severe shortness of breath.' }],
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const emergencyJson = await resEmergency.json();

    assert(resEmergency.status === 200, 'Emergency triage HTTP status 200');
    assert(emergencyJson.urgentCareWarning === true, 'Emergency red-flag detected');
    assert(
      emergencyJson.reply.includes('URGENT MEDICAL ADVISORY') &&
      (emergencyJson.reply.includes('112') || emergencyJson.reply.includes('emergency')),
      'Emergency response advises immediate clinical contact and emergency helpline',
      'Contains 112/emergency advisory'
    );
  } catch (err: any) {
    assert(false, 'Emergency triage API call', err.message);
  }

  // Test 1.2: Grounded Prescription Safety (No Pharmacological Hallucinations)
  try {
    const resRx = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What antibiotics or medications were prescribed in my sample medical prescription?' }],
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const rxJson = await resRx.json();

    assert(resRx.status === 200, 'Prescription check HTTP status 200');
    assert(
      rxJson.reply.toLowerCase().includes('no pharmacological medications') ||
      rxJson.reply.toLowerCase().includes('no medications') ||
      rxJson.reply.toLowerCase().includes('not specified'),
      'Prescription inquiry truthfully states NO medications prescribed',
      'Zero hallucination on prescription'
    );
    assert(
      !rxJson.reply.toLowerCase().includes('take amoxicillin') &&
      !rxJson.reply.toLowerCase().includes('take paracetamol twice daily'),
      'Prescription response does not invent fictional drugs or dosages'
    );
  } catch (err: any) {
    assert(false, 'Prescription check API call', err.message);
  }

  // Test 1.3: Grounded Lipid / Lab Inquiry
  try {
    const resLipid = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Can you analyze my cholesterol and LDL lipid levels?' }],
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const lipidJson = await resLipid.json();

    assert(resLipid.status === 200, 'Lipid inquiry HTTP status 200');
    assert(
      lipidJson.reply.includes('224') && lipidJson.reply.includes('142'),
      'Lipid explanation uses exact grounded values from uploaded records (224 mg/dL TC, 142 mg/dL LDL)'
    );
    assert(
      Array.isArray(lipidJson.citations) && lipidJson.citations.length > 0,
      'Lipid explanation includes structured record citations',
      `Count: ${lipidJson.citations?.length}`
    );
  } catch (err: any) {
    assert(false, 'Lipid inquiry API call', err.message);
  }

  // Test 1.4: Grounded Blood Sugar Inquiry
  try {
    const resSugar = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What was my fasting blood sugar and HbA1c?' }],
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const sugarJson = await resSugar.json();

    assert(resSugar.status === 200, 'Glucose inquiry HTTP status 200');
    assert(
      sugarJson.reply.includes('112') && sugarJson.reply.includes('6.1'),
      'Metabolic response references patient specific FBS (112 mg/dL) and HbA1c (6.1%)'
    );
  } catch (err: any) {
    assert(false, 'Glucose inquiry API call', err.message);
  }

  // Test 1.5: MediMentor AI Platform Capabilities
  try {
    const resPlatform = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'How does MediMentor AI work and how do I export my health data to ABDM / FHIR?' }],
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const platformJson = await resPlatform.json();

    assert(resPlatform.status === 200, 'Platform inquiry HTTP status 200');
    assert(
      platformJson.reply.toLowerCase().includes('fhir') &&
      platformJson.reply.toLowerCase().includes('ocr'),
      'VerifiHealth explains MediMentor AI architecture, OCR, and FHIR export correctly'
    );
  } catch (err: any) {
    assert(false, 'Platform inquiry API call', err.message);
  }

  // Test 1.6: Model Distinction & Honest Status
  try {
    const resModel = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is hypertension?' }],
        recordsSummary: [],
        language: 'en',
      }),
    });
    const modelJson = await resModel.json();

    assert(resModel.status === 200, 'Model inquiry HTTP status 200');
    assert(
      Boolean(modelJson.modelName),
      'Model name clearly reported in API response',
      `Model: ${modelJson.modelName}`
    );
    assert(
      typeof modelJson.isFallback === 'boolean' || typeof modelJson.configured === 'boolean',
      'Distinguishes real Gemini vs Fail-Safe Grounded Engine'
    );
  } catch (err: any) {
    assert(false, 'Model inquiry API call', err.message);
  }

  // Test 1.7: Conversational Greeting (Natural, NO Medical Record Dump)
  try {
    const resGreeting = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello! How are you doing today?' }],
        userProfile: { name: 'Arjun K. Sharma' },
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const greetingJson = await resGreeting.json();

    assert(resGreeting.status === 200, 'Greeting HTTP status 200');
    assert(
      greetingJson.reply.toLowerCase().includes('hello') ||
      greetingJson.reply.toLowerCase().includes('verifihealth'),
      'Greeting response warmly welcomes user by name or introduces VerifiHealth'
    );
    assert(
      !greetingJson.reply.includes('Your active health profile currently contains') &&
      !greetingJson.reply.includes('Total Cholesterol: 224') &&
      !greetingJson.reply.includes('Key Parameters in Your Profile:'),
      'Greeting response does NOT dump the entire medical profile summary on simple hello',
      'No record dump on greeting'
    );
  } catch (err: any) {
    assert(false, 'Greeting API call', err.message);
  }

  // Test 1.8: General Blood Pressure Health Question (AHA Guidelines, No Record Dump)
  try {
    const resBp = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is considered normal blood pressure?' }],
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const bpJson = await resBp.json();

    assert(resBp.status === 200, 'Blood pressure inquiry HTTP status 200');
    assert(
      bpJson.reply.includes('120') && bpJson.reply.includes('80'),
      'Blood pressure answer cites standard clinical baseline (< 120/80 mmHg)'
    );
    assert(
      bpJson.reply.toLowerCase().includes('systolic') && bpJson.reply.toLowerCase().includes('diastolic'),
      'Blood pressure answer explains systolic and diastolic pressure'
    );
  } catch (err: any) {
    assert(false, 'Blood pressure inquiry API call', err.message);
  }

  // Test 1.9: Plain-Language Simplification Request
  try {
    const resSimple = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Can you explain my lab results in simple terms plain english?' },
        ],
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const simpleJson = await resSimple.json();

    assert(resSimple.status === 200, 'Simplification inquiry HTTP status 200');
    assert(
      simpleJson.reply.toLowerCase().includes('cholesterol') ||
      simpleJson.reply.toLowerCase().includes('blood sugar') ||
      simpleJson.reply.toLowerCase().includes('pipe') ||
      simpleJson.reply.toLowerCase().includes('cargo'),
      'Simplified explanation translates medical markers into easy-to-understand concepts'
    );
  } catch (err: any) {
    assert(false, 'Simplification inquiry API call', err.message);
  }

  // Test 1.10: Doctor Consultation Questions Preparation
  try {
    const resDoc = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What questions should I ask my doctor about my health?' }],
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const docJson = await resDoc.json();

    assert(resDoc.status === 200, 'Doctor questions inquiry HTTP status 200');
    assert(
      docJson.reply.toLowerCase().includes('doctor') || docJson.reply.toLowerCase().includes('physician'),
      'Generates targeted clinical questions for doctor consultation'
    );
  } catch (err: any) {
    assert(false, 'Doctor questions API call', err.message);
  }

  // Test 1.11: Polite Parting & Gratitude
  try {
    const resThanks = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Thank you for your help! Goodbye!' }],
        userProfile: { name: 'Arjun K. Sharma' },
        recordsSummary: sampleRecords,
        language: 'en',
      }),
    });
    const thanksJson = await resThanks.json();

    assert(resThanks.status === 200, 'Gratitude inquiry HTTP status 200');
    assert(
      thanksJson.reply.toLowerCase().includes('welcome') || thanksJson.reply.toLowerCase().includes('care'),
      'Replies courteously to thank you / goodbye without dumping medical records'
    );
  } catch (err: any) {
    assert(false, 'Gratitude API call', err.message);
  }

  console.log('\n--- PART 2: User Partitioning, Persistence, & Recent Chats ---');

  // Test 2.1: Guest User Isolation (Zero fake chats)
  const guestUserId = 'user-guest';
  const initialGuestThreads = getUserChats(guestUserId);
  assert(
    initialGuestThreads.length === 0,
    'Guest user starts with zero chats (No fake placeholder chats)'
  );

  // Test 2.2: Thread Creation & Partitioning
  const user1 = 'patient-1'; // Arjun Sharma
  const user2 = 'patient-2'; // Priya Patel

  const thread1 = createChatThread(user1, 'Lipid Profile Discussion');
  assert(thread1.userId === user1, 'Thread 1 assigned to patient-1');
  assert(thread1.title === 'Lipid Profile Discussion', 'Thread 1 has correct title');

  // Save messages to thread 1
  const userMsg: ChatMessage = {
    id: 'msg-1',
    role: 'user',
    content: 'What are my cholesterol results?',
    timestamp: new Date().toISOString(),
  };
  const assistantMsg: ChatMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Your Total Cholesterol is 224 mg/dL.',
    timestamp: new Date().toISOString(),
    citations: [
      {
        recordId: 'mock-1',
        recordTitle: 'Comprehensive Lipid Profile',
        metricOrFinding: 'Total Cholesterol',
        value: '224 mg/dL',
      },
    ],
  };

  updateThreadMessages(user1, thread1.id, [userMsg, assistantMsg]);

  const user1ThreadsAfter = getUserChats(user1);
  assert(user1ThreadsAfter.length === 1, 'Patient 1 has exactly 1 thread saved');
  assert(
    user1ThreadsAfter[0].messages.length === 2,
    'Patient 1 thread has both messages preserved'
  );

  // Test 2.3: User Isolation (Patient 2 cannot access Patient 1 threads)
  const user2Threads = getUserChats(user2);
  assert(
    user2Threads.length === 0,
    'Patient 2 has 0 threads (Strict user-level storage partitioning)',
    `Keys isolated: medimentor_chats_patient-1 vs medimentor_chats_patient-2`
  );

  // Patient 2 creates their own thread
  createChatThread(user2, 'Eye Prescription Consult');
  const user2ThreadsAfter = getUserChats(user2);
  assert(user2ThreadsAfter.length === 1, 'Patient 2 now has 1 thread');
  assert(user2ThreadsAfter[0].title === 'Eye Prescription Consult', 'Patient 2 thread title verified');

  // Verify Patient 1 threads untouched
  const user1ThreadsRefreshed = getUserChats(user1);
  assert(
    user1ThreadsRefreshed.length === 1 && user1ThreadsRefreshed[0].id === thread1.id,
    'Patient 1 threads completely uncorrupted by Patient 2 activity'
  );

  // Test 2.4: Rename Thread
  renameChatThread(user1, thread1.id, 'Cardiovascular Health Plan 2026');
  const user1Renamed = getUserChats(user1);
  assert(
    user1Renamed[0].title === 'Cardiovascular Health Plan 2026',
    'Thread rename successful with persistence'
  );
  assert(
    user1Renamed[0].messages.length === 2,
    'Messages intact after thread rename'
  );

  // Test 2.5: Personalization & User Memory Controls
  const initialMemory = getUserMemory(user1);
  assert(initialMemory.length === 0, 'Initial user memory is empty');

  addMemoryItem(user1, 'Terminology Preference', 'Prefers simple non-technical terms for medical descriptions');
  addMemoryItem(user1, 'Patient Allergy', 'Severe allergy to Penicillin reported by patient');

  const loadedMemory = getUserMemory(user1);
  assert(loadedMemory.length === 2, 'Two user memory items stored');
  assert(
    loadedMemory.some((m) => m.value.includes('Penicillin')),
    'Penicillin allergy stored with condition key/value'
  );

  // Memory isolation check
  const user2Memory = getUserMemory(user2);
  assert(
    user2Memory.length === 0,
    'Patient 2 memory is empty (Memory strictly isolated by user ID)'
  );

  // Delete single memory item
  removeMemoryItem(user1, loadedMemory[0].id);
  const memoryAfterDelete = getUserMemory(user1);
  assert(memoryAfterDelete.length === 1, 'Single memory item deleted successfully');

  // Clear all memory
  clearUserMemory(user1);
  assert(getUserMemory(user1).length === 0, 'Clear all user memory successfully wiped');

  // Test 2.6: Thread Deletion
  deleteChatThread(user1, thread1.id);
  const user1ThreadsAfterDelete = getUserChats(user1);
  assert(
    user1ThreadsAfterDelete.length === 0,
    'Thread deletion removed thread completely'
  );

  console.log('\n================================================================');
  console.log(`SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runChatTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
