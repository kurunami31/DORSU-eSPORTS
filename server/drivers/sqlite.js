// Local-development driver: Node's built-in SQLite (zero dependencies).
// Implements the same async interface as the Postgres driver, so the
// rest of the app never knows which database is in use.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(join(DATA_DIR, 'dorsu.db'));
db.exec('PRAGMA foreign_keys = ON;');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    game TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL DEFAULT 'single-elimination',
    team_size INTEGER NOT NULL DEFAULT 5,
    max_teams INTEGER NOT NULL DEFAULT 8,
    prize TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    start_date TEXT,
    registration_deadline TEXT,
    image TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    email TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    roster TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    team_a_id INTEGER,
    team_a_source TEXT,
    team_b_id INTEGER,
    team_b_source TEXT,
    winner_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    UNIQUE(tournament_id, round, position)
  );

  -- Player accounts (login / signup)
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Bearer sessions: only a SHA-256 hash of the token is stored, so a DB
  -- leak never exposes live session tokens.
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reg_tournament ON registrations(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_unique_name
    ON registrations(tournament_id, LOWER(team_name));
`;

export default {
  kind: 'sqlite',

  async init() {
    db.exec(SCHEMA);
  },

  all(sql, params = []) {
    return db.prepare(sql).all(...params);
  },

  get(sql, params = []) {
    return db.prepare(sql).get(...params) ?? null;
  },

  run(sql, params = []) {
    const r = db.prepare(sql).run(...params);
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  },

  exec(sql) {
    db.exec(sql);
  },

  // node:sqlite is synchronous and single-connection, so a transaction is just
  // BEGIN/COMMIT around the callback — the same connection is used throughout.
  async withTransaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const out = await fn(this);
      db.exec('COMMIT');
      return out;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  },
};
