import { Router } from 'express';
import { db } from '../db.js';
import { requireStaff, asyncHandler, isStaff } from '../middleware.js';
import { ValidationError, requiredStr, validEmail, parseRoster } from '../validate.js';

const router = Router();

// Fields shown to the public. Email/contact/roster are private — admin only.
const PUBLIC_FIELDS = 'id, tournament_id, team_name, captain_name, entry_type, created_at';

// List registrations for a tournament
router.get('/tournaments/:tournamentId/registrations', asyncHandler(async (req, res) => {
  if (await isStaff(req)) {
    const rows = await db.all(
      'SELECT * FROM registrations WHERE tournament_id = ? ORDER BY created_at ASC',
      [req.params.tournamentId]
    );
    return res.json(rows.map((r) => ({ ...r, roster: JSON.parse(r.roster || '[]') })));
  }
  const rows = await db.all(
    `SELECT ${PUBLIC_FIELDS} FROM registrations WHERE tournament_id = ? ORDER BY created_at ASC`,
    [req.params.tournamentId]
  );
  res.json(rows);
}));

// Register a team/player (public)
router.post('/tournaments/:tournamentId/registrations', asyncHandler(async (req, res) => {
  const tournament = await db.get('SELECT * FROM tournaments WHERE id = ?', [req.params.tournamentId]);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const entryType = String(req.body.entry_type || 'team').trim().toLowerCase();
  if (entryType !== 'team' && entryType !== 'solo') {
    throw new ValidationError('Registration type must be team or solo.');
  }

  // Solo = one individual taking a slot. 'team_name' carries their in-game
  // tag/ID and the roster is exactly one entry (the player themself).
  const teamName = requiredStr(req.body.team_name, {
    name: entryType === 'solo' ? 'In-game tag' : 'Team name',
    min: 2,
    max: 50,
  });
  const captain = requiredStr(req.body.captain_name, {
    name: entryType === 'solo' ? 'Player name' : 'Captain name',
    min: 2,
    max: 60,
  });
  const email = validEmail(req.body.email);
  const contact = req.body.contact === undefined || req.body.contact === null
    ? ''
    : String(req.body.contact).trim().slice(0, 30).replace(/[^\d+\-\s]/g, '');

  const maxRoster = tournament.team_size > 1
    ? Math.max(tournament.team_size * 2, tournament.team_size + 3)
    : 1;
  const roster = entryType === 'solo'
    ? [{ name: captain, tag: teamName }]
    : parseRoster(req.body.roster, { maxEntries: maxRoster });

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

  // Atomic slot enforcement: the INSERT only runs while the confirmed-slot
  // count is below max_teams, evaluated in the same statement — safe even with
  // multiple serverless instances. A unique index backstops duplicate names.
  let saved;
  try {
    saved = await db.withTransaction(async (tx) => {
      const result = await tx.run(
        `INSERT INTO registrations (tournament_id, team_name, captain_name, email, contact, roster, status, entry_type)
         SELECT ?, ?, ?, ?, ?, ?, 'confirmed', ?
         WHERE (SELECT COUNT(*) FROM registrations WHERE tournament_id = ? AND status = 'confirmed')
               < (SELECT max_teams FROM tournaments WHERE id = ?)`,
        [
          tournament.id,
          teamName,
          captain,
          email,
          contact,
          JSON.stringify(roster),
          entryType,
          tournament.id,
          tournament.id,
        ]
      );
      if (result.changes === 0) {
        const err = new ValidationError('The tournament is already full. Better luck next time!');
        throw err;
      }
      return tx.get('SELECT * FROM registrations WHERE id = ?', [result.lastInsertRowid]);
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.message && /UNIQUE|duplicate key/i.test(err.message)) {
      // Teams dedupe by name; solo entries dedupe by email.
      return res.status(400).json({
        error: entryType === 'solo'
          ? 'You are already registered for this tournament.'
          : 'That team name is already taken for this tournament.',
      });
    }
    throw err;
  }

  res.status(201).json({ ...saved, roster });
}));

// Remove a registration (staff — moderators police the team lists)
router.delete('/registrations/:id', requireStaff, asyncHandler(async (req, res) => {
  const result = await db.run('DELETE FROM registrations WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Registration not found' });
  res.json({ ok: true });
}));

export default router;
