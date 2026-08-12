// Authentication core — player accounts.
// - Passwords: scrypt (N=16384, r=8, p=1) with a per-user random salt, stored
//   as `salt:hash` hex. No third-party dependency; constant-time verification.
// - Sessions: opaque 256-bit bearer tokens. Only the SHA-256 hash of a token
//   is persisted, so a database leak never exposes live tokens. Tokens expire
//   after SESSION_DAYS and are deleted on logout.
import crypto from 'node:crypto';
import { db } from './db.js';

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };
const SESSION_DAYS = 30;

// ── Passwords ─────────────────────────────────────────────

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `${salt}:${hash.toString('hex')}`;
}

/** Constant-time password check against a `salt:hash` record. */
export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  let actual;
  try {
    actual = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  } catch {
    return false;
  }
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// ── Sessions ──────────────────────────────────────────────

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function expiresAt() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId) {
  const token = newToken();
  await db.run(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, sha256(token), expiresAt().toISOString()]
  );
  return token;
}

export async function destroySession(token) {
  if (!token) return;
  await db.run('DELETE FROM sessions WHERE token_hash = ?', [sha256(token)]);
}

/** Resolve a bearer token to a user row (or null when invalid/expired). */
export async function userFromToken(token) {
  if (!token) return null;
  const session = await db.get(
    'SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?',
    [sha256(token), new Date().toISOString()]
  );
  if (!session) return null;
  return db.get('SELECT id, name, username, email, role, created_at FROM users WHERE id = ?', [session.user_id]);
}

export function bearerToken(req) {
  const header = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : null;
}

/**
 * Express middleware: attaches req.user for a valid bearer session, or
 * responds 401. Wrap async handlers with asyncHandler when using this.
 */
export function requireAuth(req, res, next) {
  userFromToken(bearerToken(req))
    .then((user) => {
      if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
      req.user = user;
      next();
    })
    .catch(next);
}
