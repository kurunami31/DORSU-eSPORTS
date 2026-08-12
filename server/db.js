// Unified database access.
// - DATABASE_URL set  → Supabase Postgres (production / hosted)
// - DATABASE_URL unset → built-in SQLite (local development)
//
// Both drivers expose the same async interface: all/get/run/exec/withTransaction,
// and produce identical JSON payloads.

const usePostgres = Boolean(process.env.DATABASE_URL);

export const db = usePostgres
  ? (await import('./drivers/postgres.js')).default
  : (await import('./drivers/sqlite.js')).default;

export const DB_KIND = db.kind;

// Ensure the schema exists (idempotent — safe to run on every boot).
await db.init();
