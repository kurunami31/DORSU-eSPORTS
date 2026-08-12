import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, asyncHandler } from '../middleware.js';
import { ValidationError, optionalStr } from '../validate.js';

const router = Router();

// All routes here are super-admin only.
router.use(requireAdmin);

// ── Rich statistics for the admin overview ─────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const [counts, byStatus, byGame, gameTeams, recent, deadlines, top] =
    await Promise.all([
      db.get(`
        SELECT
          (SELECT COUNT(*) FROM tournaments) AS tournaments,
          (SELECT COUNT(*) FROM tournaments WHERE status = 'open') AS open,
          (SELECT COUNT(*) FROM tournaments WHERE status IN ('locked','active')) AS live,
          (SELECT COUNT(*) FROM tournaments WHERE status = 'finished') AS finished,
          (SELECT COUNT(*) FROM registrations WHERE status = 'confirmed') AS teams,
          (SELECT COALESCE(SUM(max_teams), 0) FROM tournaments) AS capacity,
          (SELECT COUNT(*) FROM announcements) AS announcements,
          (SELECT COUNT(*) FROM users WHERE role = 'player') AS players
      `),
      db.all('SELECT status, COUNT(*) AS n FROM tournaments GROUP BY status'),
      db.all('SELECT game, COUNT(*) AS n FROM tournaments GROUP BY game ORDER BY n DESC'),
      db.all(`
        SELECT t.game, COUNT(r.id) AS teams
        FROM registrations r JOIN tournaments t ON t.id = r.tournament_id
        WHERE r.status = 'confirmed'
        GROUP BY t.game ORDER BY teams DESC
      `),
      db.all(`
        SELECT r.team_name, r.captain_name, r.created_at, t.name AS tournament
        FROM registrations r JOIN tournaments t ON t.id = r.tournament_id
        WHERE r.status = 'confirmed'
        ORDER BY r.id DESC LIMIT 6
      `),
      db.all(`
        SELECT id, name, registration_deadline
        FROM tournaments
        WHERE status = 'open' AND registration_deadline IS NOT NULL
          AND registration_deadline >= ?
        ORDER BY registration_deadline ASC LIMIT 6
      `, [today]),
      db.all(`
        SELECT t.id, t.name, t.status, COUNT(r.id) AS teams
        FROM tournaments t
        LEFT JOIN registrations r ON r.tournament_id = t.id AND r.status = 'confirmed'
        GROUP BY t.id
        ORDER BY teams DESC, t.id DESC LIMIT 5
      `),
    ]);

  const byGameMap = new Map(byGame.map((g) => [g.game, g.n]));
  const byGameCombined = gameTeams.map((g) => ({
    game: g.game,
    tournaments: byGameMap.get(g.game) || 0,
    teams: g.teams,
  }));

  res.json({
    ...counts,
    fillRate: counts.capacity > 0 ? Math.round((counts.teams / counts.capacity) * 100) : 0,
    byGame: byGameCombined,
    byStatus,
    recent,
    deadlines,
    top,
  });
}));

// ── Player accounts ────────────────────────────────────────
router.get('/users', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const like = `%${q}%`;

  const base = `
    SELECT u.id, u.name, u.username, u.email, u.role, u.created_at,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.email = u.email AND r.status = 'confirmed') AS registrations
    FROM users u
  `;

  const rows = q
    ? await db.all(
        `${base}
         WHERE LOWER(u.name) LIKE LOWER(?)
            OR LOWER(u.email) LIKE LOWER(?)
            OR LOWER(COALESCE(u.username, '')) LIKE LOWER(?)
         ORDER BY u.created_at DESC`,
        [like, like, like]
      )
    : await db.all(`${base} ORDER BY u.created_at DESC`);

  res.json(rows);
}));

// ── Delete a player account (super admins are protected) ───
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid user id.');

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  const result = await db.run("DELETE FROM users WHERE id = ? AND role != 'admin'", [id]);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Player account not found.' });
  }
  res.json({ ok: true });
}));

// ── Live maintenance control ───────────────────────────────
router.put('/maintenance', asyncHandler(async (req, res) => {
  // Strict flag parsing — Boolean('false') would be true.
  const raw = String(req.body.enabled ?? '').trim().toLowerCase();
  const enabled = ['1', 'true', 'on', 'yes'].includes(raw);
  const message = optionalStr(req.body.message, { name: 'Message', max: 500 }) ?? '';

  await db.run(
    `INSERT INTO settings (key, value) VALUES ('maintenance', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [enabled ? '1' : '0']
  );
  await db.run(
    `INSERT INTO settings (key, value) VALUES ('maintenance_message', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [message]
  );

  res.json({ maintenance: enabled, message: message || null });
}));

export default router;
