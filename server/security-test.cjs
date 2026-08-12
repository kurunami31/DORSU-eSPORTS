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
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
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
  const adm = await req('/api/tournaments/1/registrations', {
    headers: { 'x-admin-key': 'stallions' },
  });
  check('admin GET includes email + roster', adm.body && 'email' in adm.body[0] && Array.isArray(adm.body[0].roster));

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
        team_name: 'Roster Cap Test',
        captain_name: 'Cap',
        email: 'cap@dorsu.edu.ph',
        roster: Array.from({ length: 30 }, (_, i) => ({ name: `P${i}`, tag: `t${i}` })),
      }),
    })).status === 201
  );
  check(
    'invalid tournament create (bad max_teams)',
    (await req('/api/tournaments', { method: 'POST', headers: { 'x-admin-key': 'stallions' }, body: JSON.stringify({ name: 'Bad', game: 'X', max_teams: 1 }) })).status === 400
  );
  check(
    'invalid tournament create (name too long)',
    (await req('/api/tournaments', { method: 'POST', headers: { 'x-admin-key': 'stallions' }, body: JSON.stringify({ name: 'N'.repeat(90), game: 'X' }) })).status === 400
  );
  check(
    'invalid tournament create (deadline after start)',
    (await req('/api/tournaments', { method: 'POST', headers: { 'x-admin-key': 'stallions' }, body: JSON.stringify({ name: 'Date Bad', game: 'X', start_date: '2026-01-01', registration_deadline: '2026-02-01' }) })).status === 400
  );
  check(
    'invalid status rejected',
    (await req('/api/tournaments', { method: 'POST', headers: { 'x-admin-key': 'stallions' }, body: JSON.stringify({ name: 'Status Bad', game: 'X', status: 'hacked' }) })).status === 400
  );
  check(
    'announcement title too long rejected',
    (await req('/api/announcements', { method: 'POST', headers: { 'x-admin-key': 'stallions' }, body: JSON.stringify({ title: 'T'.repeat(200), body: 'x' }) })).status === 400
  );
  check(
    'invalid winnerId rejected',
    (await req('/api/matches/1/winner', { method: 'POST', headers: { 'x-admin-key': 'stallions' }, body: JSON.stringify({ winnerId: 'evil' }) })).status === 400
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
    headers: { 'Content-Type': 'application/json', 'x-admin-key': 'stallions' },
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
