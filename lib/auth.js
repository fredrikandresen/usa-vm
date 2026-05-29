import { randomBytes, createHash } from 'node:crypto';

const magicLinks = [];

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a magic link token for the given email.
 * Returns the token string (to be included in the magic link URL).
 */
export function createMagicLinkToken(email) {
  const token = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(token).digest('hex');

  magicLinks.push({
    email: email.toLowerCase(),
    hashedToken,
    createdAt: Date.now(),
    used: false
  });

  return token;
}

/**
 * Verify a magic link token. Returns the email if valid, null otherwise.
 * Tokens are single-use and expire after TOKEN_EXPIRY_MS.
 */
export function verifyMagicLinkToken(token) {
  const hashedToken = createHash('sha256').update(token).digest('hex');

  const entry = magicLinks.find(
    (ml) => ml.hashedToken === hashedToken && !ml.used
  );

  if (!entry) return null;

  if (Date.now() - entry.createdAt > TOKEN_EXPIRY_MS) {
    entry.used = true;
    return null;
  }

  entry.used = true;
  return entry.email;
}

/**
 * Generate a session token for an authenticated user.
 */
export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

// In-memory session store
const sessions = new Map();

export function storeSession(token, userId) {
  sessions.set(token, { userId, createdAt: Date.now() });
}

export function getSession(token) {
  return sessions.get(token) || null;
}

export function revokeSession(token) {
  sessions.delete(token);
}

/**
 * Stub for sending magic link emails.
 * In production, replace with an actual email provider (e.g. SendGrid, Azure Communication Services).
 */
export function sendMagicLinkEmail(email, magicLinkUrl) {
  console.log(`[AUTH] Magic link email to ${email}: ${magicLinkUrl}`);
  return { sent: true, email };
}

export { magicLinks, sessions };
