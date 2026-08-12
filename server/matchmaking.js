// ─────────────────────────────────────────────────────────────
// Matchmaking engine — single-elimination bracket generation
// Works with any driver implementing the unified async DB interface.
// ─────────────────────────────────────────────────────────────

export function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a full single-elimination bracket for a tournament's
 * confirmed registrations. Teams are randomly drawn (shuffled).
 * Byes are distributed so no first-round match contains two byes.
 * Runs inside a transaction so a crash can't leave a half-bracket.
 */
export async function generateBrackets(db, tournamentId) {
  const teams = (
    await db.all(
      "SELECT id FROM registrations WHERE tournament_id = ? AND status = 'confirmed'",
      [tournamentId]
    )
  ).map((t) => t.id);

  if (teams.length < 2) {
    const err = new Error('At least 2 registered teams are required to generate brackets.');
    err.status = 400;
    throw err;
  }

  const slots = nextPowerOfTwo(teams.length);
  const byes = slots - teams.length;
  const totalRounds = Math.log2(slots);
  const drawn = shuffle(teams);

  // Build leaf slots: BYE tokens at positions 0, 2, 4, ... (at most one bye
  // per match — guaranteed because byes <= slots/2), shuffled teams fill the rest.
  const leaves = new Array(slots).fill(null);
  const byePositions = new Set();
  for (let i = 0; i < byes; i++) byePositions.add(i * 2);
  let teamIdx = 0;
  for (let i = 0; i < slots; i++) {
    leaves[i] = byePositions.has(i) ? { bye: true } : { teamId: drawn[teamIdx++] };
  }

  await db.withTransaction(async (tx) => {
    await tx.run('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);

    // Round 1
    for (let p = 0; p < slots / 2; p++) {
      const a = leaves[p * 2];
      const b = leaves[p * 2 + 1];
      const aIsBye = a.bye;
      const bIsBye = b.bye;
      let winner = null;
      let status = 'pending';
      if (aIsBye && !bIsBye) { winner = b.teamId; status = 'bye'; }
      else if (bIsBye && !aIsBye) { winner = a.teamId; status = 'bye'; }
      await tx.run(
        `INSERT INTO matches (tournament_id, round, position, team_a_id, team_a_source, team_b_id, team_b_source, winner_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tournamentId, 1, p, aIsBye ? null : a.teamId, null, bIsBye ? null : b.teamId, null, winner, status]
      );
    }

    // Subsequent rounds — slots reference the winner of the previous round
    for (let r = 2; r <= totalRounds; r++) {
      const matchCount = slots / Math.pow(2, r);
      for (let p = 0; p < matchCount; p++) {
        await tx.run(
          `INSERT INTO matches (tournament_id, round, position, team_a_id, team_a_source, team_b_id, team_b_source, winner_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tournamentId, r, p, null, `winner:${r - 1}:${p * 2}`, null, `winner:${r - 1}:${p * 2 + 1}`, null, 'pending']
        );
      }
    }

    // Lock registration once brackets are set
    await tx.run(
      `UPDATE tournaments SET status = CASE WHEN status IN ('open','locked') THEN 'locked' ELSE status END WHERE id = ?`,
      [tournamentId]
    );
  });

  return listMatches(db, tournamentId);
}

/** Return all matches for a tournament ordered by round/position. */
export async function listMatches(db, tournamentId) {
  return db.all(
    'SELECT * FROM matches WHERE tournament_id = ? ORDER BY round ASC, position ASC',
    [tournamentId]
  );
}

function parseSource(src) {
  const m = /^winner:(\d+):(\d+)$/.exec(src || '');
  return m ? { round: Number(m[1]), position: Number(m[2]) } : null;
}

/**
 * Resolve a bracket into human-readable rounds with team names.
 * Each match: { id, round, position, teamA, teamB, winnerId, status, isBye }
 */
export async function resolveBracket(db, tournamentId) {
  const matches = await listMatches(db, tournamentId);
  if (matches.length === 0) return null;

  const teams = new Map(
    (
      await db.all(
        'SELECT id, team_name FROM registrations WHERE tournament_id = ?',
        [tournamentId]
      )
    ).map((t) => [t.id, t.team_name])
  );

  const byKey = new Map();
  matches.forEach((m) => byKey.set(`${m.round}:${m.position}`, m));

  const winnerOf = (round, position) => {
    const m = byKey.get(`${round}:${position}`);
    return m && m.winner_id ? m.winner_id : null;
  };

  const resolveSide = (id, source) => {
    if (id) return { name: teams.get(id) || 'Unknown', teamId: id };
    const ref = parseSource(source);
    if (ref) {
      const w = winnerOf(ref.round, ref.position);
      return w ? { name: teams.get(w) || 'Unknown', teamId: w } : { name: 'TBD', teamId: null };
    }
    return { name: 'TBD', teamId: null };
  };

  const rounds = [];
  let currentRound = null;
  for (const m of matches) {
    if (!currentRound || currentRound.round !== m.round) {
      if (currentRound) rounds.push(currentRound);
      currentRound = { round: m.round, matches: [] };
    }
    const teamA = resolveSide(m.team_a_id, m.team_a_source);
    const teamB = resolveSide(m.team_b_id, m.team_b_source);
    currentRound.matches.push({
      id: m.id,
      round: m.round,
      position: m.position,
      teamA: teamA.name,
      teamB: teamB.name,
      teamAId: teamA.teamId,
      teamBId: teamB.teamId,
      winnerId: m.winner_id,
      status: m.status,
      isBye: m.status === 'bye',
    });
  }
  if (currentRound) rounds.push(currentRound);

  return { rounds, totalRounds: rounds.length };
}

/**
 * When an early-round winner is corrected after the bracket has advanced,
 * clear the winner of every match that (transitively) references it so the
 * bracket re-resolves from the corrected result.
 */
async function clearDownstream(tx, tournamentId, match) {
  const all = await tx.all('SELECT * FROM matches WHERE tournament_id = ?', [tournamentId]);
  const key = (m) => `${m.round}:${m.position}`;
  const cleared = new Set([key(match)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of all) {
      if (cleared.has(key(m))) continue;
      const refs = [m.team_a_source, m.team_b_source];
      if (refs.some((s) => s && cleared.has(s.replace('winner:', '')))) {
        if (m.winner_id !== null || m.status !== 'pending') {
          await tx.run('UPDATE matches SET winner_id = NULL, status = ? WHERE id = ?', ['pending', m.id]);
        }
        cleared.add(key(m));
        changed = true;
      }
    }
  }
}

/**
 * Record a winner for a match: propagates the winner into the next
 * round's slot, tracks round completion and crowns the champion on
 * the final round. Correcting an earlier result cascades downstream.
 */
export async function setMatchWinner(db, matchId, winnerId) {
  const match = await db.get('SELECT * FROM matches WHERE id = ?', [matchId]);
  if (!match) {
    const err = new Error('Match not found.');
    err.status = 404;
    throw err;
  }

  const allMatches = await db.all('SELECT * FROM matches WHERE tournament_id = ?', [match.tournament_id]);
  const totalRounds = Math.max(...allMatches.map((m) => m.round));

  // Validate the winner belongs to this match
  const winnerIds = [];
  if (match.team_a_id) winnerIds.push(match.team_a_id);
  if (match.team_b_id) winnerIds.push(match.team_b_id);
  for (const src of [match.team_a_source, match.team_b_source]) {
    const ref = parseSource(src);
    if (ref) {
      const w = allMatches.find((m) => m.round === ref.round && m.position === ref.position);
      if (w && w.winner_id) winnerIds.push(w.winner_id);
    }
  }
  if (!winnerIds.includes(Number(winnerId))) {
    const err = new Error('Winner is not a participant of this match.');
    err.status = 400;
    throw err;
  }

  const isCorrection = match.winner_id !== null && Number(match.winner_id) !== Number(winnerId);

  await db.withTransaction(async (tx) => {
    if (isCorrection) {
      await clearDownstream(tx, match.tournament_id, match);
    }

    await tx.run('UPDATE matches SET winner_id = ?, status = ? WHERE id = ?', [winnerId, 'complete', matchId]);

    // Propagate to next round
    if (match.round < totalRounds) {
      const nextPos = Math.floor(match.position / 2);
      const nextMatch = allMatches.find((m) => m.round === match.round + 1 && m.position === nextPos);
      if (nextMatch) {
        const source = `winner:${match.round}:${match.position}`;
        if (match.position % 2 === 0) {
          await tx.run('UPDATE matches SET team_a_source = ? WHERE id = ?', [source, nextMatch.id]);
        } else {
          await tx.run('UPDATE matches SET team_b_source = ? WHERE id = ?', [source, nextMatch.id]);
        }
      }
    }

    // Round / tournament status updates
    const roundMatches = allMatches.filter((m) => m.round === match.round);
    const roundComplete = roundMatches.every((m) => m.winner_id !== null || m.status === 'bye');

    if (isCorrection) {
      const t = await tx.get('SELECT status FROM tournaments WHERE id = ?', [match.tournament_id]);
      if (t && t.status === 'finished') {
        await tx.run("UPDATE tournaments SET status = 'active' WHERE id = ?", [match.tournament_id]);
      }
    }

    if (match.round === totalRounds && roundComplete) {
      await tx.run("UPDATE tournaments SET status = 'finished' WHERE id = ?", [match.tournament_id]);
    } else if (match.round === 1 && roundComplete) {
      const t = await tx.get('SELECT status FROM tournaments WHERE id = ?', [match.tournament_id]);
      if (t && t.status === 'locked') {
        await tx.run("UPDATE tournaments SET status = 'active' WHERE id = ?", [match.tournament_id]);
      }
    }
  });

  return db.get('SELECT * FROM matches WHERE id = ?', [matchId]);
}
