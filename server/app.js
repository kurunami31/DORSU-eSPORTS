import express from 'express';
import cors from 'cors';
import { requireAdmin, errorHandler, notFound } from './middleware.js';
import tournamentsRouter from './routes/tournaments.js';
import registrationsRouter from './routes/registrations.js';
import matchesRouter from './routes/matches.js';
import announcementsRouter from './routes/announcements.js';
import statsRouter from './routes/stats.js';

// Local dev only — the client runs on a localhost port. Tighten for production.
const app = express();
app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/admin/check', requireAdmin, (req, res) => res.json({ ok: true }));
app.use('/api/stats', statsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api', registrationsRouter);
app.use('/api', matchesRouter);
app.use('/api/announcements', announcementsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
