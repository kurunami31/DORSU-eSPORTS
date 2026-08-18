import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler } from '../middleware.js';
import { ValidationError } from '../validate.js';

const router = Router();

// Team standings across all tournaments. Wins come from completed bracket
// matches (byes don't count as wins), titles from final-round wins in
// finished tournaments. A "team" is a name identity within a game, so
// entries are merged across tournaments by (game, lowercased name).
router.get('/', asyncHandler(async (req, res) => {
  const { game, limit } = req.query;

  let regSql = `
    SELECT r.id AS rid, r.team_name, r.entry_type, r.team_image, r.tournament_id, t.game
    FROM registrations r
    JOIN tournaments t ON t.id = r.tournament_id
    WHERE r.status = 'confirmed'
  `;
  const regParams = [];
  if (game) {
    regSql += ' AND t.game = ?';
    regParams.push(game);
  }
  // Newest tournament first — when merging a team's identity across events,
  // the logo from its latest appearance wins.
  regSql += ' ORDER BY t.id DESC';
  const regs = await db.all(regSql, regParams);

  const [wins, apps, titles, rrTitles] = await Promise.all([
    db.all(
      `SELECT winner_id AS rid, COUNT(*) AS n
       FROM matches
       WHERE winner_id IS NOT NULL AND status = 'complete'
       GROUP BY winner_id`
    ),
    db.all(
      `SELECT team_id, COUNT(*) AS n FROM (
         SELECT team_a_id AS team_id FROM matches WHERE team_a_id IS NOT NULL AND status <> 'bye'
         UNION ALL
         SELECT team_b_id AS team_id FROM matches WHERE team_b_id IS NOT NULL AND status <> 'bye'
       ) x GROUP BY team_id`
    ),
    db.all(
      `SELECT m.winner_id AS rid, COUNT(*) AS n
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       WHERE t.status = 'finished' AND t.format <> 'round-robin' AND m.winner_id IS NOT NULL
         AND m.round = (SELECT MAX(round) FROM matches mm WHERE mm.tournament_id = m.tournament_id)
       GROUP BY m.winner_id`
    ),
    db.all(
      `SELECT w.winner_id AS rid, COUNT(DISTINCT w.tournament_id) AS n
       FROM (
         SELECT tournament_id, winner_id,
                RANK() OVER (PARTITION BY tournament_id ORDER BY COUNT(*) DESC) AS rk
         FROM matches
         WHERE status = 'complete' AND winner_id IS NOT NULL
         GROUP BY tournament_id, winner_id
       ) w
       JOIN tournaments t ON t.id = w.tournament_id
         AND t.status = 'finished' AND t.format = 'round-robin'
       WHERE w.rk = 1
       GROUP BY w.winner_id`
    ),
  ]);

  const winMap = new Map(wins.map((w) => [w.rid, w.n]));
  const appMap = new Map(apps.map((a) => [a.team_id, a.n]));
  const titleMap = new Map(titles.map((t) => [t.rid, t.n]));
  const rrTitleMap = new Map(rrTitles.map((t) => [t.rid, t.n]));

  // Merge per-team-name-per-game so one identity ranks once across seasons.
  const merged = new Map();
  for (const r of regs) {
    const key = `${r.game}::${r.team_name.toLowerCase()}`;
    let row = merged.get(key);
    if (!row) {
      row = {
        team_name: r.team_name,
        entry_type: r.entry_type,
        game: r.game,
        team_image: r.team_image || null,
        tournaments: 0,
        played: 0,
        wins: 0,
        titles: 0,
      };
      merged.set(key, row);
    }
    row.tournaments += 1;
    row.played += appMap.get(r.rid) || 0;
    row.wins += winMap.get(r.rid) || 0;
    row.titles += (titleMap.get(r.rid) || 0) + (rrTitleMap.get(r.rid) || 0);
    // Prefer the most recent uploaded logo.
    if (r.team_image) row.team_image = r.team_image;
  }

  const rows = [...merged.values()].map((r) => ({
    ...r,
    win_rate: r.played > 0 ? Math.round((r.wins / r.played) * 100) : 0,
  }));
  rows.sort(
    (a, b) =>
      b.titles - a.titles ||
      b.wins - a.wins ||
      b.win_rate - a.win_rate ||
      a.team_name.localeCompare(b.team_name)
  );

  let out = rows;
  if (limit !== undefined) {
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new ValidationError('Limit must be a whole number between 1 and 100.');
    }
    out = rows.slice(0, n);
  }

  res.json(out);
}));

export default router;
