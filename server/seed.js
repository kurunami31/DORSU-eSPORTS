import { db } from './db.js';
import { hashPassword } from './auth.js';
import { pathToFileURL } from 'node:url';

// Super admin account (role-based — replaces the old shared passcode).
// Change these before a fresh seed if you want different credentials.
export const SUPER_ADMIN = {
  username: 'esportadmin',
  email: 'esportadmin@dorsu.edu.ph',
  password: 'dorsuesports2026',
  name: 'DOrSU eSPORTS Admin',
};

async function insertSuperAdmin() {
  await db.run(
    `INSERT INTO users (name, username, email, password_hash, role)
     VALUES (?, ?, ?, ?, 'admin')`,
    [SUPER_ADMIN.name, SUPER_ADMIN.username, SUPER_ADMIN.email, hashPassword(SUPER_ADMIN.password)]
  );
}

export async function runSeed() {
  await db.exec(`
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS matches;
    DROP TABLE IF EXISTS registrations;
    DROP TABLE IF EXISTS announcements;
    DROP TABLE IF EXISTS tournaments;
  `);
  await db.init();

  // ── Super admin account ─────────────────────────────────────
  // The database starts empty on purpose: no demo tournaments, teams,
  // matches, or announcements. Everything else is created from the admin
  // panel. Additional super admin / moderator accounts can also be created
  // from the panel (Accounts tab).
  await insertSuperAdmin();

  return {
    tournaments: 0,
    registrations: 0,
    matches: 0,
    announcements: 0,
    users: 1,
  };
}

// Run directly: `npm run seed`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeed()
    .then((summary) => console.log('[ok] Database seeded:', summary))
    .catch((err) => {
      console.error('[err] Seed failed:', err);
      process.exit(1);
    });
}