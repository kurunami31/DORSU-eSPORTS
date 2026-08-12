import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler } from '../middleware.js';
import { ValidationError, requiredStr, validEmail } from '../validate.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  bearerToken,
  requireAuth,
} from '../auth.js';

const router = Router();

const USER_FIELDS = 'id, name, username, email, role, created_at';

// Fixed scrypt output used to equalize login timing for unknown emails.
const DUMMY_HASH = hashPassword('dummy-constant-password');

// Password policy: 8–128 chars with at least one letter and one digit.
function checkPassword(value) {
  const s = requiredStr(value, { name: 'Password', min: 8, max: 128 });
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) {
    throw new ValidationError('Password must contain at least one letter and one number.');
  }
  return s;
}

const toPublicUser = (u) =>
  u ? { id: u.id, name: u.name, username: u.username, email: u.email, role: u.role, created_at: u.created_at } : null;

// Sign up — creates the account and returns a session token.
router.post('/signup', asyncHandler(async (req, res) => {
  const name = requiredStr(req.body.name, { name: 'Name', min: 2, max: 60 });
  const email = validEmail(req.body.email);
  const password = checkPassword(req.body.password);

  let userId;
  try {
    const r = await db.run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, hashPassword(password)]
    );
    userId = Number(r.lastInsertRowid);
  } catch (err) {
    // UNIQUE(email) race or duplicate — don't leak which field collided.
    if (err.message && /unique|duplicate/i.test(err.message)) {
      throw new ValidationError('An account with that email already exists. Try signing in.');
    }
    throw err;
  }

  const token = await createSession(userId);
  const user = await db.get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [userId]);
  res.status(201).json({ token, user: toPublicUser(user) });
}));

// Sign in — verifies credentials, returns a fresh session token.
// A single generic message prevents account enumeration.
router.post('/login', asyncHandler(async (req, res) => {
  const email = validEmail(req.body.email);
  const password = String(req.body.password ?? '');

  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  // Always run a full scrypt — against the real hash when the account exists,
  // against a fixed dummy hash otherwise — so response timing never reveals
  // whether an email is registered.
  const valid = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

  if (!valid) {
    throw new ValidationError('Invalid email or password.');
  }

  const token = await createSession(user.id);
  res.json({ token, user: toPublicUser(user) });
}));

// Super admin sign-in — username + password for /admin. Player accounts can
// never reach this role, and unknown usernames run a dummy scrypt so the
// response timing never reveals which usernames exist.
router.post('/admin-login', asyncHandler(async (req, res) => {
  const username = requiredStr(req.body.username, { name: 'Username', min: 2, max: 60 }).toLowerCase();
  const password = String(req.body.password ?? '');

  const user = await db.get(
    "SELECT * FROM users WHERE LOWER(username) = ? AND role = 'admin'",
    [username]
  );
  const valid = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

  if (!valid) {
    throw new ValidationError('Invalid admin username or password.');
  }

  const token = await createSession(user.id);
  res.json({ token, user: toPublicUser(user) });
}));

// Sign out — invalidates the current session token.
router.post('/logout', asyncHandler(async (req, res) => {
  await destroySession(bearerToken(req));
  res.json({ ok: true });
}));

// Current user — requires a valid session.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

export default router;
