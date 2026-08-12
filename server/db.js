// Unified database access.
// - DATABASE_URL set  → Supabase Postgres (production / hosted)
// - DATABASE_URL unset → built-in SQLite (local development)
//
// Both drivers expose the same async interface: all/get/run/exec/withTransaction,
// and produce identical JSON payloads.

// Load the repo-root .env (local dev). No-op when DATABASE_URL comes from the
// environment (Vercel) or when the file doesn't exist.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'),
  quiet: true,
});

const usePostgres = Boolean(process.env.DATABASE_URL);

export const db = usePostgres
  ? (await import('./drivers/postgres.js')).default
  : (await import('./drivers/sqlite.js')).default;

export const DB_KIND = db.kind;

// Ensure the schema exists (idempotent — safe to run on every boot).
await db.init();
