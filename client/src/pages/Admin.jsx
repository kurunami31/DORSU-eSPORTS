import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api, getAdminKey, setAdminKey, getTournaments, getRegistrations,
  createTournament, updateTournament, deleteTournament, generateBrackets,
  deleteRegistration, getAnnouncements, createAnnouncement, updateAnnouncement,
  deleteAnnouncement,
} from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

const GAME_SUGGESTIONS = [
  'Mobile Legends: Bang Bang', 'Valorant', 'Tekken 8', 'Dota 2',
  'League of Legends', 'Call of Duty', 'FIFA',
];

const CATEGORIES = ['Tournament', 'General', 'Community', 'Patch'];

const EMPTY_TOURNAMENT = {
  name: '', game: '', description: '', format: 'single-elimination',
  team_size: 5, max_teams: 8, prize: '', start_date: '', registration_deadline: '',
};

const EMPTY_ANNOUNCEMENT = { title: '', body: '', category: 'General', pinned: false };

export default function Admin() {
  const [authed, setAuthed] = useState(() => Boolean(getAdminKey()));

  if (!authed) return <Gate onAuth={() => setAuthed(true)} />;
  return <Dashboard />;
}

/* ── Passcode gate ─────────────────────────────────────── */
function Gate({ onAuth }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setAdminKey(key.trim());
    try {
      await api('/admin/check');
      onAuth();
    } catch {
      setAdminKey('');
      setError('Incorrect passcode. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
      <div className="container">
        <form className="card" style={{ maxWidth: 440, margin: '0 auto', padding: 38 }} onSubmit={submit}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: 42, marginBottom: 8 }} aria-hidden="true">🔐</div>
            <h2 style={{ fontSize: 24 }}>Admin Access</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
              Enter the passcode to manage tournaments and announcements.
            </p>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="field">
            <label htmlFor="admin-key">Passcode</label>
            <input
              id="admin-key"
              type="password"
              className="input"
              placeholder="Default: stallions"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? <span className="spin" /> : '🔓'} Unlock
          </button>
          <p style={{ color: 'var(--muted-2)', fontSize: 12.5, textAlign: 'center', marginTop: 14 }}>
            Change it by setting the <code>ADMIN_PASSCODE</code> environment variable.
          </p>
        </form>
      </div>
    </section>
  );
}

/* ── Dashboard ──────────────────────────────────────────── */
function Dashboard() {
  const [tab, setTab] = useState('tournaments');

  return (
    <>
      <section className="page-hero">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow">Control Room</span>
            <h1>Admin Panel</h1>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setAdminKey('');
              window.location.reload();
            }}
          >
            Lock Session
          </button>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          <div className="filter-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'tournaments'}
              className={`filter-tab ${tab === 'tournaments' ? 'active' : ''}`}
              onClick={() => setTab('tournaments')}
            >
              🏟️ Tournaments
            </button>
            <button
              role="tab"
              aria-selected={tab === 'announcements'}
              className={`filter-tab ${tab === 'announcements' ? 'active' : ''}`}
              onClick={() => setTab('announcements')}
            >
              📢 Announcements
            </button>
          </div>

          {tab === 'tournaments' ? <TournamentsPanel /> : <AnnouncementsPanel />}
        </div>
      </section>
    </>
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
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg(`⚠ ${err.message}`);
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
      await load();
    } catch (err) {
      setMsg(`⚠ ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22 }}>Manage Tournaments</h2>
        <button className="btn btn-primary btn-sm" onClick={startCreate}>+ New Tournament</button>
      </div>

      {msg && <div className={msg.startsWith('⚠') ? 'form-error' : 'form-success'}>{msg}</div>}

      {showForm && (
        <form className="card" style={{ padding: 28, marginBottom: 28 }} onSubmit={submit}>
          <h3 style={{ marginBottom: 18 }}>{editing ? `Edit: ${editing.name}` : 'New Tournament'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
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
                      🎲 Generate Brackets
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(t)}>Edit</button>
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
                          <button className="btn btn-danger btn-sm" onClick={() => removeTeam(r.id)}>Remove</button>
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
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg(`⚠ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22 }}>Manage Announcements</h2>
        <button className="btn btn-primary btn-sm" onClick={startCreate}>+ New Announcement</button>
      </div>

      {msg && <div className={msg.startsWith('⚠') ? 'form-error' : 'form-success'}>{msg}</div>}

      {showForm && (
        <form className="card" style={{ padding: 28, marginBottom: 28 }} onSubmit={submit}>
          <h3 style={{ marginBottom: 18 }}>{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
          <div className="field">
            <label>Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
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
                📌 Pin to top
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
                {a.pinned === 1 && <span className="a-pin">📌 Pinned</span>}
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
