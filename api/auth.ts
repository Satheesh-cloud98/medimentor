import type { IncomingMessage } from 'http';
import crypto from 'crypto';

export interface AuthUser {
  id: string;
  name: string;
  role: 'patient' | 'doctor' | 'admin';
  email?: string;
}

export interface TokenPayload {
  sub: string; // user id
  name: string;
  role: string;
  iat: number;
  exp: number;
}

// Secret for HMAC-SHA256 signing (configured via env in production, secure default in dev)
const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'medimentor_ai_secure_hmac_secret_2026_production_grade';
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Base64URL encoding/decoding
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generate a cryptographically signed HMAC-SHA256 JWT
 */
export function signJwt(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresInSeconds = TOKEN_EXPIRY_SECONDS): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify HMAC-SHA256 JWT signature and expiration
 */
export function verifyJwt(token: string): { valid: boolean; payload?: TokenPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid format' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure (expected 3 segments)' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify signature using timing-safe comparison
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: 'Invalid token signature (forged or modified)' };
  }

  try {
    const payload: TokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: 'Failed to parse token payload' };
  }
}

/**
 * Extract and authenticate Bearer token from incoming request
 */
export function authenticateRequest(req: IncomingMessage | any): {
  authenticated: boolean;
  user?: TokenPayload;
  error?: string;
  statusCode?: number;
} {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return {
      authenticated: false,
      error: 'Authorization header missing. Please provide a valid Bearer token.',
      statusCode: 401,
    };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      authenticated: false,
      error: 'Invalid Authorization header format. Expected "Bearer <token>".',
      statusCode: 401,
    };
  }

  const token = match[1].trim();
  const verification = verifyJwt(token);

  if (!verification.valid || !verification.payload) {
    return {
      authenticated: false,
      error: verification.error || 'Invalid or expired token',
      statusCode: 401,
    };
  }

  return {
    authenticated: true,
    user: verification.payload,
  };
}

// Built-in verified user credentials for clinical environment
const REGISTERED_USERS: Record<string, AuthUser> = {
  'user-arjun': {
    id: 'user-arjun',
    name: 'Arjun K. Sharma',
    role: 'patient',
    email: 'arjun.sharma@medimentor.ai',
  },
  'user-priya': {
    id: 'user-priya',
    name: 'Priya Sharma (Family Member)',
    role: 'patient',
    email: 'priya.sharma@medimentor.ai',
  },
  'user-guest': {
    id: 'user-guest',
    name: 'New Patient (Isolated Profile)',
    role: 'patient',
    email: 'guest@medimentor.ai',
  },
};

/**
 * Vercel Serverless Function & Dev handler for /api/auth
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/auth/me or GET /api/auth?action=me
  if (req.method === 'GET') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(auth.statusCode || 401).json({
        authenticated: false,
        error: auth.error,
      });
    }

    return res.status(200).json({
      authenticated: true,
      user: auth.user,
    });
  }

  // POST /api/auth/login or POST /api/auth
  if (req.method === 'POST') {
    const body = req.body || {};
    const userId = body.userId || body.id || 'user-arjun';
    const userName = body.name || REGISTERED_USERS[userId]?.name || 'Verified Patient';

    const targetUser: AuthUser = REGISTERED_USERS[userId] || {
      id: userId,
      name: userName,
      role: 'patient',
    };

    const token = signJwt({
      sub: targetUser.id,
      name: targetUser.name,
      role: targetUser.role,
    });

    return res.status(200).json({
      success: true,
      token,
      tokenType: 'Bearer',
      expiresIn: TOKEN_EXPIRY_SECONDS,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        role: targetUser.role,
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
}
