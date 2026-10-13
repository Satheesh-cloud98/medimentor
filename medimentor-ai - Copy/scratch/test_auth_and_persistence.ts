import { signJwt, verifyJwt } from '../api/auth';
import {
  getUserChats,
  saveUserChats,
  createChatThread,
  syncUserChatsWithServer,
} from '../src/services/chatStorageService';
import { getAuthToken } from '../src/services/authService';

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

// In-memory Mock localStorage
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null { return this.store[key] ?? null; }
  setItem(key: string, value: string): void { this.store[key] = value; }
  removeItem(key: string): void { delete this.store[key]; }
  clear(): void { this.store = {}; }
}

(global as any).window = {};
(global as any).localStorage = new MockLocalStorage();

const BASE_URL = 'http://localhost:5173';

async function runAuthAndPersistenceSuite() {
  console.log('================================================================');
  console.log('   MEDIMENTOR AI: AUTHENTICATION, ISOLATION & PERSISTENCE TEST   ');
  console.log('================================================================\n');

  // =============================================================
  // PART 1: Cryptographic JWT & Token Authentication
  // =============================================================
  console.log('--- PART 1: Server Authentication & Token Verification ---');

  // 1.1 Valid token generation & signature verification
  const arjunToken = signJwt({ sub: 'user-arjun', name: 'Arjun K. Sharma', role: 'patient' }, 3600);
  const priyaToken = signJwt({ sub: 'user-priya', name: 'Priya Sharma', role: 'patient' }, 3600);
  const guestToken = signJwt({ sub: 'user-guest', name: 'New Patient', role: 'patient' }, 3600);

  const arjunVerify = verifyJwt(arjunToken);
  assert(arjunVerify.valid && arjunVerify.payload?.sub === 'user-arjun', 'Valid Arjun JWT verifies successfully');

  // 1.2 Tampered token signature rejection
  const tamperedToken = arjunToken.slice(0, -6) + 'abcdef';
  const tamperedVerify = verifyJwt(tamperedToken);
  assert(!tamperedVerify.valid && tamperedVerify.error?.includes('signature'), 'Tampered token signature is rejected');

  // 1.3 Expired token rejection
  const expiredToken = signJwt({ sub: 'user-arjun', name: 'Arjun K. Sharma', role: 'patient' }, -10);
  const expiredVerify = verifyJwt(expiredToken);
  assert(!expiredVerify.valid && expiredVerify.error?.includes('expired'), 'Expired JWT is rejected');

  // 1.4 Live API endpoint /api/auth login
  try {
    const authRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-arjun', name: 'Arjun K. Sharma' }),
    });
    const authJson = await authRes.json();
    assert(authRes.status === 200, 'POST /api/auth login status 200');
    assert(Boolean(authJson.token && authJson.tokenType === 'Bearer'), 'POST /api/auth returns valid Bearer token');

    // 1.5 GET /api/auth with token
    const meRes = await fetch(`${BASE_URL}/api/auth`, {
      headers: { Authorization: `Bearer ${authJson.token}` },
    });
    const meJson = await meRes.json();
    assert(meRes.status === 200 && meJson.user?.sub === 'user-arjun', 'GET /api/auth with Bearer token validates identity');

    // 1.6 GET /api/auth without token returns 401
    const noTokenRes = await fetch(`${BASE_URL}/api/auth`);
    assert(noTokenRes.status === 401, 'GET /api/auth without token returns HTTP 401 Unauthorized');
  } catch (err: any) {
    assert(false, 'Live /api/auth tests', err.message);
  }

  // =============================================================
  // PART 2: Protected Endpoints Authentication Enforcement
  // =============================================================
  console.log('\n--- PART 2: Protected API Authentication Enforcement ---');

  // 2.1 /api/chat rejects unauthenticated requests
  try {
    const unauthChatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is my blood sugar?' }],
      }),
    });
    assert(unauthChatRes.status === 401, 'POST /api/chat without token returns HTTP 401 Unauthorized');
  } catch (err: any) {
    assert(false, '/api/chat unauthenticated check', err.message);
  }

  // 2.2 /api/chat rejects tampered token
  try {
    const tamperedChatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tamperedToken}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is my blood sugar?' }],
      }),
    });
    assert(tamperedChatRes.status === 401, 'POST /api/chat with tampered token returns HTTP 401 Unauthorized');
  } catch (err: any) {
    assert(false, '/api/chat tampered token check', err.message);
  }

  // 2.3 /api/chat accepts valid authenticated user
  try {
    const authChatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${arjunToken}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Can you analyze my cholesterol levels?' }],
        language: 'en',
      }),
    });
    const authChatJson = await authChatRes.json();
    assert(authChatRes.status === 200, 'POST /api/chat with valid Bearer token returns HTTP 200 OK');
    assert(
      authChatJson.reply.includes('224') && authChatJson.reply.includes('142'),
      'Grounded clinical reply uses verified patient records from authenticated user'
    );
  } catch (err: any) {
    assert(false, '/api/chat authenticated query', err.message);
  }

  // =============================================================
  // PART 3: Server-Side Medical Record Access Control & Privacy
  // =============================================================
  console.log('\n--- PART 3: Medical Record Authorization & Privacy Protection ---');

  // 3.1 Unauthenticated record access rejected
  try {
    const unauthRecRes = await fetch(`${BASE_URL}/api/records`);
    assert(unauthRecRes.status === 401, 'GET /api/records without token returns HTTP 401 Unauthorized');
  } catch (err: any) {
    assert(false, 'Unauthenticated records check', err.message);
  }

  // 3.2 Arjun gets Arjun's records
  try {
    const arjunRecRes = await fetch(`${BASE_URL}/api/records`, {
      headers: { Authorization: `Bearer ${arjunToken}` },
    });
    const arjunRecJson = await arjunRecRes.json();
    assert(arjunRecRes.status === 200, 'Arjun GET /api/records returns HTTP 200');
    assert(arjunRecJson.records.length === 4, `Arjun has 4 records (got: ${arjunRecJson.records.length})`);
    assert(
      arjunRecJson.records.every((r: any) => r.patientId === 'user-arjun'),
      'All records strictly belong to user-arjun'
    );
  } catch (err: any) {
    assert(false, 'Arjun records fetch', err.message);
  }

  // 3.3 Priya gets only Priya's records
  try {
    const priyaRecRes = await fetch(`${BASE_URL}/api/records`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    const priyaRecJson = await priyaRecRes.json();
    assert(priyaRecRes.status === 200, 'Priya GET /api/records returns HTTP 200');
    assert(priyaRecJson.records.length === 1, `Priya has 1 record (got: ${priyaRecJson.records.length})`);
    assert(priyaRecJson.records[0].patientId === 'user-priya', 'Priya record strictly belongs to user-priya');
  } catch (err: any) {
    assert(false, 'Priya records fetch', err.message);
  }

  // 3.4 Cross-User Record Retrieval Protection (Priya tries to fetch Arjun's record)
  try {
    const crossAccessRes = await fetch(`${BASE_URL}/api/records?id=rep-lipid-2026`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(
      crossAccessRes.status === 403,
      'Cross-user record retrieval is blocked with HTTP 403 Forbidden',
      'Priya blocked from Arjun record rep-lipid-2026'
    );
  } catch (err: any) {
    assert(false, 'Cross-user access check', err.message);
  }

  // =============================================================
  // PART 4: Server-Side Conversation Persistence & Cloud Recovery
  // =============================================================
  console.log('\n--- PART 4: Server-Side Conversation Persistence & Device Recovery ---');

  // 4.1 Save conversation to server database
  const sampleThread = {
    id: `thread-persisted-${Date.now()}`,
    userId: 'user-arjun',
    title: 'Persistent Cardiology Assessment 2026',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-p1',
        role: 'user',
        content: 'Explain my cholesterol and LDL risk factors.',
        timestamp: '10:00 AM',
      },
      {
        id: 'msg-p2',
        role: 'assistant',
        content: 'Your Total Cholesterol is 224 mg/dL and LDL is 142 mg/dL.',
        timestamp: '10:01 AM',
      },
    ],
  };

  try {
    const saveThreadRes = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${arjunToken}`,
      },
      body: JSON.stringify({ thread: sampleThread }),
    });
    assert(saveThreadRes.status === 200, 'POST /api/conversations saves thread to server database');

    // 4.2 Cross-Session Persistence: WIPE LOCAL STORAGE and RECOVER FROM SERVER
    (global as any).localStorage.clear();
    assert(getUserChats('user-arjun').length === 0, 'Local browser storage completely wiped (simulating new device/clear cache)');

    // Pull from server database
    const recoveredThreads = await syncUserChatsWithServer('user-arjun');
    assert(
      recoveredThreads.length > 0 && recoveredThreads.some((t) => t.id === sampleThread.id),
      'Conversations survive browser cache clear & restore from server database',
      `Recovered thread count: ${recoveredThreads.length}`
    );

    // 4.3 User Isolation: Priya cannot see Arjun's conversation
    const priyaThreadsRes = await fetch(`${BASE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    const priyaThreadsJson = await priyaThreadsRes.json();
    assert(
      !priyaThreadsJson.threads.some((t: any) => t.id === sampleThread.id),
      'Priya cannot see Arjun conversations on server (Strict user isolation)'
    );

    // 4.4 Priya cannot delete Arjun's conversation (HTTP 403 Forbidden)
    const priyaDeleteRes = await fetch(`${BASE_URL}/api/conversations?id=${sampleThread.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(
      priyaDeleteRes.status === 403,
      'Priya blocked from deleting Arjun conversation with HTTP 403 Forbidden'
    );

    // 4.5 Arjun deletes own conversation
    const arjunDeleteRes = await fetch(`${BASE_URL}/api/conversations?id=${sampleThread.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${arjunToken}` },
    });
    assert(arjunDeleteRes.status === 200, 'Arjun successfully deletes own conversation from server');
  } catch (err: any) {
    assert(false, 'Conversation persistence & recovery', err.message);
  }

  // =============================================================
  // PART 5: Prominent Labeling of Synthetic Demo Data
  // =============================================================
  console.log('\n--- PART 5: Synthetic Demo Data Labeling ---');

  try {
    const demoQueryRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${arjunToken}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What does my lipid profile show?' }],
        language: 'en',
      }),
    });
    const demoQueryJson = await demoQueryRes.json();

    assert(
      demoQueryJson.reply.includes('DEMO DATA NOTICE') ||
      demoQueryJson.reply.includes('simulated demonstration record'),
      'AI response text includes prominent synthetic DEMO DATA NOTICE disclaimer'
    );

    const hasDemoCitationNotice = demoQueryJson.citations.some(
      (c: any) => c.isDemo && c.demoNotice?.includes('SAMPLE DEMO RECORD')
    );
    assert(
      hasDemoCitationNotice,
      'Citations include explicit sample demo record notice and isDemo flag',
      'demoNotice present'
    );
  } catch (err: any) {
    assert(false, 'Synthetic demo data labeling check', err.message);
  }

  // =============================================================
  // PART 6: Fallback Engine Transparency & Error Handling
  // =============================================================
  console.log('\n--- PART 6: Fallback Engine Transparency & Error Handling ---');

  try {
    const fallbackRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${arjunToken}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is metabolic syndrome?' }],
        language: 'en',
      }),
    });
    const fallbackJson = await fallbackRes.json();

    assert(
      typeof fallbackJson.isFallback === 'boolean',
      'API explicitly reports isFallback boolean flag',
      `isFallback: ${fallbackJson.isFallback}`
    );
    assert(
      Boolean(fallbackJson.modelName),
      'API transparently names engine model',
      `Model: ${fallbackJson.modelName}`
    );
    if (fallbackJson.isFallback) {
      assert(
        Boolean(fallbackJson.fallbackReason),
        'Fallback response provides explicit and honest reason for local fail-safe execution',
        `Reason: ${fallbackJson.fallbackReason}`
      );
    }
  } catch (err: any) {
    assert(false, 'Fallback transparency check', err.message);
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAuthAndPersistenceSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
