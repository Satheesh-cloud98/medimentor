import type { ChatThread, UserMemoryItem, ChatMessage } from '../types/chat';
import { getAuthToken } from './authService';

const getChatsStorageKey = (userId: string) => `medimentor_chats_${userId}`;
const getMemoryStorageKey = (userId: string) => `medimentor_memory_${userId}`;

/**
 * Retrieve all saved chat conversations for a specific patient profile
 * Enforces strict user-level partitioning.
 */
export function getUserChats(userId: string): ChatThread[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(getChatsStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Failed to load chats for user ${userId}:`, err);
    return [];
  }
}

/**
 * Persist conversations for a specific patient profile locally
 */
export function saveUserChats(userId: string, chats: ChatThread[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(getChatsStorageKey(userId), JSON.stringify(chats));
  } catch (err) {
    console.error(`Failed to save chats for user ${userId}:`, err);
  }
}

const getBaseUrl = () => (typeof window !== 'undefined' && window.location?.origin ? '' : 'http://localhost:5174');

/**
 * Background synchronization of a thread to server database
 */
export function syncThreadToServerAsync(userId: string, thread: ChatThread): void {
  if (typeof window === 'undefined' || !userId) return;
  getAuthToken(userId)
    .then((token) => {
      fetch(`${getBaseUrl()}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ thread }),
      }).catch((err) => console.warn('Background server sync warning:', err));
    })
    .catch(() => {});
}

/**
 * Background deletion of a thread from server database
 */
export function deleteThreadOnServerAsync(userId: string, threadId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  getAuthToken(userId)
    .then((token) => {
      fetch(`${getBaseUrl()}/api/conversations?id=${encodeURIComponent(threadId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch((err) => console.warn('Background server delete warning:', err));
    })
    .catch(() => {});
}

/**
 * Synchronize conversation list with server database
 * Recovers conversations after browser clear or device switch.
 */
export async function syncUserChatsWithServer(userId: string): Promise<ChatThread[]> {
  if (typeof window === 'undefined' || !userId) return getUserChats(userId);
  try {
    const token = await getAuthToken(userId);
    const res = await fetch(`${getBaseUrl()}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const serverThreads: ChatThread[] = Array.isArray(data.threads) ? data.threads : [];
      const localThreads = getUserChats(userId);

      // Merge: Map by ID, prefer the one with later updatedAt
      const map = new Map<string, ChatThread>();
      for (const t of localThreads) {
        map.set(t.id, t);
      }
      for (const t of serverThreads) {
        const local = map.get(t.id);
        if (!local || new Date(t.updatedAt).getTime() >= new Date(local.updatedAt).getTime()) {
          map.set(t.id, t);
        }
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      saveUserChats(userId, merged);
      return merged;
    }
  } catch (err) {
    console.warn('Server sync error for user chats:', err);
  }
  return getUserChats(userId);
}

/**
 * Create a brand new chat conversation thread
 */
export function createChatThread(userId: string, title?: string): ChatThread {
  const newThread: ChatThread = {
    id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title: title || 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  const existing = getUserChats(userId);
  const updated = [newThread, ...existing];
  saveUserChats(userId, updated);
  syncThreadToServerAsync(userId, newThread);
  return newThread;
}

/**
 * Delete a conversation thread
 */
export function deleteChatThread(userId: string, threadId: string): ChatThread[] {
  const existing = getUserChats(userId);
  const updated = existing.filter((c) => c.id !== threadId);
  saveUserChats(userId, updated);
  deleteThreadOnServerAsync(userId, threadId);
  return updated;
}

/**
 * Rename a conversation thread
 */
export function renameChatThread(userId: string, threadId: string, newTitle: string): ChatThread[] {
  const existing = getUserChats(userId);
  let renamedThread: ChatThread | null = null;
  const updated = existing.map((c) => {
    if (c.id === threadId) {
      renamedThread = { ...c, title: newTitle.trim() || 'Untitled Chat', updatedAt: new Date().toISOString() };
      return renamedThread;
    }
    return c;
  });
  saveUserChats(userId, updated);
  if (renamedThread) {
    syncThreadToServerAsync(userId, renamedThread);
  }
  return updated;
}

/**
 * Add or update messages in a chat thread
 */
export function updateThreadMessages(
  userId: string,
  threadId: string,
  messages: ChatMessage[],
  autoTitle?: string
): ChatThread[] {
  const existing = getUserChats(userId);
  let savedThread: ChatThread | null = null;
  const updated = existing.map((c) => {
    if (c.id === threadId) {
      const needsTitle = c.title === 'New Conversation' || !c.title;
      savedThread = {
        ...c,
        title: needsTitle && autoTitle ? autoTitle.slice(0, 40) : c.title,
        updatedAt: new Date().toISOString(),
        messages,
      };
      return savedThread;
    }
    return c;
  });
  saveUserChats(userId, updated);
  if (savedThread) {
    syncThreadToServerAsync(userId, savedThread);
  }
  return updated;
}

/**
 * Retrieve patient memory preferences
 */
export function getUserMemory(userId: string): UserMemoryItem[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(getMemoryStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Failed to load memory for user ${userId}:`, err);
    return [];
  }
}

/**
 * Persist patient memory preferences
 */
export function saveUserMemory(userId: string, memory: UserMemoryItem[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(getMemoryStorageKey(userId), JSON.stringify(memory));
  } catch (err) {
    console.error(`Failed to save memory for user ${userId}:`, err);
  }
}

/**
 * Add an approved memory preference
 */
export function addMemoryItem(userId: string, key: string, value: string): UserMemoryItem[] {
  const existing = getUserMemory(userId);
  const newItem: UserMemoryItem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    key: key.trim(),
    value: value.trim(),
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...existing.filter((m) => m.key.toLowerCase() !== key.toLowerCase())];
  saveUserMemory(userId, updated);
  return updated;
}

/**
 * Delete a specific memory item
 */
export function removeMemoryItem(userId: string, itemId: string): UserMemoryItem[] {
  const existing = getUserMemory(userId);
  const updated = existing.filter((m) => m.id !== itemId);
  saveUserMemory(userId, updated);
  return updated;
}

/**
 * Clear all memory for a specific patient profile
 */
export function clearUserMemory(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.removeItem(getMemoryStorageKey(userId));
  } catch (err) {
    console.error(`Failed to clear memory for user ${userId}:`, err);
  }
}
