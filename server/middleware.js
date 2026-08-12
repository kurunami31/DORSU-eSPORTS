import crypto from 'node:crypto';

// Admin passcode.
// - Local dev: defaults to 'stallions' for convenience.
// - Production (NODE_ENV=production, e.g. Vercel): must be set explicitly.
//   There is NO default in production — a hardcoded passcode would be
//   guessable. Admin routes refuse to work (503) until ADMIN_PASSCODE is set,
//   while the public site keeps serving.
const isProd = process.env.NODE_ENV === 'production';
export const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || (isProd ? null : 'stallions');

if (isProd && !process.env.ADMIN_PASSCODE) {
  console.warn('[security] ADMIN_PASSCODE is not set — admin routes are disabled. ' +
    'Add it to your Vercel environment variables.');
}

const ADMIN_KEY = ADMIN_PASSCODE ? Buffer.from(ADMIN_PASSCODE) : null;

// Constant-time comparison — no early exit on length/char mismatches.
export function checkAdminKey(key) {
  if (!key || !ADMIN_KEY) return false;
  const a = Buffer.from(String(key));
  const b = ADMIN_KEY;
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const isAdmin = (req) => checkAdminKey(req.get('x-admin-key'));

export function requireAdmin(req, res, next) {
  if (!ADMIN_PASSCODE) {
    return res.status(503).json({ error: 'Admin access is not configured. Set the ADMIN_PASSCODE environment variable.' });
  }
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized. Provide the admin passcode.' });
  }
  next();
}

// Express 4 doesn't catch rejected promises from async handlers.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Never leak internal error details (SQL, stack traces) to clients.
// Handled 4xx errors carry an explicit status + safe message.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // body-parser JSON syntax errors → 400 with a generic message
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' });
  }

  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message || 'Bad request' });
  }

  // Unexpected 5xx — log details server-side, respond generically.
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
