// Security hardening verification suite (run against the local server).
const BASE = 'http://localhost:5000';
let pass = 0, fail = 0;

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ FAIL: ${name} ${extra}`);
  }
}

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    // Merged last: custom headers must never drop Content-Type, or express
    // won't parse the body and every handler sees an empty req.body.
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, body, headers: res.headers };
}

(async () => {
  // Super admin session (replaces the old shared passcode).
  const adm = await req('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ username: 'esportadmin', password: 'dorsuesports2026' }),
  });
  check('admin login 200', adm.status === 200);
  check('admin login returns admin role', adm.body && adm.body.user && adm.body.user.role === 'admin');
  const adminToken = adm.body ? adm.body.token : null;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  console.log('1. Privacy — public vs admin registration lists');
  const pub = await req('/api/tournaments/1/registrations');
  check('public GET 200', pub.status === 200);
  check(
    'public rows hide email/contact/roster',
    Array.isArray(pub.body) &&
      pub.body.length > 0 &&
      !('email' in pub.body[0]) &&
      !('contact' in pub.body[0]) &&
      !('roster' in pub.body[0]) &&
      'team_name' in pub.body[0],
    JSON.stringify(Object.keys(pub.body[0] || {}))
  );
  const admList = await req('/api/tournaments/1/registrations', { headers: adminHeaders });
  check('admin GET includes email + roster', admList.body && 'email' in admList.body[0] && Array.isArray(admList.body[0].roster));

  console.log('1b. Admin authorization — 401/403 without an admin session');
  check('no token → 401', (await req('/api/tournaments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Nope', game: 'X' }) })).status === 401);
  check('junk token → 401', (await req('/api/tournaments', { method: 'POST', headers: { Authorization: 'Bearer garbage-token' }, body: JSON.stringify({ name: 'Nope', game: 'X' }) })).status === 401);
  const player = await req('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Authz Player', email: `authz${Date.now()}@dorsu.edu.ph`, password: 'authzpass99' }),
  });
  check('player token → 403', player.status === 201 &&
    (await req('/api/tournaments', { method: 'POST', headers: { Authorization: `Bearer ${player.body.token}` }, body: JSON.stringify({ name: 'Nope', game: 'X' }) })).status === 403);

  console.log('1c. Moderator role — staff permissions');
  // Unique username per run — earlier runs leave demoted candidates behind,
  // so a fixed name would collide with the DB unique-index on usernames.
  const modUsername = `modtest${String(Date.now()).slice(-6)}`;
  const mod = await req('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Mod Candidate', email: `mod${Date.now()}@dorsu.edu.ph`, password: 'modpass99' }),
  });
  check('moderator candidate signup 201', mod.status === 201);
  const modId = mod.body && mod.body.user ? mod.body.user.id : null;
  const promote = await req(`/api/admin/users/${modId}/role`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ role: 'moderator', username: modUsername }),
  });
  check('admin promotes player → moderator 200', promote.status === 200 && promote.body && promote.body.role === 'moderator');
  check('promotion sets sign-in username', promote.body && promote.body.username === modUsername);
  check('staff login accepts moderator', (await req('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ username: modUsername, password: 'modpass99' }),
  })).status === 200);
  const modLogin = await req('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ username: modUsername, password: 'modpass99' }),
  });
  const modHeaders = { Authorization: `Bearer ${modLogin.body ? modLogin.body.token : ''}` };
  check('moderator creates announcement 201', (await req('/api/announcements', {
    method: 'POST', headers: modHeaders, body: JSON.stringify({ title: 'Mod note', body: 'x' }),
  })).status === 201);
  check('moderator views admin stats 200', (await req('/api/admin/stats', { headers: modHeaders })).status === 200);
  check('moderator cannot create tournament 403', (await req('/api/tournaments', {
    method: 'POST', headers: modHeaders, body: JSON.stringify({ name: 'Nope', game: 'X' }),
  })).status === 403);
  check('moderator cannot list users 403', (await req('/api/admin/users', { headers: modHeaders })).status === 403);
  check('moderator cannot change roles 403', (await req(`/api/admin/users/${modId}/role`, {
    method: 'PATCH', headers: modHeaders, body: JSON.stringify({ role: 'admin' }),
  })).status === 403);
  check('moderator cannot toggle maintenance 403', (await req('/api/admin/maintenance', {
    method: 'PUT', headers: modHeaders, body: JSON.stringify({ enabled: false }),
  })).status === 403);
  // Moderators police the team lists — create a team, then remove it.
  const policeReg = await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({ team_name: `Mod Police ${Date.now()}`, captain_name: 'Mo', email: 'modpolice@dorsu.edu.ph' }),
  });
  check('registration created for moderation test', policeReg.status === 201);
  check('moderator removes registration 200', (await req(`/api/registrations/${policeReg.body ? policeReg.body.id : 0}`, {
    method: 'DELETE', headers: modHeaders,
  })).status === 200);

  console.log('1d. Role-change guards');
  const adminId = adm.body.user.id;
  check('self-demotion rejected 400', (await req(`/api/admin/users/${adminId}/role`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ role: 'player' }),
  })).status === 400);
  check('invalid role rejected 400', (await req(`/api/admin/users/${modId}/role`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ role: 'owner' }),
  })).status === 400);
  check('duplicate username rejected 400', (await req(`/api/admin/users/${modId}/role`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ role: 'moderator', username: 'esportadmin' }),
  })).status === 400);
  check('admin demotes moderator → player 200', (await req(`/api/admin/users/${modId}/role`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ role: 'player' }),
  })).status === 200);

  console.log('1e. Solo registration — individual entries');
  const soloReg = await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({
      entry_type: 'solo',
      team_name: `SoloTag${Date.now()}`,
      captain_name: 'Solo Star',
      email: `solo${Date.now()}@dorsu.edu.ph`,
    }),
  });
  check('solo registration 201', soloReg.status === 201);
  check('solo stored with entry_type solo', soloReg.body && soloReg.body.entry_type === 'solo');
  check('solo roster is the player themself', soloReg.body && Array.isArray(soloReg.body.roster) && soloReg.body.roster.length === 1 && soloReg.body.roster[0].tag === soloReg.body.team_name);
  check('solo entry visible in public list', (await req('/api/tournaments/2/registrations')).body.some((r) => r.id === soloReg.body.id && r.entry_type === 'solo'));
  check('invalid entry_type rejected 400', (await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({ entry_type: 'squads', team_name: 'X', captain_name: 'Y', email: 'a@b.c' }),
  })).status === 400);
  // Solo dedupe is by email, NOT name — two different players may share a name.
  const sameName = `SoloTag${Date.now()}`;
  const soloA = await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({ entry_type: 'solo', team_name: sameName, captain_name: 'Solo A', email: `soloA${Date.now()}@dorsu.edu.ph` }),
  });
  check('first solo registers 201', soloA.status === 201);
  check('second solo with same name registers 201 (email-dedupe)', (await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({ entry_type: 'solo', team_name: sameName, captain_name: 'Solo B', email: `soloB${Date.now()}@dorsu.edu.ph` }),
  })).status === 201);
  check('duplicate solo email rejected 400', (await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({ entry_type: 'solo', team_name: `SoloTag${Date.now()}`, captain_name: 'Solo A2', email: soloA.body ? soloA.body.email : 'x@dorsu.edu.ph' }),
  })).status === 400);
  check('solo entry removed (admin)', (await req(`/api/registrations/${soloReg.body ? soloReg.body.id : 0}`, {
    method: 'DELETE', headers: adminHeaders,
  })).status === 200);

  console.log('1f. Profile editing — own account only');
  const pfx = `prof${Date.now()}`;
  const profUser = await req('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Profile Tester', email: `${pfx}@dorsu.edu.ph`, password: 'proftest99' }),
  });
  check('profile test signup 201', profUser.status === 201);
  const profHeaders = { Authorization: `Bearer ${profUser.body ? profUser.body.token : ''}` };
  check('profile update without token 401', (await req('/api/auth/profile', {
    method: 'PATCH', body: JSON.stringify({ name: 'Nope' }),
  })).status === 401);
  // The endpoint is scoped to the caller's own row — a body-supplied user id
  // is ignored, and one account's token can never edit another account.
  const scoped = await req('/api/auth/profile', {
    method: 'PATCH', headers: profHeaders,
    body: JSON.stringify({ name: 'Scoped Check', id: 1 }),
  });
  check('profile edits only the caller\'s own row', scoped.status === 200 &&
    scoped.body.user.name === 'Scoped Check' &&
    scoped.body.user.id === (profUser.body ? profUser.body.user.id : null));
  const upd = await req('/api/auth/profile', {
    method: 'PATCH', headers: profHeaders,
    body: JSON.stringify({ name: 'Profile Renamed', bio: 'Gold laner, MLBB & CODM.', contact: '0917 555 12ab!' }),
  });
  check('profile update 200', upd.status === 200 && upd.body && upd.body.user);
  check('name persisted', upd.body && upd.body.user.name === 'Profile Renamed');
  check('bio persisted', upd.body && upd.body.user.bio === 'Gold laner, MLBB & CODM.');
  check('contact sanitized (letters/symbols stripped)', upd.body && upd.body.user.contact === '0917 555 12');
  // Tiny valid 1×1 PNG data URL.
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const withAvatar = await req('/api/auth/profile', {
    method: 'PATCH', headers: profHeaders,
    body: JSON.stringify({ name: 'Profile Renamed', bio: 'Gold laner.', avatar: tinyPng }),
  });
  check('avatar saved 200', withAvatar.status === 200 && withAvatar.body && withAvatar.body.user.avatar === tinyPng);
  check('avatar shows on /me', (await req('/api/auth/me', { headers: profHeaders })).body.user.avatar === tinyPng);
  check('non-image avatar rejected 400', (await req('/api/auth/profile', {
    method: 'PATCH', headers: profHeaders,
    body: JSON.stringify({ name: 'Profile Renamed', bio: 'Gold laner.', avatar: 'data:text/html;base64,PGh0bWw+' }),
  })).status === 400);
  check('oversized avatar rejected 400', (await req('/api/auth/profile', {
    method: 'PATCH', headers: profHeaders,
    body: JSON.stringify({ name: 'Profile Renamed', bio: 'Gold laner.', avatar: 'data:image/png;base64,' + 'A'.repeat(100_000) }),
  })).status === 400);
  check('bio over 300 chars rejected 400', (await req('/api/auth/profile', {
    method: 'PATCH', headers: profHeaders,
    body: JSON.stringify({ name: 'Profile Renamed', bio: 'x'.repeat(301) }),
  })).status === 400);
  check('short name rejected 400', (await req('/api/auth/profile', {
    method: 'PATCH', headers: profHeaders,
    body: JSON.stringify({ name: 'A' }),
  })).status === 400);
  check('email immutable via profile', (await req('/api/auth/profile', {
    method: 'PATCH', headers: profHeaders,
    body: JSON.stringify({ name: 'Profile Renamed', email: 'evil@dorsu.edu.ph' }),
  })).body.user.email === `${pfx}@dorsu.edu.ph`);
  check('profile test account deleted (admin)', (await req(`/api/admin/users/${profUser.body ? profUser.body.user.id : 0}`, {
    method: 'DELETE', headers: adminHeaders,
  })).status === 200);

  console.log('1g. Team logo / group photo on registrations');
  const tinyPng2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const imgTag = `Logo Team ${Date.now()}`;
  const withLogo = await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({
      team_name: imgTag,
      captain_name: 'Logo Cap',
      email: `logo${Date.now()}@dorsu.edu.ph`,
      team_image: tinyPng2,
    }),
  });
  check('team registration with logo 201', withLogo.status === 201);
  check('logo persisted on registration', withLogo.body && withLogo.body.team_image === tinyPng2);
  const pubImg = await req('/api/tournaments/2/registrations');
  const pubRow = (pubImg.body || []).find((r) => r.team_name === imgTag);
  check('logo visible in public list (identification)', pubRow && pubRow.team_image === tinyPng2);
  check('non-image team logo rejected 400', (await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({
      team_name: `BadLogo ${Date.now()}`, captain_name: 'X', email: `badlogo${Date.now()}@dorsu.edu.ph`,
      team_image: 'data:text/html;base64,PGh0bWw+',
    }),
  })).status === 400);
  check('oversized team logo rejected 400', (await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({
      team_name: `HugeLogo ${Date.now()}`, captain_name: 'X', email: `hugelogo${Date.now()}@dorsu.edu.ph`,
      team_image: 'data:image/png;base64,' + 'A'.repeat(100_000),
    }),
  })).status === 400);
  // Solo entries never carry a team image (server force-clears it).
  const soloImg = await req('/api/tournaments/2/registrations', {
    method: 'POST',
    body: JSON.stringify({
      entry_type: 'solo',
      team_name: `SoloImgTag${Date.now()}`,
      captain_name: 'Solo Img',
      email: `soloimg${Date.now()}@dorsu.edu.ph`,
      team_image: tinyPng2,
    }),
  });
  check('solo registration with team_image accepted 201', soloImg.status === 201);
  check('solo entry stores no team_image', soloImg.body && soloImg.body.team_image === '');
  check('logo registration removed (admin)', (await req(`/api/registrations/${withLogo.body ? withLogo.body.id : 0}`, {
    method: 'DELETE', headers: adminHeaders,
  })).status === 200);
  check('solo-image registration removed (admin)', (await req(`/api/registrations/${soloImg.body ? soloImg.body.id : 0}`, {
    method: 'DELETE', headers: adminHeaders,
  })).status === 200);

  console.log('2. Input validation — 400s');
  const longTeam = 'T'.repeat(60);
  check(
    'long team name rejected',
    (await req('/api/tournaments/2/registrations', { method: 'POST', body: JSON.stringify({ team_name: longTeam, captain_name: 'A', email: 'a@b.c' }) })).status === 400
  );
  check(
    'bad email rejected',
    (await req('/api/tournaments/2/registrations', { method: 'POST', body: JSON.stringify({ team_name: 'OK Team', captain_name: 'A', email: 'not-an-email' }) })).status === 400
  );
  check(
    'short team name rejected',
    (await req('/api/tournaments/2/registrations', { method: 'POST', body: JSON.stringify({ team_name: 'X', captain_name: 'A', email: 'a@b.c' }) })).status === 400
  );
  check(
    'huge roster capped',
    (await req('/api/tournaments/2/registrations', {
      method: 'POST',
      body: JSON.stringify({
        // Unique per run — the DB enforces unique team names per tournament,
        // so a persistent database (Supabase) would reject a re-run otherwise.
        team_name: `Roster Cap Test ${Date.now()}`,
        captain_name: 'Cap',
        email: 'cap@dorsu.edu.ph',
        roster: Array.from({ length: 30 }, (_, i) => ({ name: `P${i}`, tag: `t${i}` })),
      }),
    })).status === 201
  );
  check(
    'invalid tournament create (bad max_teams)',
    (await req('/api/tournaments', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ name: 'Bad', game: 'X', max_teams: 1 }) })).status === 400
  );
  check(
    'invalid tournament create (name too long)',
    (await req('/api/tournaments', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ name: 'N'.repeat(90), game: 'X' }) })).status === 400
  );
  check(
    'invalid tournament create (deadline after start)',
    (await req('/api/tournaments', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ name: 'Date Bad', game: 'X', start_date: '2026-01-01', registration_deadline: '2026-02-01' }) })).status === 400
  );
  check(
    'invalid status rejected',
    (await req('/api/tournaments', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ name: 'Status Bad', game: 'X', status: 'hacked' }) })).status === 400
  );
  check(
    'announcement title too long rejected',
    (await req('/api/announcements', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ title: 'T'.repeat(200), body: 'x' }) })).status === 400
  );
  check(
    'invalid winnerId rejected',
    (await req('/api/matches/1/winner', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ winnerId: 'evil' }) })).status === 400
  );

  console.log('3. Malformed / oversized bodies');
  const mal = await fetch(BASE + '/api/tournaments/2/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  check('malformed JSON → 400 generic', mal.status === 400);
  const huge = await fetch(BASE + '/api/tournaments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ name: 'Huge', game: 'X', description: 'x'.repeat(500 * 1024) }),
  });
  check('oversized body → 413', huge.status === 413);

  console.log('4. Unknown route → 404 JSON');
  check('404', (await req('/api/definitely-not-a-route')).status === 404);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('suite error:', e);
  process.exit(1);
});
