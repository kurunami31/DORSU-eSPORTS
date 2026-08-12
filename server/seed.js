import { db } from './db.js';
import { generateBrackets, listMatches, setMatchWinner } from './matchmaking.js';
import { hashPassword } from './auth.js';
import { pathToFileURL } from 'node:url';

// Super admin account (role-based — replaces the old shared passcode).
// Change these before a fresh seed if you want different credentials.
export const SUPER_ADMIN = {
  username: 'esportadmin',
  email: 'esportadmin@dorsu.edu.ph',
  password: 'dorsuesports2026',
  name: 'DOrSU eSPORTS Admin',
};

async function insertSuperAdmin() {
  await db.run(
    `INSERT INTO users (name, username, email, password_hash, role)
     VALUES (?, ?, ?, ?, 'admin')`,
    [SUPER_ADMIN.name, SUPER_ADMIN.username, SUPER_ADMIN.email, hashPassword(SUPER_ADMIN.password)]
  );
}

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function insertTournament(data) {
  const r = await db.run(
    `INSERT INTO tournaments (name, game, description, format, team_size, max_teams, prize, status, start_date, registration_deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name, data.game, data.description, data.format, data.team_size,
      data.max_teams, data.prize, data.status, data.start_date, data.registration_deadline,
    ]
  );
  return Number(r.lastInsertRowid);
}

async function insertRegistration(tournamentId, teamName, captain, email, roster) {
  const r = await db.run(
    `INSERT INTO registrations (tournament_id, team_name, captain_name, email, roster, status)
     VALUES (?, ?, ?, ?, ?, 'confirmed')`,
    [tournamentId, teamName, captain, email, JSON.stringify(roster)]
  );
  return Number(r.lastInsertRowid);
}

async function insertAnnouncement(title, body, category, pinned = 0, daysAgo = 0) {
  const created = new Date();
  created.setDate(created.getDate() - daysAgo);
  await db.run(
    'INSERT INTO announcements (title, body, category, pinned, created_at) VALUES (?, ?, ?, ?, ?)',
    [title, body, category, pinned, created.toISOString().replace('T', ' ').slice(0, 19)]
  );
}

export async function runSeed() {
  await db.exec(`
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS matches;
    DROP TABLE IF EXISTS registrations;
    DROP TABLE IF EXISTS announcements;
    DROP TABLE IF EXISTS tournaments;
  `);
  await db.init();

  // ── Super admin account ─────────────────────────────────────
  await insertSuperAdmin();

  // ── Tournaments ─────────────────────────────────────────────
  const mlbbActive = await insertTournament({
    name: 'Dawn of Legends Cup',
    game: 'Mobile Legends: Bang Bang',
    description:
      'The flagship DOrSU eSPORTS 5v5 Mobile Legends tournament. Battle through the single-elimination bracket for the championship trophy and a ₱2,000 prize pool. Open to all bona fide DOrSU students.',
    format: 'single-elimination',
    team_size: 5,
    max_teams: 8,
    prize: 'Championship trophy + ₱2,000 prize pool',
    status: 'active',
    start_date: dateOffset(7),
    registration_deadline: dateOffset(2),
  });

  const valorantOpen = await insertTournament({
    name: 'Varsity Clash',
    game: 'Valorant',
    description:
      'Tactical shooter showdown for DOrSU varsity and student gamers. 16-team single elimination, best-of-three finals. Compete for glory and a ₱3,000 prize pool.',
    format: 'single-elimination',
    team_size: 5,
    max_teams: 16,
    prize: '₱3,000 prize pool + gold medals',
    status: 'open',
    start_date: dateOffset(14),
    registration_deadline: dateOffset(5),
  });

  const tekkenOpen = await insertTournament({
    name: 'Fighting Pride',
    game: 'Tekken 8',
    description:
      '1v1 fighting game bracket. Prove your execution and mind games on the main stage. Open to all students — winners earn the title of DOrSU Fighting Champion.',
    format: 'single-elimination',
    team_size: 1,
    max_teams: 16,
    prize: 'Fighting Champion title + limited-edition jersey',
    status: 'open',
    start_date: dateOffset(10),
    registration_deadline: dateOffset(3),
  });

  const codmOpen = await insertTournament({
    name: 'Ranked Rush: CODM Invitational',
    game: 'Call of Duty: Mobile',
    description:
      'Fast-paced 5v5 action in Call of Duty: Mobile. Climb the bracket with your squad — top teams take home a ₱1,500 prize pool and bragging rights on campus.',
    format: 'single-elimination',
    team_size: 5,
    max_teams: 16,
    prize: '₱1,500 prize pool + champion banner',
    status: 'open',
    start_date: dateOffset(9),
    registration_deadline: dateOffset(4),
  });

  const mlbbOpen = await insertTournament({
    name: 'MLBB Open Qualifiers',
    game: 'Mobile Legends: Bang Bang',
    description:
      'The open qualifier for the next MLBB season. Solo and duo entries welcome — we match you into a full squad for the bracket. 5v5 single elimination, top teams advance to the main event with a ₱1,500 prize pool on the line.',
    format: 'single-elimination',
    team_size: 5,
    max_teams: 16,
    prize: '₱1,500 prize pool + main-event slots',
    status: 'open',
    start_date: dateOffset(12),
    registration_deadline: dateOffset(4),
  });

  const mlbbFinished = await insertTournament({
    name: 'Intramurals Showdown 2025',
    game: 'Mobile Legends: Bang Bang',
    description:
      'The celebrated intramurals finale. Eight teams fought through a packed gymnasium — the Stallions took it all.',
    format: 'single-elimination',
    team_size: 5,
    max_teams: 8,
    prize: 'Intramurals Championship',
    status: 'finished',
    start_date: dateOffset(-21),
    registration_deadline: dateOffset(-28),
  });

  // ── Registrations ───────────────────────────────────────────
  for (const [name, captain, email] of [
    ['DOrSU Stallions', 'Marco Reyes', 'marco.reyes@dorsu.edu.ph'],
    ['Team Izure', 'Jasmine Dela Cruz', 'jasmine.dc@dorsu.edu.ph'],
    ['Night Owls', 'Kyle Bautista', 'kyle.b@dorsu.edu.ph'],
    ['Red Dragons', 'Andrea Lim', 'andrea.lim@dorsu.edu.ph'],
    ['Black Falcons', 'Paolo Santos', 'paolo.s@dorsu.edu.ph'],
    ['Storm Breakers', 'Nica Ramos', 'nica.ramos@dorsu.edu.ph'],
    ['Phantom Five', 'Miguel Torres', 'miguel.t@dorsu.edu.ph'],
    ['Golden Guardians', 'Sofia Mendoza', 'sofia.m@dorsu.edu.ph'],
  ]) {
    await insertRegistration(mlbbActive, name, captain, email, [
      { name: captain, tag: name.toLowerCase().replace(/[^a-z0-9]/g, '') },
      { name: 'Player 2', tag: 'p2_' + name.toLowerCase().replace(/[^a-z0-9]/g, '') },
    ]);
  }

  for (const [name, captain, email] of [
    ['Aces High', 'Liam Garcia', 'liam.g@dorsu.edu.ph'],
    ['Clutch or Kick', 'Bianca Cruz', 'bianca.c@dorsu.edu.ph'],
    ['Site Pushers', 'Josh Aquino', 'josh.a@dorsu.edu.ph'],
    ['Full Eco', 'Trisha Villanueva', 'trisha.v@dorsu.edu.ph'],
    ['Frag Factory', 'Ryan Diaz', 'ryan.d@dorsu.edu.ph'],
  ]) {
    await insertRegistration(valorantOpen, name, captain, email, [
      { name: captain, tag: 'cap_' + name.toLowerCase().replace(/[^a-z0-9]/g, '') },
    ]);
  }

  for (const [name, captain, email] of [
    ['DOrSU Stallions', 'Marco Reyes', 'marco.reyes@dorsu.edu.ph'],
    ['Team Izure', 'Jasmine Dela Cruz', 'jasmine.dc@dorsu.edu.ph'],
    ['Night Owls', 'Kyle Bautista', 'kyle.b@dorsu.edu.ph'],
    ['Red Dragons', 'Andrea Lim', 'andrea.lim@dorsu.edu.ph'],
    ['Phantom Five', 'Miguel Torres', 'miguel.t@dorsu.edu.ph'],
    ['Storm Breakers', 'Nica Ramos', 'nica.ramos@dorsu.edu.ph'],
  ]) {
    await insertRegistration(mlbbOpen, name, captain, email, [
      { name: captain, tag: name.toLowerCase().replace(/[^a-z0-9]/g, '') },
      { name: 'Squad fill', tag: 'fill_' + name.toLowerCase().replace(/[^a-z0-9]/g, '') },
    ]);
  }

  for (const [name, captain] of [
    ['Delta Unit', 'Karlo Bautista'],
    ['Ghost Squad PH', 'Ivy Manalo'],
    ['Rapid Fire', 'Jomar Salcedo'],
    ['SnD Specialists', 'Camille Ocampo'],
    ['Hardpoint Heroes', 'Dexter Cabrera'],
  ]) {
    await insertRegistration(
      codmOpen, name, captain,
      `${captain.toLowerCase().replace(/\s+/g, '.')}@dorsu.edu.ph`,
      [{ name: captain, tag: name.toLowerCase().replace(/[^a-z0-9]/g, '') }]
    );
  }

  for (const [name, captain] of [
    ['Mishima Maven', 'Renzo Padilla'],
    ['King Combo', 'Althea Flores'],
    ['Electric Wizard', 'Mark Navarro'],
    ['Blue Machine', 'Ella Santiago'],
    ['Jin Warlord', 'Carlo Domingo'],
    ['Tekken Titan', 'Paula Reyes'],
    ['Lucky Chloe', 'Gelo Mendoza'],
    ['Fist of the North', 'Aira Delos Santos'],
    ['Devil Jin Main', 'Vincent Cruz'],
    ['Bryan Fury', 'Chloe Ramirez'],
    ['Kazuya King', 'Adrian Sotto'],
    ['Rage Arts', 'Mika Torres'],
  ]) {
    await insertRegistration(
      tekkenOpen, name, captain,
      `${captain.toLowerCase().replace(/\s+/g, '.')}@dorsu.edu.ph`,
      [{ name: captain, tag: name.toLowerCase().replace(/[^a-z0-9]/g, '') }]
    );
  }

  for (const [name, captain] of [
    ['DOrSU Stallions', 'Marco Reyes'],
    ['Crimson Vipers', 'Bea Tan'],
    ['Neon Knights', 'David Ong'],
    ['Iron Fangs', 'Katrina Yap'],
    ['Cobalt Crew', 'Nathaniel Sy'],
    ['Thunder Cats', 'Jessa Manuel'],
    ['Shadow Strikers', 'Rico Chavez'],
    ['Feral Wolves', 'Diana Reyes'],
  ]) {
    await insertRegistration(mlbbFinished, name, captain, 'intramurals@dorsu.edu.ph', []);
  }

  // ── Bracket simulation ──────────────────────────────────────
  async function simulate(tournamentId, winnerIndexesByRound) {
    await generateBrackets(db, tournamentId);
    const matches = await listMatches(db, tournamentId);
    for (const [roundStr, winnerIdxs] of Object.entries(winnerIndexesByRound)) {
      const round = Number(roundStr);
      const roundMatches = matches.filter((m) => m.round === round && m.status !== 'bye');
      for (const m of roundMatches) {
        const candidateIds = [m.team_a_id, m.team_b_id].filter((x) => x !== null);
        const winnerIdx = winnerIdxs[m.position];
        if (winnerIdx !== undefined && candidateIds.length === 2) {
          await setMatchWinner(db, m.id, candidateIds[winnerIdx]);
        }
      }
    }
  }

  await simulate(mlbbFinished, { 1: [0, 0, 1, 0], 2: [0, 0], 3: [0] });
  await simulate(mlbbActive, { 1: [0, 1, 0, 1], 2: [0] });

  // ── Announcements ───────────────────────────────────────────
  await insertAnnouncement(
    'Intramurals Showdown 2025: DOrSU Stallions are Champions!',
    'After an electrifying finals series in the gymnasium, the DOrSU Stallions claim the Intramurals Showdown title. Congratulations to all teams who competed — see you next season!',
    'Tournament', 1, 0
  );
  await insertAnnouncement(
    'Dawn of Legends Cup is now LIVE',
    'Brackets are out! The Dawn of Legends Cup kicks off next week. Check the tournament page for your first-round matchup and schedule.',
    'Tournament', 1, 1
  );
  await insertAnnouncement(
    'Registration for Varsity Clash is open',
    'Gather your squad of five and register for the Valorant Varsity Clash. Only 16 slots — first come, first served. Deadline is 5 days from now.',
    'General', 0, 2
  );
  await insertAnnouncement(
    'Recruitment: join the DOrSU eSPORTS varsity team',
    'Tryouts for the varsity squad are happening this month. We are scouting MLBB, Valorant, and Tekken players with competitive experience. Walk-ins welcome.',
    'Community', 0, 3
  );
  await insertAnnouncement(
    'Game patch notes: season balance update',
    'Our tournament titles are now running the latest competitive patches. Custom room settings for MLBB and Valorant have been updated accordingly.',
    'Patch', 0, 4
  );

  return {
    tournaments: (await db.get('SELECT COUNT(*) AS n FROM tournaments')).n,
    registrations: (await db.get('SELECT COUNT(*) AS n FROM registrations')).n,
    matches: (await db.get('SELECT COUNT(*) AS n FROM matches')).n,
    announcements: (await db.get('SELECT COUNT(*) AS n FROM announcements')).n,
  };
}

// Run directly: `npm run seed`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeed()
    .then((summary) => console.log('[ok] Database seeded:', summary))
    .catch((err) => {
      console.error('[err] Seed failed:', err);
      process.exit(1);
    });
}
