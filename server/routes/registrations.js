import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, asyncHandler } from '../middleware.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRoster(roster) {
  if (!Array.isArray(roster)) return [];
  return roster
    .filter((p) => p && (p.name || p.tag))
    .map((p) => ({ name: String(p.name || '').trim(), tag: String(p.tag || '').trim() }))
    .slice(0, 12);
}

// List registrations for a tournament
router.get('/tournaments/:tournamentId/registrations', asyncHandler(async (req, res) => {
  const rows = await db.all(
    'SELECT * FROM registrations WHERE tournament_id = ? ORDER BY created_at ASC',
    [req.params.tournamentId]
  );
  res.json(rows.map((r) => ({ ...r, roster: JSON.parse(r.roster) })));
}));

// Register a team/player (public)
router.post('/tournaments/:tournamentId/registrations', asyncHandler(async (req, res) => {
  const tournament = await db.get('SELECT * FROM tournaments WHERE id = ?', [req.params.tournamentId]);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const { team_name, captain_name, email, contact = '', roster = [] } = req.body;

  const errors = [];
  if (!team_name || !String(team_name).trim()) errors.push('Team name is required.');
  if (!captain_name || !String(captain_name).trim()) errors.push('Captain name is required.');
  if (!email || !EMAIL_RE.test(String(email))) errors.push('A valid email is required.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  if (tournament.status !== 'open') {
    return res.status(400).json({ error: 'Registration for this tournament is closed.' });
  }
  if (tournament.registration_deadline) {
    // A date-only deadline is inclusive of the deadline day itself.
    const deadline = new Date(`${tournament.registration_deadline}T23:59:59`);
    if (!Number.isNaN(deadline) && deadline < new Date()) {
      return res.status(400).json({ error: 'The registration deadline has passed.' });
    }
  }

  // Count check + insert are atomic: the whole block runs inside a transaction
  // (both drivers), and a functional unique index backstops duplicate names.
  let saved;
  try {
    saved = await db.withTransaction(async (tx) => {
      const count = await tx.get(
        "SELECT COUNT(*) AS n FROM registrations WHERE tournament_id = ? AND status = 'confirmed'",
        [tournament.id]
      );
      if (count && count.n >= tournament.max_teams) {
        const err = new Error('The tournament is already full. Better luck next time!');
        err.status = 400;
        throw err;
      }
      const result = await tx.run(
        `INSERT INTO registrations (tournament_id, team_name, captain_name, email, contact, roster, status)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
        [
          tournament.id,
          String(team_name).trim(),
          String(captain_name).trim(),
          String(email).trim(),
          String(contact).trim(),
          JSON.stringify(parseRoster(roster)),
        ]
      );
      return tx.get('SELECT * FROM registrations WHERE id = ?', [result.lastInsertRowid]);
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.message && /UNIQUE|duplicate key/i.test(err.message)) {
      return res.status(400).json({ error: 'That team name is already taken for this tournament.' });
    }
    throw err;
  }

  res.status(201).json({ ...saved, roster: parseRoster(roster) });
}));

// Remove a registration (admin)
router.delete('/registrations/:id', requireAdmin, asyncHandler(async (req, res) => {
  const result = await db.run('DELETE FROM registrations WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Registration not found' });
  res.json({ ok: true });
}));

export default router;
