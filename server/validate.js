// Shared input validation helpers. Every helper throws a 400 error with a
// user-safe message, or returns a sanitized value.

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Required, trimmed string within [min, max] characters. */
export function requiredStr(value, { name, min = 1, max = 100 }) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError(`${name} must be text.`);
  }
  const s = String(value).trim();
  if (!s) throw new ValidationError(`${name} is required.`);
  if (s.length < min) throw new ValidationError(`${name} must be at least ${min} characters.`);
  if (s.length > max) throw new ValidationError(`${name} must be at most ${max} characters.`);
  return s;
}

/** Optional, trimmed string; '' when absent. */
export function optionalStr(value, { name, max = 200 }) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError(`${name} must be text.`);
  }
  const s = String(value).trim();
  if (s.length > max) throw new ValidationError(`${name} must be at most ${max} characters.`);
  return s;
}

/** Valid email, trimmed, capped length. */
export function validEmail(value) {
  const s = requiredStr(value, { name: 'Email', min: 3, max: 120 });
  if (!EMAIL_RE.test(s)) throw new ValidationError('A valid email is required.');
  return s.toLowerCase();
}

/** Optional date string in YYYY-MM-DD form (or '' / null). */
export function optionalDate(value, { name = 'Date' } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value);
  if (!DATE_RE.test(s)) throw new ValidationError(`${name} must be a valid YYYY-MM-DD date.`);
  return s;
}

/** Integer within [min, max]. */
export function intRange(value, { name, min, max }) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`${name} must be an integer between ${min} and ${max}.`);
  }
  return n;
}

/** Roster entries: { name, tag } with per-field caps and a hard entry cap. */
export function parseRoster(roster, { maxEntries = 12 } = {}) {
  if (!Array.isArray(roster)) return [];
  return roster
    .map((p) => ({
      name: String((p && p.name) || '').trim().slice(0, 40),
      tag: String((p && p.tag) || '').trim().slice(0, 30),
    }))
    .filter((p) => p.name || p.tag)
    .slice(0, maxEntries);
}
