import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, asyncHandler } from '../middleware.js';
import {
  ValidationError,
  requiredStr,
  optionalStr,
  optionalDate,
  intRange,
} from '../validate.js';
import { generateBrackets, resolveBracket } from '../matchmaking.js';

const router = Router();

const PUBLIC_FIELDS = `
  id, name, game, description, format, team_size, max_teams, prize, status,
  start_date, registration_deadline, image, created_at
`;

const FORMATS = ['single-elimination'];
const STATUSES = ['open', 'locked', 'active', 'finished'];

async function withCounts(rows) {
  const out = [];
  for (const t of rows) {
    const r = await db.get(
      "SELECT COUNT(*) AS n FROM registrations WHERE tournament_id = ? AND status = 'confirmed'",
      [t.id]
    );
    out.push({ ...t, registered_count: r ? r.n : 0 });
  }
  return out;
}

function validateTournamentInput(body, { partial = false } = {}) {
  const out = {};
  const get = (k) => body[k];

  if (!partial || get('name') !== undefined) {
    out.name = requiredStr(get('name'), { name: 'Tournament name', min: 2, max: 80 });
  }
  if (!partial || get('game') !== undefined) {
    out.game = requiredStr(get('game'), { name: 'Game', min: 2, max: 40 });
  }
  if (!partial || get('description') !== undefined) {
    out.description = optionalStr(get('description'), { name: 'Description', max: 2000 });
  }
  if (!partial || get('format') !== undefined) {
    const format = get('format') || 'single-elimination';
    if (!FORMATS.includes(format)) throw new ValidationError('Unsupported tournament format.');
    out.format = format;
  }
  if (!partial || get('team_size') !== undefined) {
    out.team_size = intRange(get('team_size') ?? 5, { name: 'Team size', min: 1, max: 10 });
  }
  if (!partial || get('max_teams') !== undefined) {
    out.max_teams = intRange(get('max_teams') ?? 8, { name: 'Max teams', min: 2, max: 64 });
  }
  if (!partial || get('prize') !== undefined) {
    out.prize = optionalStr(get('prize'), { name: 'Prize', max: 200 });
  }
  if (!partial || get('image') !== undefined) {
    out.image = optionalStr(get('image'), { name: 'Image', max: 300 });
  }
  if (!partial || get('start_date') !== undefined) {
    out.start_date = optionalDate(get('start_date'), { name: 'Start date' });
  }
  if (!partial || get('registration_deadline') !== undefined) {
    out.registration_deadline = optionalDate(get('registration_deadline'), {
      name: 'Registration deadline',
    });
  }
  if (!partial || get('status') !== undefined) {
    const status = get('status') ?? 'open';
    if (!STATUSES.includes(status)) throw new ValidationError('Invalid tournament status.');
    out.status = status;
  }

  // Registration must close before (or on) the start date.
  if (out.registration_deadline && out.start_date && out.registration_deadline > out.start_date) {
    throw new ValidationError('The registration deadline cannot be after the start date.');
  }
  return out;
}

// List tournaments
router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const rows = status
    ? await db.all(`SELECT ${PUBLIC_FIELDS} FROM tournaments WHERE status = ? ORDER BY created_at DESC`, [status])
    : await db.all(`SELECT ${PUBLIC_FIELDS} FROM tournaments ORDER BY created_at DESC`);
  res.json(await withCounts(rows));
}));

// Tournament detail
router.get('/:id', asyncHandler(async (req, res) => {
  const t = await db.get(`SELECT ${PUBLIC_FIELDS} FROM tournaments WHERE id = ?`, [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  const [detail] = await withCounts([t]);
  detail.bracket = await resolveBracket(db, t.id);
  res.json(detail);
}));

// Create tournament (admin)
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const data = validateTournamentInput(req.body);

  const result = await db.run(
    `INSERT INTO tournaments (name, game, description, format, team_size, max_teams, prize, start_date, registration_deadline, image, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
    [
      data.name, data.game, data.description, data.format, data.team_size,
      data.max_teams, data.prize, data.start_date, data.registration_deadline, data.image,
    ]
  );

  res.status(201).json({
    ...(await db.get(`SELECT ${PUBLIC_FIELDS} FROM tournaments WHERE id = ?`, [result.lastInsertRowid])),
    registered_count: 0,
  });
}));

// Update tournament (admin)
router.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const t = await db.get('SELECT * FROM tournaments WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });

  const data = validateTournamentInput(req.body, { partial: true });

  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
  values.push(t.id);
  await db.run(`UPDATE tournaments SET ${fields.join(', ')} WHERE id = ?`, values);

  res.json(await db.get(`SELECT ${PUBLIC_FIELDS} FROM tournaments WHERE id = ?`, [t.id]));
}));

// Delete tournament (admin)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const result = await db.run('DELETE FROM tournaments WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Tournament not found' });
  res.json({ ok: true });
}));

// Generate brackets (admin) — tournament matching!
router.post('/:id/generate-brackets', requireAdmin, asyncHandler(async (req, res) => {
  const t = await db.get('SELECT * FROM tournaments WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  await generateBrackets(db, t.id);
  res.json(await resolveBracket(db, t.id));
}));

// View bracket
router.get('/:id/bracket', asyncHandler(async (req, res) => {
  const t = await db.get('SELECT * FROM tournaments WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  const bracket = await resolveBracket(db, t.id);
  if (!bracket) return res.status(404).json({ error: 'Bracket has not been generated yet.' });
  res.json(bracket);
}));

export default router;
