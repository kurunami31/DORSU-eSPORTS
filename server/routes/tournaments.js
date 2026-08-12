import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, asyncHandler } from '../middleware.js';
import { generateBrackets, resolveBracket } from '../matchmaking.js';

const router = Router();

const PUBLIC_FIELDS = `
  id, name, game, description, format, team_size, max_teams, prize, status,
  start_date, registration_deadline, image, created_at
`;

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
  const {
    name, game, description = '', format = 'single-elimination',
    team_size = 5, max_teams = 8, prize = '', start_date = null,
    registration_deadline = null, image = '',
  } = req.body;

  if (!name || !game) {
    return res.status(400).json({ error: 'Name and game are required.' });
  }
  if (!Number.isInteger(Number(max_teams)) || Number(max_teams) < 2) {
    return res.status(400).json({ error: 'max_teams must be an integer of at least 2.' });
  }
  if (!Number.isInteger(Number(team_size)) || Number(team_size) < 1) {
    return res.status(400).json({ error: 'team_size must be an integer of at least 1.' });
  }

  const result = await db.run(
    `INSERT INTO tournaments (name, game, description, format, team_size, max_teams, prize, start_date, registration_deadline, image, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
    [name, game, description, format, team_size, max_teams, prize, start_date, registration_deadline, image]
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

  const allowed = [
    'name', 'game', 'description', 'format', 'team_size', 'max_teams',
    'prize', 'start_date', 'registration_deadline', 'image', 'status',
  ];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(req.body[key]);
    }
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
