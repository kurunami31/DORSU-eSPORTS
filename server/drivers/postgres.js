// Production driver: Supabase Postgres via node-postgres.
// Uses the transaction pooler (port 6543) recommended for serverless, a single
// connection per function instance, and normalizes payloads to match the
// SQLite driver's output so the API contract is identical.
import pg from 'pg';

const { Pool, types } = pg;

// COUNT(*) etc. arrive as bigint strings — coerce to numbers.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    email TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    roster TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
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

  -- Player accounts (login / signup). role: 'player' | 'admin' (super admin).
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Bearer sessions: only a SHA-256 hash of the token is stored, so a DB
  -- leak never exposes live session tokens.
  CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reg_tournament ON registrations(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_unique_name
    ON registrations (tournament_id, LOWER(team_name));

  -- Migration for databases created before the role/username columns existed.
  ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player';

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username));

  -- ── Lockdown (defense in depth) ───────────────────────────
  -- The app connects as the project owner (postgres.<ref>), which bypasses
  -- row-level security. Enabling RLS and revoking privileges from the public
  -- anon, authenticated and service_role roles seals the PostgREST REST API:
  -- even with a leaked anon or service key, no one can read or write our
  -- tables over HTTP. (The app never uses the REST API, only the direct PG
  -- connection, so nothing the app needs is revoked.)
  ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, service_role;
`;

// Convert SQLite-style `?` placeholders to Postgres `$1, $2, …`
function toPg(sql, params = []) {
  let i = 0;
  return { sql: sql.replace(/\?/g, () => `$${++i}`), params };
}

// Make payloads identical to the SQLite driver's output:
// Date → 'YYYY-MM-DD HH:MM:SS' (UTC), booleans → 0/1.
function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) out[k] = v.toISOString().replace('T', ' ').slice(0, 19);
    else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
    else out[k] = v;
  }
  return out;
}

async function queryAll(client, sql, params = []) {
  const { sql: s, params: p } = toPg(sql, params);
  const r = await client.query(s, p);
  return r.rows.map(normalizeRow);
}

async function queryRun(client, sql, params = []) {
  let s = sql;
  if (/^\s*INSERT/i.test(s) && !/RETURNING/i.test(s)) s += ' RETURNING id';
  const { sql: s2, params: p2 } = toPg(s, params);
  const r = await client.query(s2, p2);
  return {
    changes: r.rowCount,
    lastInsertRowid: r.rows[0] ? Number(r.rows[0].id) : null,
  };
}

export default {
  kind: 'postgres',

  async init() {
    await pool.query(SCHEMA);
  },

  all(sql, params = []) {
    return queryAll(pool, sql, params);
  },

  async get(sql, params = []) {
    const rows = await queryAll(pool, sql, params);
    return rows[0] ?? null;
  },

  run(sql, params = []) {
    return queryRun(pool, sql, params);
  },

  exec(sql) {
    return pool.query(sql);
  },

  async withTransaction(fn) {
    const client = await pool.connect();
    const tx = {
      all: (q, p = []) => queryAll(client, q, p),
      get: async (q, p = []) => (await queryAll(client, q, p))[0] ?? null,
      run: (q, p = []) => queryRun(client, q, p),
      exec: (q) => client.query(q),
    };
    try {
      await client.query('BEGIN');
      const out = await fn(tx);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* connection already broken */
      }
      throw err;
    } finally {
      client.release();
    }
  },
};
