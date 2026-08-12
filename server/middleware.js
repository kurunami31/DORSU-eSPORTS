// Simple admin gate: the client sends the passcode in the x-admin-key header.
export const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'stallions';

export function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key');
  if (!key || key !== ADMIN_PASSCODE) {
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

export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}
