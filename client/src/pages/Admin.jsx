import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getTournaments, getRegistrations,
  createTournament, updateTournament, deleteTournament, generateBrackets,
  deleteRegistration, getAnnouncements, createAnnouncement, updateAnnouncement,
  deleteAnnouncement,
  getAdminStats, getAdminUsers, deleteAdminUser, setMaintenance, getMaintenance,
} from '../api.js';
import { useAuth } from '../auth.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Icon from '../components/Icon.jsx';
import { formatDate } from '../utils.js';

const GAME_SUGGESTIONS = [
  'Mobile Legends: Bang Bang', 'Call of Duty: Mobile', 'Valorant', 'Tekken 8',
  'Dota 2', 'League of Legends', 'FIFA',
];

const CATEGORIES = ['Tournament', 'General', 'Community', 'Patch'];

const EMPTY_TOURNAMENT = {
  name: '', game: '', description: '', format: 'single-elimination',
  team_size: 5, max_teams: 8, prize: '', start_date: '', registration_deadline: '',
};

const EMPTY_ANNOUNCEMENT = { title: '', body: '', category: 'General', pinned: false };

export default function Admin() {
  const { user, ready, loginAdmin } = useAuth();
  const isAdmin = user && user.role === 'admin';

  if (!ready) {
    return (
      <section className="section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <div className="loading">Checking access…</div>
      </section>
    );
  }

  if (!isAdmin) return <Gate onLogin={loginAdmin} />;
  return <Dashboard />;
}

/* ── Super admin gate (username + password) ─────────────── */
function Gate({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin(form);
    } catch (err) {
      setError(err.message || 'Incorrect admin credentials. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
      <div className="container">
        <form className="card" style={{ maxWidth: 440, margin: '0 auto', padding: 38 }} onSubmit={submit}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ width: 60, height: 60, margin: '0 auto 12px', borderRadius: 18, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--blue-soft), var(--yellow-soft))', border: '1px solid var(--line-strong)', color: 'var(--yellow)' }} aria-hidden="true">
              <Icon name="lock" size={26} />
            </div>
            <h2 style={{ fontSize: 24 }}>Super Admin</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
              Sign in with the super admin account to manage tournaments and announcements.
            </p>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              className="input"
              placeholder="esportadmin"
              autoComplete="username"
              value={form.username}
              onChange={set('username')}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className="input"
              placeholder="••••••••••••"
              autoComplete="current-password"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? <span className="spin" /> : <Icon name="lockOpen" size={15} />} Sign In
          </button>
          <p style={{ color: 'var(--muted-2)', fontSize: 12.5, textAlign: 'center', marginTop: 14 }}>
            Only the super admin account can access this panel.
          </p>
        </form>
      </div>
    </section>
  );
}

/* ── Dashboard ──────────────────────────────────────────── */
function Dashboard() {
  const [tab, setTab] = useState('overview');
  const { logout } = useAuth();

  return (
    <>
      <section className="page-hero">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow">Control Room</span>
            <h1>Admin Panel</h1>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <Icon name="lock" size={14} /> Lock Session
          </button>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          <div className="filter-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'overview'}
              className={`filter-tab ${tab === 'overview' ? 'active' : ''}`}
              onClick={() => setTab('overview')}
            >
              <Icon name="bulb" size={14} /> Overview
            </button>
            <button
              role="tab"
              aria-selected={tab === 'tournaments'}
              className={`filter-tab ${tab === 'tournaments' ? 'active' : ''}`}
              onClick={() => setTab('tournaments')}
            >
              <Icon name="trophy" size={14} /> Tournaments
            </button>
            <button
              role="tab"
              aria-selected={tab === 'announcements'}
              className={`filter-tab ${tab === 'announcements' ? 'active' : ''}`}
              onClick={() => setTab('announcements')}
            >
              <Icon name="megaphone" size={14} /> Announcements
            </button>
            <button
              role="tab"
              aria-selected={tab === 'players'}
              className={`filter-tab ${tab === 'players' ? 'active' : ''}`}
              onClick={() => setTab('players')}
            >
              <Icon name="users" size={14} /> Players
            </button>
          </div>

          {tab === 'overview' && <OverviewPanel />}
          {tab === 'tournaments' && <TournamentsPanel />}
          {tab === 'announcements' && <AnnouncementsPanel />}
          {tab === 'players' && <PlayersPanel />}
        </div>
      </section>
    </>
  );
}

/* ── Overview panel (stats + system controls) ───────────── */
function OverviewPanel() {
  const [stats, setStats] = useState(null);

  const load = () => getAdminStats().then(setStats).catch(() => setStats(null));
  useEffect(() => {
    load();
  }, []);

  if (!stats) {
    return <div className="loading" style={{ padding: 40 }}>Crunching numbers…</div>;
  }

  const maxGame = Math.max(1, ...stats.byGame.map((g) => g.tournaments + g.teams));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22 }}>Site Overview</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
          Everything happening across the arena, at a glance.
        </p>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <div className="num">{stats.tournaments}</div>
          <div className="lbl">Tournaments</div>
          <div className="sub">{stats.open} open · {stats.live} live · {stats.finished} finished</div>
        </div>
        <div className="admin-stat">
          <div className="num">{stats.teams}</div>
          <div className="lbl">Teams Registered</div>
          <div className="sub">{stats.fillRate}% of {stats.capacity} total slots</div>
        </div>
        <div className="admin-stat">
          <div className="num">{stats.announcements}</div>
          <div className="lbl">Announcements</div>
          <div className="sub">posted to the feed</div>
        </div>
        <div className="admin-stat">
          <div className="num">{stats.players}</div>
          <div className="lbl">Player Accounts</div>
          <div className="sub">signed-up players</div>
        </div>
      </div>

      <div className="admin-cards">
        <div className="card admin-card">
          <h4><Icon name="gamepad" size={15} /> By Game</h4>
          {stats.byGame.length === 0 ? (
            <p style={{ color: 'var(--muted-2)', fontSize: 13.5 }}>No tournaments yet.</p>
          ) : (
            stats.byGame.map((g) => (
              <div className="admin-game-row" key={g.game}>
                <span className="g-name">{g.game}</span>
                <span className="g-bar">
                  <span style={{ width: `${Math.round(((g.tournaments + g.teams) / maxGame) * 100)}%` }} />
                </span>
                <span className="g-val">{g.tournaments} tourn · {g.teams} teams</span>
              </div>
            ))
          )}
        </div>

        <div className="card admin-card">
          <h4><Icon name="crosshair" size={15} /> Status</h4>
          <div className="admin-list">
            {['open', 'locked', 'active', 'finished'].map((s) => {
              const n = (stats.byStatus.find((x) => x.status === s) || {}).n || 0;
              return (
                <div className="admin-list-item" key={s}>
                  <div className="li-main"><StatusBadge status={s} /></div>
                  <div className="li-side">{n} tournament{n === 1 ? '' : 's'}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card admin-card">
          <h4><Icon name="users" size={15} /> Latest Sign-ups</h4>
          {stats.recent.length === 0 ? (
            <p style={{ color: 'var(--muted-2)', fontSize: 13.5 }}>No teams registered yet.</p>
          ) : (
            <div className="admin-list">
              {stats.recent.map((r, i) => (
                <div className="admin-list-item" key={i}>
                  <div className="li-main">
                    <b>{r.team_name}</b>
                    <div className="li-sub">{r.captain_name} · {r.tournament}</div>
                  </div>
                  <div className="li-side">{formatDate(r.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card admin-card">
          <h4><Icon name="calendar" size={15} /> Upcoming Deadlines</h4>
          {stats.deadlines.length === 0 ? (
            <p style={{ color: 'var(--muted-2)', fontSize: 13.5 }}>No open registrations with deadlines.</p>
          ) : (
            <div className="admin-list">
              {stats.deadlines.map((d) => (
                <div className="admin-list-item" key={d.id}>
                  <div className="li-main">
                    <b>{d.name}</b>
                    <div className="li-sub">Registration closes</div>
                  </div>
                  <div className="li-side">{formatDate(d.registration_deadline)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card admin-card">
          <h4><Icon name="trophy" size={15} /> Most Entries</h4>
          {stats.top.length === 0 ? (
            <p style={{ color: 'var(--muted-2)', fontSize: 13.5 }}>No tournaments yet.</p>
          ) : (
            <div className="admin-list">
              {stats.top.map((t) => (
                <div className="admin-list-item" key={t.id}>
                  <div className="li-main">
                    <b>{t.name}</b>
                    <div className="li-sub"><StatusBadge status={t.status} /></div>
                  </div>
                  <div className="li-side">{t.teams} team{t.teams === 1 ? '' : 's'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card admin-card">
          <h4><Icon name="shield" size={15} /> System Controls</h4>
          <MaintenanceControl />
        </div>
      </div>
    </div>
  );
}

/* ── Live maintenance toggle ────────────────────────────── */
function MaintenanceControl() {
  const [state, setState] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMaintenance()
      .then((r) => {
        setState(r);
        setMsg(r.message || '');
      })
      .catch(() => {});
  }, []);

  const apply = async (enabled, message) => {
    setBusy(true);
    setError('');
    try {
      const r = await setMaintenance(enabled, message);
      setState(r);
      setMsg(r.message || '');
    } catch (err) {
      setError(err.message || 'Failed to update maintenance mode.');
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return <p style={{ color: 'var(--muted-2)', fontSize: 13.5 }}>Loading system state…</p>;
  }

  return (
    <div>
      <div className="maintenance-control">
        <div className="mc-main">
          <b>Maintenance mode</b>
          <p>
            {state.maintenance
              ? 'The site is showing the Under Maintenance page to visitors.'
              : 'Visitors see the normal site. Flip this on while you update things.'}
          </p>
        </div>
        <button
          className="switch"
          role="switch"
          aria-checked={state.maintenance}
          aria-label="Toggle maintenance mode"
          disabled={busy}
          onClick={() => apply(!state.maintenance, state.maintenance ? msg : '')}
        />
      </div>

      {state.maintenance && (
        <div style={{ marginTop: 16 }}>
          <label htmlFor="maint-msg" style={{ display: 'block', fontFamily: 'var(--font-head)', fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
            Message shown to visitors
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              id="maint-msg"
              className="input"
              value={msg}
              maxLength={500}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="e.g. We're updating the registration system — back soon!"
              style={{ flex: 1, minWidth: 220 }}
            />
            <button className="btn btn-blue btn-sm" disabled={busy} onClick={() => apply(true, msg)}>
              {busy ? <span className="spin" /> : <Icon name="check" size={14} />} Save
            </button>
          </div>
        </div>
      )}

      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
      <p style={{ color: 'var(--muted-2)', fontSize: 12, marginTop: 12 }}>
        Tip: a MAINTENANCE_MODE environment variable overrides this switch while it is set.
      </p>
    </div>
  );
}

/* ── Players panel (super-admin only) ───────────────────── */
function PlayersPanel() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const { user: me } = useAuth();

  const load = (search) => {
    setBusy(true);
    getAdminUsers(search || '')
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    load('');
  }, []);

  const search = (e) => {
    e.preventDefault();
    setQuery(q);
    load(q);
  };

  const remove = async (u) => {
    if (u.role === 'admin') return;
    if (!window.confirm(`Delete the account for "${u.name}" (${u.email})? Their session is ended immediately.`)) return;
    setMsg('');
    try {
      await deleteAdminUser(u.id);
      setMsg('Player account deleted.');
      setMsgType('success');
      load(query);
    } catch (err) {
      setMsg(err.message);
      setMsgType('error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>Player Accounts</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
            Every signed-up account. Super admins are protected from deletion.
          </p>
        </div>
        <form onSubmit={search} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, username…"
            style={{ width: 240 }}
            aria-label="Search players"
          />
          <button className="btn btn-blue btn-sm" type="submit">
            <Icon name="crosshair" size={14} /> Search
          </button>
        </form>
      </div>

      {msg && <div className={msgType === 'error' ? 'form-error' : 'form-success'}>{msg}</div>}

      {busy ? (
        <div className="loading" style={{ padding: 40 }}>Loading accounts…</div>
      ) : users.length === 0 ? (
        <div className="empty">No accounts match{query ? ` “${query}”` : ''}.</div>
      ) : (
        <div className="card" style={{ padding: '8px 8px', overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Email</th>
                <th>Role</th>
                <th>Teams</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="u-name">{u.name}</div>
                    {u.username && <div className="u-email">@{u.username}</div>}
                  </td>
                  <td className="u-email">{u.email}</td>
                  <td>
                    <span className={`role-chip ${u.role}`}>
                      {u.role === 'admin' ? 'Super Admin' : 'Player'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{u.registrations}</td>
                  <td className="u-email">{formatDate(u.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {u.role === 'admin' ? (
                      <span style={{ color: 'var(--muted-2)', fontSize: 12.5 }}>
                        {u.id === me?.id ? 'You' : 'Protected'}
                      </span>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>
                        <Icon name="trash" size={13} /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Tournaments panel ──────────────────────────────────── */
function TournamentsPanel() {
  const [tournaments, setTournaments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_TOURNAMENT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [expanded, setExpanded] = useState(null);
  const [regs, setRegs] = useState([]);
  const [regsBusy, setRegsBusy] = useState(false);

  const load = () => getTournaments().then(setTournaments).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_TOURNAMENT);
    setShowForm(true);
  };

  const startEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name, game: t.game, description: t.description, format: t.format,
      team_size: t.team_size, max_teams: t.max_teams, prize: t.prize,
      start_date: t.start_date || '', registration_deadline: t.registration_deadline || '',
    });
    setShowForm(true);
  };

  const set = (key) => (e) => {
    const v = e.target.value;
    setForm((f) => ({
      ...f,
      [key]: ['team_size', 'max_teams'].includes(key) ? Number(v) : v,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      if (editing) {
        await updateTournament(editing.id, form);
        setMsg('Tournament updated.');
      } else {
        await createTournament(form);
        setMsg('Tournament created.');
      }
      setMsgType('success');
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg(err.message);
      setMsgType('error');
    } finally {
      setBusy(false);
    }
  };

  const toggleTeams = async (t) => {
    if (expanded === t.id) {
      setExpanded(null);
      return;
    }
    setExpanded(t.id);
    setRegsBusy(true);
    try {
      setRegs(await getRegistrations(t.id));
    } catch {
      setRegs([]);
    } finally {
      setRegsBusy(false);
    }
  };

  const removeTeam = async (regId) => {
    if (!window.confirm('Remove this registration?')) return;
    await deleteRegistration(regId);
    const t = tournaments.find((x) => x.id === expanded);
    if (t) await toggleTeams(t);
    await load();
  };

  const doGenerate = async (t) => {
    if (!window.confirm(`Generate brackets for "${t.name}"? Registration will be locked.`)) return;
    setMsg('');
    try {
      await generateBrackets(t.id);
      setMsg(`Brackets generated for ${t.name}.`);
      setMsgType('success');
      await load();
    } catch (err) {
      setMsg(err.message);
      setMsgType('error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22 }}>Manage Tournaments</h2>
        <button className="btn btn-primary btn-sm" onClick={startCreate}>
          <Icon name="plus" size={15} /> New Tournament
        </button>
      </div>

      {msg && <div className={msgType === 'error' ? 'form-error' : 'form-success'}>{msg}</div>}

      {showForm && (
        <form className="card" style={{ padding: 28, marginBottom: 28 }} onSubmit={submit}>
          <h3 style={{ marginBottom: 18 }}>{editing ? `Edit: ${editing.name}` : 'New Tournament'}</h3>
          <div className="form-grid">
            <div className="field">
              <label>Tournament Name</label>
              <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Dawn of Legends Cup" required />
            </div>
            <div className="field">
              <label>Game</label>
              <input className="input" list="games" value={form.game} onChange={set('game')} placeholder="e.g. Valorant" required />
              <datalist id="games">
                {GAME_SUGGESTIONS.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>
            <div className="field">
              <label>Team Size</label>
              <select className="input" value={form.team_size} onChange={set('team_size')}>
                {[1, 3, 5, 7].map((n) => <option key={n} value={n}>{n === 1 ? 'Solo (1v1)' : `${n}v${n}`}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Max Teams / Slots</label>
              <input className="input" type="number" min="2" max="64" value={form.max_teams} onChange={set('max_teams')} required />
            </div>
            <div className="field">
              <label>Prize</label>
              <input className="input" value={form.prize} onChange={set('prize')} placeholder="e.g. Trophy + ₱2,000 pool" />
            </div>
            <div className="field">
              <label>Format</label>
              <select className="input" value={form.format} onChange={set('format')}>
                <option value="single-elimination">Single Elimination</option>
              </select>
            </div>
            <div className="field">
              <label>Start Date</label>
              <input className="input" type="date" value={form.start_date} onChange={set('start_date')} />
            </div>
            <div className="field">
              <label>Registration Deadline</label>
              <input className="input" type="date" value={form.registration_deadline} onChange={set('registration_deadline')} />
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="input" value={form.description} onChange={set('description')} placeholder="Tournament pitch, rules, and eligibility…" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spin" /> : null} {editing ? 'Save Changes' : 'Create Tournament'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {tournaments.length === 0 ? (
        <div className="empty">No tournaments yet — create your first one above.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tournaments.map((t) => (
            <div key={t.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 17 }}>{t.name}</b>
                    <StatusBadge status={t.status} />
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 4 }}>
                    {t.game} · {t.registered_count}/{t.max_teams} slots filled
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-blue btn-sm" onClick={() => toggleTeams(t)}>
                    {expanded === t.id ? 'Hide Teams' : `Teams (${t.registered_count})`}
                  </button>
                  {t.status !== 'finished' && !t.bracket && (
                    <button className="btn btn-primary btn-sm" onClick={() => doGenerate(t)}>
                      <Icon name="dice" size={14} /> Generate Brackets
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(t)}>
                    <Icon name="pencil" size={13} /> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                      if (window.confirm(`Delete "${t.name}"? This removes its registrations too.`)) {
                        await deleteTournament(t.id);
                        await load();
                      }
                    }}
                  >
                    Delete
                  </button>
                  <Link to={`/tournaments/${t.id}`} className="btn btn-ghost btn-sm">View →</Link>
                </div>
              </div>

              {expanded === t.id && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                  {regsBusy ? (
                    <div className="loading" style={{ padding: 20 }}>Loading teams…</div>
                  ) : regs.length === 0 ? (
                    <p style={{ color: 'var(--muted-2)', fontSize: 14 }}>No registrations.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {regs.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                            padding: '10px 14px', background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 9,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <b style={{ fontSize: 14.5 }}>{r.team_name}</b>
                            <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>
                              {r.captain_name} · {r.email} {r.roster?.length ? `· ${r.roster.length} player(s)` : ''}
                            </div>
                          </div>
                          <button className="btn btn-danger btn-sm" onClick={() => removeTeam(r.id)}>
                            <Icon name="trash" size={13} /> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Announcements panel ────────────────────────────────── */
function AnnouncementsPanel() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ANNOUNCEMENT);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');

  const load = () => getAnnouncements().then(setItems).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_ANNOUNCEMENT);
    setShowForm(true);
  };

  const startEdit = (a) => {
    setEditing(a);
    setForm({ title: a.title, body: a.body, category: a.category, pinned: Boolean(a.pinned) });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      if (editing) {
        await updateAnnouncement(editing.id, form);
        setMsg('Announcement updated.');
      } else {
        await createAnnouncement(form);
        setMsg('Announcement published.');
      }
      setMsgType('success');
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg(err.message);
      setMsgType('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22 }}>Manage Announcements</h2>
        <button className="btn btn-primary btn-sm" onClick={startCreate}>
          <Icon name="plus" size={15} /> New Announcement
        </button>
      </div>

      {msg && <div className={msgType === 'error' ? 'form-error' : 'form-success'}>{msg}</div>}

      {showForm && (
        <form className="card" style={{ padding: 28, marginBottom: 28 }} onSubmit={submit}>
          <h3 style={{ marginBottom: 18 }}>{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
          <div className="field">
            <label>Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'var(--text)', fontWeight: 600, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: 'var(--yellow)' }}
                />
                <Icon name="pin" size={14} /> Pin to top
              </label>
            </div>
          </div>
          <div className="field">
            <label>Body</label>
            <textarea className="input" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spin" /> : null} {editing ? 'Save Changes' : 'Publish'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="empty">No announcements yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((a) => (
            <div key={a.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className={`a-category ${a.category}`}>{a.category}</span>
                {a.pinned === 1 && <span className="a-pin"><Icon name="pin" size={12} /> Pinned</span>}
                <b style={{ flex: 1, minWidth: 200 }}>{a.title}</b>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(a)}>Edit</button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    if (window.confirm('Delete this announcement?')) {
                      await deleteAnnouncement(a.id);
                      await load();
                    }
                  }}
                >
                  Delete
                </button>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 8 }}>{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
