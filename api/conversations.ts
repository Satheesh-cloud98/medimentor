import fs from 'fs';
import path from 'path';
import { authenticateRequest } from './auth.js';

export interface ServerChatThread {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    citations?: any[];
    isFallback?: boolean;
    urgentCareWarning?: boolean;
    suggestedFollowUps?: string[];
  }>;
}

// Persistent data directory
const DATA_DIR = path.join(process.cwd(), '.data');
const STORAGE_FILE = path.join(DATA_DIR, 'conversations.json');

// In-memory cache synced with persistent file
let inMemoryStore: Record<string, ServerChatThread[]> = {};

function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      inMemoryStore = JSON.parse(raw);
    } else {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
    }
  } catch (err) {
    // In read-only serverless environments, inMemoryStore operates seamlessly
  }
}

function persistStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    // In read-only serverless environments, memory store retains session state
  }
}

// Initialize on module load
initStorage();

export function getUserThreads(userId: string): ServerChatThread[] {
  return inMemoryStore[userId] || [];
}

export function saveUserThreads(userId: string, threads: ServerChatThread[]): void {
  inMemoryStore[userId] = threads;
  persistStorage();
}

/**
 * Serverless Handler for /api/conversations
 * Strictly enforces user authentication and authorization
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Sync memory store with file if available
  initStorage();

  // 1. Enforce Server-Side Authentication
  const auth = authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return res.status(auth.statusCode || 401).json({
      success: false,
      error: auth.error || 'Authentication required. Bearer token invalid or missing.',
    });
  }

  const authenticatedUserId = auth.user.sub;

  // 2. GET /api/conversations — Retrieve authenticated user's conversations
  if (req.method === 'GET') {
    const userThreads = getUserThreads(authenticatedUserId);
    return res.status(200).json({
      success: true,
      userId: authenticatedUserId,
      threads: userThreads,
      count: userThreads.length,
    });
  }

  // 3. POST /api/conversations — Create or update conversation thread
  if (req.method === 'POST') {
    const body = req.body || {};
    const threadData: ServerChatThread = body.thread || body;

    if (!threadData || !threadData.id) {
      return res.status(400).json({ success: false, error: 'Invalid thread payload: "id" is required.' });
    }

    // Security check: Force thread.userId to match authenticated user
    const sanitizedThread: ServerChatThread = {
      ...threadData,
      id: String(threadData.id),
      userId: authenticatedUserId, // Guaranteed server-side ownership
      updatedAt: new Date().toISOString(),
      messages: Array.isArray(threadData.messages) ? threadData.messages : [],
    };

    // Prevent overwriting or claiming a conversation ID owned by another patient
    for (const [otherUserId, otherThreads] of Object.entries(inMemoryStore)) {
      if (otherUserId !== authenticatedUserId && otherThreads.some((t) => t.id === sanitizedThread.id)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: A conversation with this ID is owned by another user.',
        });
      }
    }

    const currentThreads = getUserThreads(authenticatedUserId);
    const existingIndex = currentThreads.findIndex((t) => t.id === sanitizedThread.id);

    let updatedThreads: ServerChatThread[];
    if (existingIndex >= 0) {
      updatedThreads = [...currentThreads];
      updatedThreads[existingIndex] = sanitizedThread;
    } else {
      updatedThreads = [sanitizedThread, ...currentThreads];
    }

    saveUserThreads(authenticatedUserId, updatedThreads);

    return res.status(200).json({
      success: true,
      thread: sanitizedThread,
      message: 'Conversation saved to server database.',
    });
  }

  // 4. PATCH /api/conversations — Rename thread
  if (req.method === 'PATCH') {
    const { threadId, title } = req.body || {};
    if (!threadId || !title) {
      return res.status(400).json({ success: false, error: 'threadId and title are required.' });
    }

    const currentThreads = getUserThreads(authenticatedUserId);
    const thread = currentThreads.find((t) => t.id === threadId);

    if (!thread) {
      // Check if another user owns this thread
      for (const [otherUserId, otherThreads] of Object.entries(inMemoryStore)) {
        if (otherUserId !== authenticatedUserId && otherThreads.some((t) => t.id === threadId)) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You do not have permission to modify this conversation.',
          });
        }
      }
      return res.status(404).json({
        success: false,
        error: `Thread ${threadId} not found in authenticated user's records.`,
      });
    }

    // Thread is verified to belong to the authenticated user
    const updatedThreads = currentThreads.map((t) =>
      t.id === threadId ? { ...t, title: String(title).trim(), updatedAt: new Date().toISOString() } : t
    );
    saveUserThreads(authenticatedUserId, updatedThreads);

    return res.status(200).json({
      success: true,
      threadId,
      newTitle: title.trim(),
    });
  }

  // 5. DELETE /api/conversations — Delete thread
  if (req.method === 'DELETE') {
    const threadId = req.query?.id || req.body?.threadId || req.body?.id;
    if (!threadId) {
      return res.status(400).json({ success: false, error: 'threadId is required for deletion.' });
    }

    const currentThreads = getUserThreads(authenticatedUserId);
    const exists = currentThreads.some((t) => t.id === threadId);

    if (!exists) {
      // Check if another user owns this thread to enforce 403 Forbidden
      for (const [otherUserId, otherThreads] of Object.entries(inMemoryStore)) {
        if (otherUserId !== authenticatedUserId && otherThreads.some((t) => t.id === threadId)) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You do not have permission to delete this conversation.',
          });
        }
      }
      return res.status(404).json({ success: false, error: 'Thread not found.' });
    }

    const updatedThreads = currentThreads.filter((t) => t.id !== threadId);
    saveUserThreads(authenticatedUserId, updatedThreads);

    return res.status(200).json({
      success: true,
      deletedThreadId: threadId,
      message: 'Conversation deleted from server storage.',
    });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
