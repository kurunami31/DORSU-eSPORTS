import { bearerToken, userFromToken } from './auth.js';

// ── Admin authorization ───────────────────────────────────
// Admin is a role on a user account (see routes/auth.js admin-login),
// not a shared passcode. The client sends the session token the same way
// player sessions do (Authorization: Bearer <token>).

/** Async: is the request's session token an admin? (for soft-gating) */
export async function isAdmin(req) {
  const user = await userFromToken(bearerToken(req));
  return Boolean(user && user.role === 'admin');
}

/** Middleware: 401 unless the request carries a valid admin session. */
export async function requireAdmin(req, res, next) {
  try {
    const user = await userFromToken(bearerToken(req));
    if (!user) {
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
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
