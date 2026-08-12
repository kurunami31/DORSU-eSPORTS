import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTournaments, getTournament, registerTeam } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import { formatDate, teamSizeLabel } from '../utils.js';

const EMPTY_ROSTER = () => [{ name: '', tag: '' }];

export default function Register() {
  const { tournamentId } = useParams();
  const { user } = useAuth();

  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(tournamentId ? Number(tournamentId) : '');
  const [tournament, setTournament] = useState(null);

  const [form, setForm] = useState({
    team_name: '',
    captain_name: '',
    email: '',
    contact: '',
  });

  // Prefill captain + email from the signed-in account (still editable).
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        captain_name: f.captain_name || user.name || '',
        email: f.email || user.email || '',
      }));
    }
  }, [user]);
  const [roster, setRoster] = useState(EMPTY_ROSTER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    getTournaments('open')
      .then(setTournaments)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) {
      setTournament(null);
      return;
    }
    getTournament(selected)
      .then(setTournament)
      .catch(() => {});
  }, [selected]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setRosterRow = (i, key) => (e) =>
    setRoster((rows) => rows.map((row, idx) => (idx === i ? { ...row, [key]: e.target.value } : row)));

  const addRow = () => setRoster((rows) => [...rows, { name: '', tag: '' }]);
  const removeRow = (i) => setRoster((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const cleanRoster = roster.filter((p) => p.name.trim() || p.tag.trim());
      const res = await registerTeam(selected, { ...form, roster: cleanRoster });
      setDone(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section className="section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <div className="container">
          <div className="card" style={{ maxWidth: 560, margin: '0 auto', padding: 44, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 20, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--green-soft), var(--blue-soft))', border: '1px solid rgba(47, 214, 127, 0.3)', color: 'var(--green)' }} aria-hidden="true">
              <Icon name="sparkles" size={30} />
            </div>
            <h2 style={{ fontSize: 30, marginBottom: 10 }}>You're in, {done.team_name}!</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 26 }}>
              Your team has been registered for <b style={{ color: 'var(--text)' }}>{tournament?.name}</b>.
              Watch the announcements for matchup details and bracket reveals.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={`/tournaments/${tournament?.id || ''}`} className="btn btn-blue">View Tournament</Link>
              <Link to="/announcements" className="btn btn-ghost">Announcements</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Sign Up</span>
          <h1>Register a Team</h1>
          <p>
            Claim a slot in an open DOrSU eSPORTS tournament. Fill in your captain details and roster —
            the arena is waiting.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          {tournamentId && tournament && tournament.status !== 'open' && (
            <div className="card" style={{ maxWidth: 620, margin: '0 auto', padding: 30, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--yellow-soft)', border: '1px solid rgba(255,198,26,0.3)', color: 'var(--yellow)' }} aria-hidden="true">
                <Icon name="lock" size={26} />
              </div>
              <h2 style={{ fontSize: 22, marginBottom: 10 }}>Registration closed</h2>
              <p style={{ color: 'var(--muted)', marginBottom: 22 }}>
                {tournament.name} is currently <b style={{ color: 'var(--text)' }}>{tournament.status}</b> —
                its registration window has closed. Check the announcements for the next open event.
              </p>
              <Link to="/tournaments" className="btn btn-blue">Browse Tournaments</Link>
            </div>
          )}
          {(!tournamentId || !tournament || tournament.status === 'open') && (
          <form className="card" style={{ maxWidth: 620, margin: '0 auto', padding: 34 }} onSubmit={submit}>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="reg-tournament">Tournament</label>
              <select
                id="reg-tournament"
                className="input"
                value={selected}
                onChange={(e) => setSelected(Number(e.target.value))}
                required
                disabled={Boolean(tournamentId)}
              >
                <option value="" disabled>
                  {tournaments.length ? 'Choose a tournament…' : 'No open tournaments right now'}
                </option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.game} ({t.registered_count}/{t.max_teams} filled)
                  </option>
                ))}
              </select>
            </div>

            {tournament && (
              <div className="form-success" style={{ fontSize: 13.5 }}>
                <b>{tournament.name}</b> · {teamSizeLabel(tournament.team_size)} · {tournament.registered_count}/
                {tournament.max_teams} filled · Reg closes {formatDate(tournament.registration_deadline)}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div className="field">
                <label htmlFor="reg-team">Team / Player Name</label>
                <input
                  id="reg-team"
                  className="input"
                  placeholder="e.g. DOrSU Stallions"
                  value={form.team_name}
                  onChange={set('team_name')}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="reg-captain">Captain / Contact Person</label>
                <input
                  id="reg-captain"
                  className="input"
                  placeholder="Full name"
                  value={form.captain_name}
                  onChange={set('captain_name')}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div className="field">
                <label htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  className="input"
                  placeholder="you@dorsu.edu.ph"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="reg-contact">Contact Number (optional)</label>
                <input
                  id="reg-contact"
                  className="input"
                  placeholder="09xx xxx xxxx"
                  value={form.contact}
                  onChange={set('contact')}
                />
              </div>
            </div>

            <div className="field">
              <label>Roster {tournament && tournament.team_size > 1 ? `(up to ${Math.max(tournament.team_size * 2, tournament.team_size + 3)} players)` : '(player tag)'}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {roster.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10 }}>
                    <input
                      className="input"
                      placeholder="Player name"
                      value={row.name}
                      onChange={setRosterRow(i, 'name')}
                    />
                    <input
                      className="input"
                      placeholder="In-game tag"
                      value={row.tag}
                      onChange={setRosterRow(i, 'tag')}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      style={{ paddingInline: 14 }}
                      onClick={() => removeRow(i)}
                      aria-label={`Remove player ${i + 1}`}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={addRow}>
                + Add player
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={busy || !selected}
            >
              {busy ? <span className="spin" /> : <Icon name="bolt" size={15} />} Lock In Registration
            </button>
            <p style={{ color: 'var(--muted-2)', fontSize: 12.5, textAlign: 'center', marginTop: 14 }}>
              Slots are first-come, first-served. Duplicate team names are not allowed.
            </p>
          </form>
          )}
        </div>
      </section>
    </>
  );
}
