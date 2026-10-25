import type { ChatApiMessage, ChatApiResponse, ChatThread } from '../types/chat';
import type { MedicalReport, PatientProfile } from '../types/report';
import type { SupportedLanguage } from '../types/language';
import { getUserMemory } from './chatStorageService';
import { getAuthToken } from './authService';

const getBaseUrl = () => (typeof window !== 'undefined' && window.location?.origin ? '' : 'http://localhost:5174');

/**
 * Summarize active records into a compact, grounded context payload for the AI
 */
export function buildRecordsContext(reports: MedicalReport[]) {
  return reports.map((r) => ({
    id: r.id,
    title: r.title,
    documentType: r.documentType || r.category || 'medical_report',
    formattedDate: r.formattedDate || r.date,
    isDemo: Boolean(r.isDemo),
    isVerified: Boolean(r.isVerified),
    summary: r.summary || '',
    facts: r.factsFromDocument || r.keyFindings || [],
    metrics: (r.metrics || []).map((m) => ({
      name: m.name,
      value: m.value,
      unit: m.unit,
      status: m.status,
      referenceRange: m.referenceRange,
    })),
    prescriptionData: r.prescriptionData
      ? {
          doctorName: r.prescriptionData.doctorName,
          clinicOrHospital: r.prescriptionData.clinicOrHospital || r.prescriptionData.hospitalOrClinic,
          complaintOrDiagnosis: r.prescriptionData.complaintOrDiagnosis,
          medications: r.prescriptionData.medications,
          medicationsNotes: r.prescriptionData.medicationsNotes,
        }
      : undefined,
  }));
}

/**
 * Send conversation turns to /api/chat and receive grounded clinical response
 * Enforces Authorization Bearer token header on every request.
 */
export async function sendChatMessage(
  messages: ChatApiMessage[],
  profile: PatientProfile,
  reports: MedicalReport[],
  language: SupportedLanguage
): Promise<ChatApiResponse> {
  const recordsSummary = buildRecordsContext(reports);
  const memoryItems = getUserMemory(profile.id).map((m) => `${m.key}: ${m.value}`);

  try {
    const token = await getAuthToken(profile.id, profile.name);
    const userKey = typeof window !== 'undefined' ? localStorage.getItem('medimentor_gemini_api_key') : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    if (userKey && userKey.trim()) {
      headers['x-gemini-api-key'] = userKey.trim();
    }

    const isBrowser = typeof window !== 'undefined' && Boolean(window.location?.origin);
    const targetUrl = isBrowser ? '/api/chat' : `${getBaseUrl()}/api/chat`;
    console.log(`[VerifiHealth Chat] Dispatching POST to ${targetUrl || '/api/chat'} (turns: ${messages.length}, hasCustomKey: ${Boolean(userKey)})`);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages,
        userProfile: {
          id: profile.id,
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          bloodGroup: profile.bloodGroup,
          allergies: profile.allergies,
          chronicConditions: profile.chronicConditions,
        },
        recordsSummary,
        language,
        memory: memoryItems,
      }),
    });

    console.log(`[VerifiHealth Chat] Server response HTTP status: ${res.status}`);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        configured: errData.configured ?? true,
        reply:
          errData.reply ||
          `I encountered a server communication error (${res.status}: ${errData.error || 'Request rejected'}). Operating in safe grounded mode. Please consult your physician for medical decisions.`,
        modelName: errData.modelName || 'VerifiHealth Grounded Clinical Engine (Fail-Safe Fallback)',
        isFallback: true,
        isRateLimitFallback: res.status === 429,
        fallbackReason: errData.fallbackReason || `Server error (HTTP ${res.status}): ${errData.error || 'Unavailable'}`,
        languageUsed: language,
        error: errData.error,
      };
    }

    const data: ChatApiResponse = await res.json();
    console.log(`[VerifiHealth Chat] Parsed response (model: ${data.modelName}, isFallback: ${data.isFallback})`);
    return data;
  } catch (err: any) {
    console.warn('[VerifiHealth Chat] Network exception while reaching /api/chat:', err?.message || err);
    const totalRecs = reports.length;
    const verifiedRecs = reports.filter((r) => Boolean(r.isVerified)).length;
    const pendingRecs = totalRecs - verifiedRecs;
    const demoRecs = reports.filter((r) => Boolean(r.isDemo)).length;
    const realRecs = totalRecs - demoRecs;
    const prov = demoRecs === totalRecs ? `${demoRecs} synthetic demonstration records` : demoRecs === 0 ? `${realRecs} patient uploads` : `${realRecs} patient uploads, ${demoRecs} synthetic demonstration records`;
    const verif = `${verifiedRecs} clinically verified, ${pendingRecs} pending verification`;

    const latestQ = (messages[messages.length - 1]?.content || '').toLowerCase().trim();
    let offlineReply = '';
    let suggestedFollowUps = ['Review my lab values', 'Check my prescription status'];

    if (/^\s*(hi|hello|hey|namaste|howdy|good\s+(morning|afternoon|evening)|greetings)\b/i.test(latestQ) || /^\s*(how\s+are\s+you|who\s+are\s+you)\b/i.test(latestQ)) {
      offlineReply = `Hello ${profile.name || 'there'}! I am **VerifiHealth**, your grounded AI clinical copilot.\n\n` +
        `I am currently operating in offline fail-safe mode using your locally cached clinical records.\n` +
        `Your active profile has **${totalRecs} clinical documents** (${prov}; ${verif}) stored securely in your browser.\n\n` +
        `How can I assist you today? You can ask about your lab results, medications, or platform features.`;
      suggestedFollowUps = ['Explain my cholesterol results', 'What medications do I have on file?', 'How do I upload records?'];
    } else {
      offlineReply = `Offline Grounded Engine Active:\nI am operating via VerifiHealth's grounded local clinical engine using your locally cached records.\n\nYour profile contains **${totalRecs} clinical documents** (${prov}; ${verif}). All extracted parameters remain securely stored in your local browser sandbox.`;
    }

    return {
      configured: true,
      reply: offlineReply,
      modelName: 'VerifiHealth Grounded Clinical Engine (Offline Fail-Safe)',
      isFallback: true,
      isRateLimitFallback: false,
      fallbackReason: `Network unreachable: ${err?.message || 'Connection failed'}. Client-side grounded fallback engaged.`,
      languageUsed: language,
      suggestedFollowUps,
    };
  }
}

/**
 * Fetch authenticated user's conversations from server storage
 */
export async function fetchServerConversations(userId: string): Promise<ChatThread[]> {
  try {
    const token = await getAuthToken(userId);
    const res = await fetch(`${getBaseUrl()}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.threads) ? data.threads : [];
    }
  } catch (err) {
    console.warn('Failed to load conversations from server:', err);
  }
  return [];
}

/**
 * Sync / persist conversation thread to server storage
 */
export async function saveServerConversation(userId: string, thread: ChatThread): Promise<boolean> {
  try {
    const token = await getAuthToken(userId);
    const res = await fetch(`${getBaseUrl()}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ thread }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to save conversation to server:', err);
    return false;
  }
}

/**
 * Rename conversation on server storage
 */
export async function renameServerConversation(userId: string, threadId: string, title: string): Promise<boolean> {
  try {
    const token = await getAuthToken(userId);
    const res = await fetch(`${getBaseUrl()}/api/conversations`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ threadId, title }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to rename conversation on server:', err);
    return false;
  }
}

/**
 * Delete conversation on server storage
 */
export async function deleteServerConversation(userId: string, threadId: string): Promise<boolean> {
  try {
    const token = await getAuthToken(userId);
    const res = await fetch(`${getBaseUrl()}/api/conversations?id=${encodeURIComponent(threadId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete conversation on server:', err);
    return false;
  }
}

/**
 * Fetch authenticated user's medical records from server storage
 */
export async function fetchServerRecords(userId: string): Promise<any[]> {
  try {
    const token = await getAuthToken(userId);
    const res = await fetch(`${getBaseUrl()}/api/records`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.records) ? data.records : [];
    }
  } catch (err) {
    console.warn('Failed to load records from server:', err);
  }
  return [];
}

/**
 * Persist verified medical record to server storage
 */
export async function saveServerRecord(userId: string, record: any): Promise<boolean> {
  try {
    const token = await getAuthToken(userId);
    const res = await fetch(`${getBaseUrl()}/api/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to save record to server:', err);
    return false;
  }
}
