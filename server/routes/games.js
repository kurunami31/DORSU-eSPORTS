import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

// Games index — one row per game that has (or has had) tournaments, with
// live aggregates and the most recent finished champion. Powers the /games
// hub page and the per-game hubs.
router.get('/', asyncHandler(async (req, res) => {
  const games = await db.all(`
    SELECT t.game,
           COUNT(*) AS tournaments,
           SUM(CASE WHEN t.status = 'open' THEN 1 ELSE 0 END) AS open_count,
           SUM(CASE WHEN t.status IN ('locked', 'active') THEN 1 ELSE 0 END) AS live_count,
           SUM(CASE WHEN t.status = 'finished' THEN 1 ELSE 0 END) AS finished_count,
           COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END), 0) AS entrants
    FROM tournaments t
    LEFT JOIN registrations r ON r.tournament_id = t.id AND r.status = 'confirmed'
    GROUP BY t.game
    ORDER BY open_count DESC, entrants DESC, t.game ASC
  `);

  // Champions of finished tournaments (winner of the final round).
  const champs = await db.all(`
    SELECT t.game, t.id AS tournament_id, t.name AS tournament_name,
           r.team_name, r.team_image, r.entry_type
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN registrations r ON r.id = m.winner_id
    WHERE t.status = 'finished'
      AND m.winner_id IS NOT NULL
      AND m.round = (SELECT MAX(round) FROM matches mm WHERE mm.tournament_id = m.tournament_id)
    ORDER BY t.id DESC
  `);

  const byGame = new Map(games.map((g) => [g.game, g]));
  for (const c of champs) {
    const g = byGame.get(c.game);
    if (!g) continue;
    if (!g.champions) g.champions = [];
    if (g.champions.length < 3) {
      g.champions.push({
        team_name: c.team_name,
        team_image: c.team_image || null,
        entry_type: c.entry_type,
        tournament_id: c.tournament_id,
        tournament_name: c.tournament_name,
      });
    }
  }
  // Games with zero entrants still deserve a champion slot array.
  for (const g of games) g.champions = g.champions || [];

  res.json(games);
}));

export default router;
