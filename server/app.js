import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requireStaff, isStaff, asyncHandler, errorHandler, notFound } from './middleware.js';
import { maintenanceEnabled, maintenanceMessage } from './maintenance.js';
import tournamentsRouter from './routes/tournaments.js';
import gamesRouter from './routes/games.js';
import leaderboardRouter from './routes/leaderboard.js';
import registrationsRouter from './routes/registrations.js';
import matchesRouter from './routes/matches.js';
import announcementsRouter from './routes/announcements.js';
import statsRouter from './routes/stats.js';
import adminRouter from './routes/admin.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';

const app = express();

// Behind Vercel/Cloudflare, use the real client IP for rate limiting.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────
// CSP is enforced on the static SPA by vercel.json headers; the same policy is
// applied here for /api responses (defense in depth).
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': [],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' },
  })
);

// ── CORS: localhost for dev + any origins in CORS_ORIGIN (comma-separated).
// Same-origin requests (the deployed SPA calling /api) never need CORS headers.
const extraOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin) || extraOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(null, false); // no CORS headers → browser blocks cross-origin reads
    },
  })
);

app.use(express.json({ limit: '100kb' }));

// ── Rate limiting ───────────────────────────────────────────
const json429 = { error: 'Too many requests. Please try again later.' };
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429,
});
// Public registration endpoint — throttle spam/harvesting (POST only; the
// public GET list must never be throttled this tightly).
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429,
  skip: (req) => req.method !== 'POST',
});
// /api/admin/* — token checks are cheap, but keep a limiter for safety.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429,
});
// Every state-changing request (and admin passcode attempts).
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429,
});

// Auth brute-force surface — signup/login/logout are throttled per IP.
// GETs (e.g. /auth/me, called on every page load) are exempt so an active
// user can never be locked out by browsing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429,
  skip: (req) => req.method === 'GET',
});
// AI assistant — each call costs a third-party model, so keep it tight.
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429,
});

app.use('/api', apiLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/chat', chatLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/tournaments/:tournamentId/registrations', registerLimiter);
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE' || req.method === 'PUT') {
    return writeLimiter(req, res, next);
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────
// Maintenance mode can be driven by the MAINTENANCE_MODE / MAINTENANCE_MESSAGE
// env vars or toggled live from the admin panel (settings table).

// While maintenance is on, refuse state-changing API requests so visitors
// can't register teams or alter data mid-maintenance. Reads stay open (and
// never pay the maintenance DB check), staff keep full access to manage the
// site, and the staff login itself is the recovery path — allowed.
app.use('/api', async (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (!(await maintenanceEnabled())) return next();
  if (req.path === '/auth/admin-login') return next();
  try {
    if (await isStaff(req)) return next();
  } catch {
    /* malformed token → treat as a regular visitor */
  }
  res.status(503).json({ error: 'The site is under maintenance. Please try again later.' });
});

app.get('/api/health', asyncHandler(async (req, res) =>
  res.json({ ok: true, maintenance: await maintenanceEnabled() })
));
app.get('/api/maintenance', asyncHandler(async (req, res) =>
  res.json({
    maintenance: await maintenanceEnabled(),
    message: await maintenanceMessage(),
  })
));
app.get('/api/admin/check', requireStaff, (req, res) => res.json({ ok: true }));
app.use('/api/stats', statsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api', registrationsRouter);
app.use('/api', matchesRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
