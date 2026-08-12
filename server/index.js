import { db, DB_KIND } from './db.js';
import { runSeed } from './seed.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // Demo data auto-seeds on first local boot (SQLite only — Supabase/Postgres
  // is seeded explicitly with `npm run seed`).
  if (DB_KIND === 'sqlite') {
    const count = await db.get('SELECT COUNT(*) AS n FROM tournaments');
    if (!count || count.n === 0) {
      console.log('[seed] First boot detected — seeding demo data…');
      console.log('[ok] Seeded:', await runSeed());
    }
  }

  app.listen(PORT, () => {
    console.log(`[api] DOrSU eSPORTS API running at http://localhost:${PORT}`);
    console.log(`   Database: ${DB_KIND === 'sqlite' ? 'SQLite (local file)' : 'Supabase Postgres'}`);
    console.log(`   Admin passcode: ${process.env.ADMIN_PASSCODE || 'stallions'} (set ADMIN_PASSCODE to change)`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
