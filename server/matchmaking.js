// ─────────────────────────────────────────────────────────────
// Matchmaking engine — single-elimination, round-robin, and
// double-elimination schedule generation.
// Works with any driver implementing the unified async DB interface.
//
// Match rows carry a `phase` column:
//   'winners'     — single-elimination / double-elim winners bracket
//   'losers'      — double-elim losers bracket
//   'final'       — double-elim grand final
//   'round-robin' — round-robin schedule
// Sources reference other matches as `winner:round:position` (winner of a
// match — any phase) or `loser:round:position` (loser of a winners-bracket
// match). Round numbers never collide across phases (winners 1..k, losers
// k+1.., final last).
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

const FORMAT_ROUND_ROBIN = 'round-robin';
const FORMAT_DOUBLE_ELIM = 'double-elimination';

async function fetchFormat(db, tournamentId) {
  const t = await db.get('SELECT format FROM tournaments WHERE id = ?', [tournamentId]);
  return (t && t.format) || 'single-elimination';
}

async function insertMatch(tx, tournamentId, phase, round, position, teamA, teamB) {
  // teamA/teamB: { id } or { source } or null (byes are expressed as null id
  // with no source; the winner is set later by the engine).
  await tx.run(
    `INSERT INTO matches (tournament_id, phase, round, position, team_a_id, team_a_source, team_b_id, team_b_source, winner_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      tournamentId, phase, round, position,
      teamA && teamA.id != null ? teamA.id : null,
      teamA && teamA.source ? teamA.source : null,
      teamB && teamB.id != null ? teamB.id : null,
      teamB && teamB.source ? teamB.source : null,
      null,
    ]
  );
}

/**
 * Generate a full single-elimination bracket. Teams are randomly drawn.
 * Byes are distributed so no first-round match contains two byes.
 */
async function generateSingleElim(tx, tournamentId, teams) {
  const slots = nextPowerOfTwo(teams.length);
  const byes = slots - teams.length;
  const totalRounds = Math.log2(slots);
  const drawn = shuffle(teams);

  const leaves = new Array(slots).fill(null);
  const byePositions = new Set();
  for (let i = 0; i < byes; i++) byePositions.add(i * 2);
  let teamIdx = 0;
  for (let i = 0; i < slots; i++) {
    leaves[i] = byePositions.has(i) ? { bye: true } : { teamId: drawn[teamIdx++] };
  }

  // Round 1
  for (let p = 0; p < slots / 2; p++) {
    const a = leaves[p * 2];
    const b = leaves[p * 2 + 1];
    const aIsBye = a.bye;
    const bIsBye = b.bye;
    const winner = aIsBye && !bIsBye ? b.teamId : bIsBye && !aIsBye ? a.teamId : null;
    await tx.run(
      `INSERT INTO matches (tournament_id, phase, round, position, team_a_id, team_a_source, team_b_id, team_b_source, winner_id, status)
       VALUES (?, 'winners', 1, ?, ?, NULL, ?, NULL, ?, ?)`,
      [tournamentId, p, aIsBye ? null : a.teamId, bIsBye ? null : b.teamId, winner, winner ? 'bye' : 'pending']
    );
  }

  // Subsequent rounds — slots reference the winner of the previous round
  for (let r = 2; r <= totalRounds; r++) {
    const matchCount = slots / Math.pow(2, r);
    for (let p = 0; p < matchCount; p++) {
      await insertMatch(tx, tournamentId, 'winners', r, p,
        { source: `winner:${r - 1}:${p * 2}` },
        { source: `winner:${r - 1}:${p * 2 + 1}` }
      );
    }
  }
}

/**
 * Generate a round-robin schedule (circle method): every team plays every
 * other team once. With an odd team count, one team rests each round and the
 * rest match is skipped entirely (no fake bye match to record).
 */
async function generateRoundRobin(tx, tournamentId, teams) {
  const list = [...teams];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const totalRounds = n - 1;

  for (let r = 0; r < totalRounds; r++) {
    let pos = 0;
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== null && b !== null) {
        await insertMatch(tx, tournamentId, 'round-robin', r + 1, pos, { id: a }, { id: b });
        pos++;
      }
    }
    // Circle rotation: keep team 0 fixed, move the last team into slot 1.
    list.splice(1, 0, list.pop());
  }
}

/**
 * Generate a double-elimination bracket (no grand-final bracket reset).
 * Winners bracket is a standard single elimination; losers-bracket losers
 * drop into a losers bracket that ends with the losers final, and the
 * grand final pits the undefeated winner against the one-loss survivor.
 *
 * Layout for slots = 2^k teams:
 *   Winners: rounds 1..k (single elimination, byes in round 1)
 *   Losers:  rounds k+1..3k-3 — L1 pairs round-1 losers, L2 pairs L1 winners
 *            against round-2 losers, then pair-rounds (L3, L5, …) alternate
 *            with cross-rounds (L4, L6, …). k=2 gets one extra round so the
 *            winners-final loser still gets a losers match.
 *   Grand final: round 3k-2
 */
async function generateDoubleElim(tx, tournamentId, teams) {
  const slots = nextPowerOfTwo(teams.length);
  const byes = slots - teams.length;
  const k = Math.log2(slots);
  const drawn = shuffle(teams);

  if (slots === 2) {
    await insertMatch(tx, tournamentId, 'winners', 1, 0, { id: drawn[0] }, { id: drawn[1] });
    return;
  }

  // ── Winners bracket (rounds 1..k) — same as single elimination ──
  const leaves = new Array(slots).fill(null);
  const byePositions = new Set();
  for (let i = 0; i < byes; i++) byePositions.add(i * 2);
  let teamIdx = 0;
  for (let i = 0; i < slots; i++) {
    leaves[i] = byePositions.has(i) ? { bye: true } : { teamId: drawn[teamIdx++] };
  }

  for (let p = 0; p < slots / 2; p++) {
    const a = leaves[p * 2];
    const b = leaves[p * 2 + 1];
    const aIsBye = a.bye;
    const bIsBye = b.bye;
    const winner = aIsBye && !bIsBye ? b.teamId : bIsBye && !aIsBye ? a.teamId : null;
    await tx.run(
      `INSERT INTO matches (tournament_id, phase, round, position, team_a_id, team_a_source, team_b_id, team_b_source, winner_id, status)
       VALUES (?, 'winners', 1, ?, ?, NULL, ?, NULL, ?, ?)`,
      [tournamentId, p, aIsBye ? null : a.teamId, bIsBye ? null : b.teamId, winner, winner ? 'bye' : 'pending']
    );
  }
  for (let r = 2; r <= k; r++) {
    const matchCount = slots / Math.pow(2, r);
    for (let p = 0; p < matchCount; p++) {
      await insertMatch(tx, tournamentId, 'winners', r, p,
        { source: `winner:${r - 1}:${p * 2}` },
        { source: `winner:${r - 1}:${p * 2 + 1}` }
      );
    }
  }

  // ── Losers bracket (rounds k+1..3k-3) ──
  const lbRounds = k === 2 ? 2 : 2 * k - 3;
  for (let i = 1; i <= lbRounds; i++) {
    const round = k + i;
    const count = Math.pow(2, k - Math.ceil(i / 2) - 1);
    for (let p = 0; p < count; p++) {
      if (i === 1) {
        // Losers of winners round 1 face each other.
        await insertMatch(tx, tournamentId, 'losers', round, p,
          { source: `loser:1:${p * 2}` },
          { source: `loser:1:${p * 2 + 1}` }
        );
      } else if (i % 2 === 0) {
        // Losers-bracket survivors face losers of the next winners round.
        await insertMatch(tx, tournamentId, 'losers', round, p,
          { source: `winner:${round - 1}:${p}` },
          { source: `loser:${i / 2 + 1}:${p}` }
        );
      } else {
        // Losers-bracket survivors face each other.
        await insertMatch(tx, tournamentId, 'losers', round, p,
          { source: `winner:${round - 1}:${p * 2}` },
          { source: `winner:${round - 1}:${p * 2 + 1}` }
        );
      }
    }
  }

  // ── Grand final (round 3k-2) ──
  const gfRound = k === 2 ? 5 : 3 * k - 2;
  await insertMatch(tx, tournamentId, 'final', gfRound, 0,
    { source: `winner:${k}:0` },
    { source: `winner:${gfRound - 1}:0` }
  );
}

/**
 * Generate the schedule for a tournament's confirmed registrations,
 * matching its format. Runs inside a transaction so a crash can't leave a
 * half-generated schedule.
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

  const format = await fetchFormat(db, tournamentId);

  await db.withTransaction(async (tx) => {
    await tx.run('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);

    if (format === FORMAT_ROUND_ROBIN) {
      await generateRoundRobin(tx, tournamentId, teams);
    } else if (format === FORMAT_DOUBLE_ELIM) {
      await generateDoubleElim(tx, tournamentId, teams);
    } else {
      await generateSingleElim(tx, tournamentId, teams);
    }

    // Lock registration once the schedule is set
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
  const m = /^(winner|loser):(\d+):(\d+)$/.exec(src || '');
  return m ? { kind: m[1], round: Number(m[2]), position: Number(m[3]) } : null;
}

function indexMatches(matches) {
  const byKey = new Map();
  matches.forEach((m) => byKey.set(`${m.round}:${m.position}`, m));
  return byKey;
}

/** Winner of a match, or null when not decided. */
function winnerOf(byKey, round, position) {
  const m = byKey.get(`${round}:${position}`);
  return m && m.winner_id ? m.winner_id : null;
}

/** Resolve the winner referenced by a side (direct id or winner: source). */
function sideWinner(byKey, sideId, sideSource) {
  if (sideId !== null && sideId !== undefined) return sideId;
  const ref = parseSource(sideSource);
  return ref ? winnerOf(byKey, ref.round, ref.position) : null;
}

/**
 * Loser of a completed match, or null when the match is undecided or was a
 * bye (bye matches produce no loser). Sides may be direct team ids or
 * winner: sources, so the winner is located among the resolved sides.
 */
function loserOf(byKey, round, position) {
  const m = byKey.get(`${round}:${position}`);
  if (!m || m.status === 'bye' || !m.winner_id) return null;
  const a = sideWinner(byKey, m.team_a_id, m.team_a_source);
  const b = sideWinner(byKey, m.team_b_id, m.team_b_source);
  if (m.winner_id === a) return b;
  if (m.winner_id === b) return a;
  return null;
}

/**
 * Resolve a schedule into human-readable rounds with team names and (for
 * round-robin) standings. Each match: { id, round, position, phase, teamA,
 * teamB, teamAId, teamBId, winnerId, status, isBye }.
 */
export async function resolveBracket(db, tournamentId) {
  const matches = await listMatches(db, tournamentId);
  if (matches.length === 0) return null;

  const format = await fetchFormat(db, tournamentId);
  const byKey = indexMatches(matches);

  const teams = new Map(
    (
      await db.all(
        'SELECT id, team_name FROM registrations WHERE tournament_id = ?',
        [tournamentId]
      )
    ).map((t) => [t.id, t.team_name])
  );

  const resolveSide = (m, side) => {
    const id = side === 'a' ? m.team_a_id : m.team_b_id;
    const source = side === 'a' ? m.team_a_source : m.team_b_source;
    if (id) return { name: teams.get(id) || 'Unknown', teamId: id };
    const ref = parseSource(source);
    if (ref) {
      const w = ref.kind === 'winner'
        ? winnerOf(byKey, ref.round, ref.position)
        : loserOf(byKey, ref.round, ref.position);
      return w ? { name: teams.get(w) || 'Unknown', teamId: w } : { name: 'TBD', teamId: null };
    }
    return { name: 'TBD', teamId: null };
  };

  // Group by phase + round (round numbers already order winners < losers < final)
  const rounds = [];
  let current = null;
  for (const m of matches) {
    const key = `${m.phase}:${m.round}`;
    if (!current || current.key !== key) {
      if (current) rounds.push(current);
      current = { key, phase: m.phase, round: m.round, matches: [] };
    }
    const teamA = resolveSide(m, 'a');
    const teamB = resolveSide(m, 'b');
    current.matches.push({
      id: m.id,
      round: m.round,
      position: m.position,
      phase: m.phase,
      teamA: teamA.name,
      teamB: teamB.name,
      teamAId: teamA.teamId,
      teamBId: teamB.teamId,
      winnerId: m.winner_id,
      status: m.status,
      isBye: m.status === 'bye',
    });
  }
  if (current) rounds.push(current);

  const out = { format, rounds, totalRounds: rounds.length };

  // Round-robin standings: most wins first, then fewest losses.
  if (format === FORMAT_ROUND_ROBIN) {
    const counts = new Map();
    for (const m of matches) {
      if (!m.winner_id) continue;
      const loser = m.team_a_id === m.winner_id ? m.team_b_id : m.team_a_id;
      counts.set(m.winner_id, { w: (counts.get(m.winner_id)?.w || 0) + 1, l: counts.get(m.winner_id)?.l || 0 });
      counts.set(loser, { w: counts.get(loser)?.w || 0, l: (counts.get(loser)?.l || 0) + 1 });
    }
    out.standings = [...counts.entries()]
      .map(([teamId, c]) => ({
        teamId,
        name: teams.get(teamId) || 'Unknown',
        played: c.w + c.l,
        wins: c.w,
        losses: c.l,
        winRate: c.w + c.l > 0 ? Math.round((c.w / (c.w + c.l)) * 100) : 0,
      }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
  }

  return out;
}

/**
 * When an early-round winner is corrected after the bracket has advanced,
 * clear the winner of every match that (transitively) references it (winner
 * or loser side) so the bracket re-resolves from the corrected result.
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
      if (refs.some((s) => s && cleared.has(s.replace(/^(winner|loser):/, '')))) {
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
 * Double elimination: a losers-bracket match whose opponent side references
 * a winners-round bye (which can never produce a loser) is auto-advanced.
 * Runs after every recorded result so corrections re-apply it.
 */
async function autoCompleteLoserByes(tx, tournamentId, byKey) {
  let changed = true;
  while (changed) {
    changed = false;
    const all = await tx.all(
      "SELECT * FROM matches WHERE tournament_id = ? AND phase = 'losers' AND status = 'pending'",
      [tournamentId]
    );
    for (const m of all) {
      const sides = [];
      for (const side of ['a', 'b']) {
        const id = side === 'a' ? m.team_a_id : m.team_b_id;
        const source = side === 'a' ? m.team_a_source : m.team_b_source;
        if (id) { sides.push({ id, bye: false }); continue; }
        const ref = parseSource(source);
        if (!ref) { sides.push({ id: null, bye: false }); continue; }
        const refMatch = byKey.get(`${ref.round}:${ref.position}`);
        const isByeRef = refMatch && refMatch.status === 'bye';
        const winner = ref.kind === 'winner'
          ? winnerOf(byKey, ref.round, ref.position)
          : loserOf(byKey, ref.round, ref.position);
        sides.push({ id: winner || null, bye: isByeRef });
      }
      // Exactly one live participant and the other side can never arrive.
      const live = sides.filter((s) => s.id !== null);
      const dead = sides.filter((s) => s.id === null && s.bye);
      if (live.length === 1 && dead.length === 1) {
        await tx.run('UPDATE matches SET winner_id = ?, status = ? WHERE id = ?', [live[0].id, 'bye', m.id]);
        byKey.set(`${m.round}:${m.position}`, { ...m, winner_id: live[0].id, status: 'bye' });
        changed = true;
      }
    }
  }
}

/**
 * Record a winner for a match: propagates the winner into the next round's
 * slot, tracks round completion and crowns the champion on the final round.
 * Correcting an earlier result cascades downstream. Round-robin matches have
 * no propagation; standings are computed from results.
 */
export async function setMatchWinner(db, matchId, winnerId) {
  const match = await db.get('SELECT * FROM matches WHERE id = ?', [matchId]);
  if (!match) {
    const err = new Error('Match not found.');
    err.status = 404;
    throw err;
  }

  const format = await fetchFormat(db, match.tournament_id);
  const allMatches = await db.all(
    'SELECT * FROM matches WHERE tournament_id = ? ORDER BY round ASC, position ASC',
    [match.tournament_id]
  );
  const byKey = indexMatches(allMatches);
  const totalRounds = Math.max(...allMatches.map((m) => m.round));

  // Validate the winner belongs to this match
  const participants = [];
  if (match.team_a_id) participants.push(match.team_a_id);
  if (match.team_b_id) participants.push(match.team_b_id);
  for (const src of [match.team_a_source, match.team_b_source]) {
    const ref = parseSource(src);
    if (ref) {
      const id = ref.kind === 'winner'
        ? winnerOf(byKey, ref.round, ref.position)
        : loserOf(byKey, ref.round, ref.position);
      if (id) participants.push(id);
    }
  }
  if (!participants.includes(Number(winnerId))) {
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
    byKey.set(`${match.round}:${match.position}`, { ...match, winner_id: winnerId, status: 'complete' });

    // Double elimination: auto-advance losers-bracket byes.
    if (format === FORMAT_DOUBLE_ELIM) {
      await autoCompleteLoserByes(tx, match.tournament_id, byKey);
    }

    // Propagate winners into the next round's slot. Round-robin matches are
    // self-contained; the grand final crowns the champion directly. The
    // winners-bracket final never propagates: its winner feeds the grand
    // final's A side and its loser feeds the last losers round, both wired
    // up front (round numbers alone can't tell a k=2 winners final from a
    // k>=3 mid-round, so the phase is checked too).
    const isWbFinal = match.phase === 'winners' && match.round === winnersRounds(allMatches);
    if (format !== FORMAT_ROUND_ROBIN && match.phase !== 'final' && !isWbFinal && match.round < totalRounds) {
      const isLb = match.phase === 'losers';
      let nextPos;
      let sideIsA;
      if (isLb) {
        // Losers-bracket rounds alternate: odd-indexed rounds map 1:1 into
        // the next round's A side, even-indexed rounds halve positions.
        const lbIndex = match.round - winnersRounds(allMatches);
        if (lbIndex % 2 === 1) {
          nextPos = match.position;
          sideIsA = true;
        } else {
          nextPos = Math.floor(match.position / 2);
          sideIsA = match.position % 2 === 0;
        }
      } else {
        nextPos = Math.floor(match.position / 2);
        sideIsA = match.position % 2 === 0;
      }
      const nextMatch = byKey.get(`${match.round + 1}:${nextPos}`);
      if (nextMatch) {
        // The grand final's A side takes the winners-bracket champion and
        // its B side the losers-bracket survivor.
        let col;
        if (nextMatch.phase === 'final') {
          col = match.phase === 'losers' ? 'team_b_source' : 'team_a_source';
        } else {
          col = sideIsA ? 'team_a_source' : 'team_b_source';
        }
        await tx.run(`UPDATE matches SET ${col} = ? WHERE id = ?`, [`winner:${match.round}:${match.position}`, nextMatch.id]);
      }
    }

    // Round / tournament status updates
    const roundMatches = allMatches.filter((m) => m.round === match.round);
    const roundComplete = roundMatches.every((m) => {
      const cur = byKey.get(`${m.round}:${m.position}`) || m;
      return cur.winner_id !== null || cur.status === 'bye';
    });

    if (isCorrection) {
      const all = await tx.all('SELECT * FROM matches WHERE tournament_id = ?', [match.tournament_id]);
      const allDone = all.every((m) => m.winner_id !== null || m.status === 'bye');
      const t = await tx.get('SELECT status FROM tournaments WHERE id = ?', [match.tournament_id]);
      // A correction that left part of the schedule undecided reopens the
      // tournament; one that keeps everything decided just re-crowns.
      if (t && t.status === 'finished' && !allDone) {
        await tx.run("UPDATE tournaments SET status = 'active' WHERE id = ?", [match.tournament_id]);
      } else if (t && t.status !== 'finished' && allDone) {
        await tx.run("UPDATE tournaments SET status = 'finished' WHERE id = ?", [match.tournament_id]);
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

// Number of winners-bracket rounds (k) for a double-elimination tournament.
function winnersRounds(allMatches) {
  const wb = allMatches.filter((m) => m.phase === 'winners');
  return wb.length ? Math.max(...wb.map((m) => m.round)) : 1;
}