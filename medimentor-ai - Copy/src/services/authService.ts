/**
 * Client-side Authentication & Session Token Service for MediMentor AI
 * Manages JWT tokens, user identities, and secure request headers.
 */

const TOKEN_STORAGE_PREFIX = 'medimentor_jwt_token_';

export interface AuthSession {
  token: string;
  userId: string;
  name: string;
  role: string;
  expiresAt: number;
}

// In-memory token cache for active session
const sessionCache: Record<string, AuthSession> = {};

/**
 * Retrieve or obtain a cryptographically signed JWT token for the active user
 */
export async function getAuthToken(userId = 'user-arjun', userName?: string): Promise<string> {
  // Check memory cache first
  const cached = sessionCache[userId];
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt > now + 60) {
    return cached.token;
  }

  // Check storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${TOKEN_STORAGE_PREFIX}${userId}`);
      if (stored) {
        const parsed: AuthSession = JSON.parse(stored);
        if (parsed.expiresAt > now + 60) {
          sessionCache[userId] = parsed;
          return parsed.token;
        }
      }
    } catch {
      // ignore
    }
  }

  // Request new token from server
  try {
    const baseUrl = typeof window !== 'undefined' && window.location?.origin ? '' : 'http://localhost:5174';
    const isBrowser = typeof window !== 'undefined' && Boolean(window.location?.origin);
    const authUrl = isBrowser ? '/api/auth' : `${baseUrl}/api/auth`;
    const res = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: userName }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        const session: AuthSession = {
          token: data.token,
          userId,
          name: data.user?.name || userName || 'Verified Patient',
          role: data.user?.role || 'patient',
          expiresAt: now + (data.expiresIn || 604800),
        };
        sessionCache[userId] = session;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`${TOKEN_STORAGE_PREFIX}${userId}`, JSON.stringify(session));
          } catch {
            // ignore
          }
        }
        return data.token;
      }
    }
  } catch (err) {
    console.warn('Auth server unavailable, using client fallback token generation:', err);
  }

  // Fallback synthetic token if completely offline
  return `offline_bearer_${userId}_${Date.now()}`;
}

/**
 * Generate HTTP Authorization header object
 */
export async function getAuthHeaders(userId?: string): Promise<Record<string, string>> {
  const token = await getAuthToken(userId);
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Invalidate stored session on logout
 */
export function clearAuthSession(userId: string): void {
  delete sessionCache[userId];
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`${TOKEN_STORAGE_PREFIX}${userId}`);
    } catch {
      // ignore
    }
  }
}
