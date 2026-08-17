import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, requireStaff, asyncHandler } from '../middleware.js';
import { ValidationError, requiredStr, optionalStr, validEmail } from '../validate.js';
import { hashPassword } from '../auth.js';

const router = Router();

// Roles that can be assigned from the panel. The super admin (admin) role is
// no longer locked to a single built-in account — staff accounts can be
// created, edited, and removed by any super admin (with safety guards).
const ROLES = ['player', 'moderator', 'admin'];

const USER_FIELDS =
  'id, name, username, email, role, bio, contact, avatar, created_at';

// Password policy shared with signup: 8–128 chars with a letter and a digit.
function checkPassword(value) {
  const s = requiredStr(value, { name: 'Password', min: 8, max: 128 });
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) {
    throw new ValidationError('Password must contain at least one letter and one number.');
  }
  return s;
}

// Staff roles sign in at /admin with a username, so one is required.
function requireUsernameForRole(role, username) {
  if (role === 'player') return null;
  return optionalStr(username, { name: 'Username', min: 2, max: 60 }) || null;
}

async function assertUsernameFree(username, excludeId) {
  if (!username) return;
  const taken = await db.get(
    'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?',
    [username, excludeId]
  );
  if (taken) throw new ValidationError('That username is already taken.');
}

async function assertEmailFree(email, excludeId) {
  const taken = await db.get(
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?',
    [email, excludeId]
  );
  if (taken) throw new ValidationError('An account with that email already exists.');
}

// The system must always keep at least one super admin.
async function assertNotLastAdmin(id, nextRole) {
  if (nextRole === 'admin') return;
  const target = await db.get('SELECT role FROM users WHERE id = ?', [id]);
  if (!target || target.role !== 'admin') return;
  const admins = await db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
  if (admins.n <= 1) {
    throw new ValidationError('Cannot demote the last super admin account — promote another account first.');
  }
}

// ── Rich statistics (staff: super admin + moderator) ───────
router.get('/stats', requireStaff, asyncHandler(async (req, res) => {
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

// Everything below is super-admin only.
router.use(requireAdmin);

// ── Player accounts ────────────────────────────────────────
router.get('/users', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const like = `%${q}%`;

  const base = `
    SELECT u.id, u.name, u.username, u.email, u.role, u.bio, u.contact, u.avatar, u.created_at,
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

// ── Create an account (player, moderator, or super admin) ──
// Super admins can provision any role from the panel — including additional
// admins and moderators — so staff accounts no longer have to be born as
// players first.
router.post('/users', asyncHandler(async (req, res) => {
  const name = requiredStr(req.body.name, { name: 'Name', min: 2, max: 60 });
  const email = validEmail(req.body.email);
  const password = checkPassword(req.body.password);
  const role = String(req.body.role || '').trim().toLowerCase();
  if (!ROLES.includes(role)) {
    throw new ValidationError('Role must be player, moderator, or admin.');
  }
  const username = requireUsernameForRole(role, req.body.username);

  await assertEmailFree(email, 0);
  await assertUsernameFree(username, 0);

  let userId;
  try {
    const r = await db.run(
      'INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, username, email, hashPassword(password), role]
    );
    userId = Number(r.lastInsertRowid);
  } catch (err) {
    if (err.message && /unique|duplicate/i.test(err.message)) {
      throw new ValidationError('An account with that email or username already exists.');
    }
    throw err;
  }

  const user = await db.get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [userId]);
  res.status(201).json(user);
}));

// ── Single account detail (super admin only) ────────────────
router.get('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid user id.');

  const user = await db.get(
    `SELECT u.id, u.name, u.username, u.email, u.role, u.bio, u.contact, u.avatar, u.created_at,
      (SELECT COUNT(*) FROM registrations r
        WHERE r.email = u.email AND r.status = 'confirmed') AS registrations
     FROM users u WHERE u.id = ?`,
    [id]
  );
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  res.json(user);
}));

// ── Update an account (super admin only) ───────────────────
// Edits name, email, username, role, and/or password. A super admin can
// never change their own role or demote/delete the last remaining admin.
router.patch('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid user id.');

  const target = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!target) return res.status(404).json({ error: 'Account not found.' });

  const isSelf = id === req.user.id;
  let role = target.role;
  if (req.body.role !== undefined) {
    if (isSelf && String(req.body.role).trim().toLowerCase() !== 'admin') {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }
    role = String(req.body.role).trim().toLowerCase();
    if (!ROLES.includes(role)) {
      throw new ValidationError('Role must be player, moderator, or admin.');
    }
  }

  await assertNotLastAdmin(id, role);

  const name = req.body.name !== undefined
    ? requiredStr(req.body.name, { name: 'Name', min: 2, max: 60 })
    : target.name;
  const email = req.body.email !== undefined ? validEmail(req.body.email) : target.email;
  const username = req.body.username !== undefined
    ? requireUsernameForRole(role, req.body.username)
    : target.username;

  if (String(email).toLowerCase() !== String(target.email || '').toLowerCase()) {
    await assertEmailFree(email, id);
  }
  if (String(username || '').toLowerCase() !== String(target.username || '').toLowerCase()) {
    await assertUsernameFree(username, id);
  }

  let passwordHash = target.password_hash;
  if (req.body.password !== undefined && req.body.password !== '') {
    passwordHash = hashPassword(checkPassword(req.body.password));
  }

  await db.run(
    'UPDATE users SET name = ?, username = ?, email = ?, role = ?, password_hash = ? WHERE id = ?',
    [name, username, email, role, passwordHash, id]
  );

  const user = await db.get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [id]);
  res.json(user);
}));

// ── Change an account's role (super admin only) ─────────────
// Kept for backwards compatibility with the panel's inline role editor.
// Your own role can never be changed from the panel — that guard keeps an
// admin from accidentally locking themselves out.
router.patch('/users/:id/role', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid user id.');

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }

  const role = String(req.body.role || '').trim().toLowerCase();
  if (!ROLES.includes(role)) {
    throw new ValidationError('Role must be player, moderator, or admin.');
  }

  await assertNotLastAdmin(id, role);

  const target = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!target) return res.status(404).json({ error: 'Account not found.' });

  // Staff accounts sign in at /admin with a username. Collect one when
  // promoting (or keep the existing one) so a fresh staff member isn't left
  // without a way into the panel.
  let username = target.username;
  if (role !== 'player' && req.body.username !== undefined) {
    username = requireUsernameForRole(role, req.body.username);
  }
  await assertUsernameFree(username, id);

  await db.run('UPDATE users SET role = ?, username = ? WHERE id = ?', [role, username, id]);

  const user = await db.get(
    `SELECT ${USER_FIELDS} FROM users WHERE id = ?`,
    [id]
  );
  res.json(user);
}));

// ── Delete an account (super admins can be removed too) ────
// Guards: you can never delete yourself, and the last remaining super admin
// can never be deleted.
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid user id.');

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  await assertNotLastAdmin(id, 'player');

  const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Account not found.' });
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
