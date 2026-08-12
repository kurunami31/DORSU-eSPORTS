// Auth endpoint verification (run against the local server).
const BASE = 'http://localhost:5000';
let pass = 0, fail = 0;

function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ok ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
}

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  return { status: res.status, body, headers: res.headers };
}

const email = `player${Date.now()}@dorsu.edu.ph`;

(async () => {
  console.log('1. Signup');
  const s = await req('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Player', email, password: 'stallion99' }),
  });
  check('signup 201', s.status === 201);
  check('signup returns token + user', s.body && typeof s.body.token === 'string' && s.body.user && s.body.user.email === email);
  const token = s.body ? s.body.token : null;

  console.log('2. Validation');
  check('weak password rejected', (await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: 'X', email: 'x1@dorsu.edu.ph', password: 'short' }) })).status === 400);
  check('no-digit password rejected', (await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: 'X', email: 'x2@dorsu.edu.ph', password: 'onlyletters' }) })).status === 400);
  check('bad email rejected', (await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: 'X', email: 'nope', password: 'stallion99' }) })).status === 400);
  check('duplicate email rejected', (await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: 'Other', email, password: 'stallion99' }) })).status === 400);

  console.log('3. Login');
  check('wrong password 400', (await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'wrong-pass1' }) })).status === 400);
  check('unknown email 400 (generic)', (await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'ghost@dorsu.edu.ph', password: 'wrong-pass1' }) })).status === 400);
  const l = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'stallion99' }) });
  check('login 200', l.status === 200);
  check('login token works', l.body && typeof l.body.token === 'string');

  console.log('4. Session');
  check('me 200 with token', (await req('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })).status === 200);
  check('me 401 without token', (await req('/api/auth/me')).status === 401);
  check('me 401 with junk token', (await req('/api/auth/me', { headers: { Authorization: 'Bearer garbage' } })).status === 401);
  check('logout 200', (await req('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).status === 200);
  check('me 401 after logout', (await req('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })).status === 401);

  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('suite error:', e); process.exit(1); });
