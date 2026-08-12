import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const [openTournaments, activeTournaments, finishedTournaments, totalTeams, announcements] =
    await Promise.all([
      db.get("SELECT COUNT(*) AS n FROM tournaments WHERE status = 'open'"),
      db.get("SELECT COUNT(*) AS n FROM tournaments WHERE status IN ('locked','active')"),
      db.get("SELECT COUNT(*) AS n FROM tournaments WHERE status = 'finished'"),
      db.get("SELECT COUNT(*) AS n FROM registrations WHERE status = 'confirmed'"),
      db.get('SELECT COUNT(*) AS n FROM announcements'),
    ]);

  res.json({
    openTournaments: openTournaments.n,
    activeTournaments: activeTournaments.n,
    finishedTournaments: finishedTournaments.n,
    totalTeams: totalTeams.n,
    announcements: announcements.n,
  });
}));

export default router;
