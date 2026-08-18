import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTournament, getRegistrations, generateBrackets } from '../api.js';
import { useAuth } from '../auth.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Bracket from '../components/Bracket.jsx';
import RoundRobin from '../components/RoundRobin.jsx';
import DoubleElim from '../components/DoubleElim.jsx';
import { GameTile } from '../components/GameGlyph.jsx';
import Icon from '../components/Icon.jsx';
import { formatDate, teamSizeLabel } from '../utils.js';

const FORMAT_LABELS = {
  'single-elimination': 'Single elimination',
  'round-robin': 'Round robin',
  'double-elimination': 'Double elimination',
};

function formatLabel(format) {
  return FORMAT_LABELS[format] || format;
}

export default function TournamentDetail() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const admin = Boolean(user && user.role === 'admin');

  const load = useCallback(() => {
    return Promise.all([getTournament(id), getRegistrations(id)])
      .then(([t, regs]) => {
        setTournament(t);
        setRegistrations(regs);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setBusy(true);
    setError('');
    try {
      await generateBrackets(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !tournament) {
    return (
      <div className="container" style={{ paddingTop: 'calc(var(--nav-h) + 60px)' }}>
        <div className="empty">{error}</div>
      </div>
    );
  }
  if (!tournament) {
    return <div className="container" style={{ paddingTop: 'calc(var(--nav-h) + 60px)' }}><div className="loading">Loading tournament…</div></div>;
  }

  const hasBracket = Boolean(tournament.bracket);
  const pct = Math.min(100, Math.round((registrations.length / tournament.max_teams) * 100));
  let champion = null;
  if (hasBracket) {
    if (tournament.format === 'round-robin') {
      champion = tournament.bracket.standings?.[0]?.teamId ?? null;
    } else if (tournament.format === 'double-elimination') {
      champion = tournament.bracket.rounds.find((r) => r.phase === 'final')?.matches[0]?.winnerId ?? null;
    } else {
      champion = tournament.bracket.rounds[tournament.bracket.rounds.length - 1]?.matches[0]?.winnerId ?? null;
    }
  }
  const championName = champion
    ? registrations.find((r) => r.id === champion)?.team_name
    : null;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <GameTile game={tournament.game} />
            <StatusBadge status={tournament.status} />
          </div>
          <h1>{tournament.name}</h1>
          <p>{tournament.description}</p>
          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginTop: 18 }}>
            <span className="tc-meta">
              <span><Icon name="calendar" size={13} /> Starts {formatDate(tournament.start_date)}</span>
              <span><Icon name="clock" size={13} /> Reg closes {formatDate(tournament.registration_deadline)}</span>
            </span>
            <span className="tc-meta">
              <span><Icon name="users" size={13} /> {teamSizeLabel(tournament.team_size)} · {formatLabel(tournament.format)}</span>
              <span><Icon name="medal" size={13} /> {tournament.prize || 'Pride & glory'}</span>
            </span>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container">
          {error && <div className="form-error" role="alert">{error}</div>}

          {/* Champion banner */}
          {tournament.status === 'finished' && championName && (
            <div className="champion-banner rise">
              <span className="cup" aria-hidden="true"><Icon name="trophy" size={48} /></span>
              <div>
                <h3>{championName}</h3>
                <p>Champions of {tournament.name} — congratulations, Stallions!</p>
              </div>
            </div>
          )}

          <div className="detail-grid">
            <div style={{ minWidth: 0 }}>
              {/* Bracket / schedule */}
              {hasBracket ? (
                tournament.format === 'round-robin' ? (
                  <RoundRobin bracket={tournament.bracket} admin={admin} onAdvance={load} />
                ) : tournament.format === 'double-elimination' ? (
                  <DoubleElim bracket={tournament.bracket} admin={admin} onAdvance={load} />
                ) : (
                  <Bracket
                    bracket={tournament.bracket}
                    admin={admin}
                    onAdvance={load}
                  />
                )
              ) : (
                <div className="card" style={{ padding: '52px 30px', textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--blue-soft)', border: '1px solid var(--line-strong)', color: 'var(--blue-bright)' }} aria-hidden="true">
                    <Icon name="dice" size={28} />
                  </div>
                  <h3 style={{ fontSize: 22, marginBottom: 10 }}>{tournament.format === 'round-robin' ? 'Schedule not drawn yet' : 'Bracket not drawn yet'}</h3>
                  <p style={{ color: 'var(--muted)', maxWidth: 420, margin: '0 auto 24px', fontSize: 14.5 }}>
                    {tournament.status === 'open'
                      ? `The matchup is being prepared. Once registration closes (or the bracket is locked), teams are randomly matched into a ${formatLabel(tournament.format).toLowerCase()} schedule here.`
                      : 'This tournament has no schedule yet.'}
                  </p>
                  {admin && (
                    <button
                      className="btn btn-primary"
                      disabled={busy || registrations.length < 2}
                      onClick={handleGenerate}
                    >
                      {busy ? <span className="spin" /> : <Icon name="dice" size={15} />} Generate {tournament.format === 'round-robin' ? 'Schedule' : 'Brackets'}
                    </button>
                  )}
                  {admin && registrations.length < 2 && (
                    <p style={{ color: 'var(--muted-2)', fontSize: 12.5, marginTop: 10 }}>
                      At least 2 registered teams are required to generate a schedule.
                    </p>
                  )}
                  {!admin && tournament.status === 'open' && (
                    <Link to={`/register/${tournament.id}`} className="btn btn-primary btn-sm">
                      <Icon name="bolt" size={15} /> Register for this tournament
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Registration panel */}
            <div className="card" style={{ padding: 26, position: 'sticky', top: 'calc(var(--nav-h) + 24px)' }} data-sticky-panel>
              <h3 style={{ fontSize: 20, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                Entrants
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 13, color: 'var(--muted)', letterSpacing: '0.08em' }}>
                  {registrations.length}/{tournament.max_teams}
                </span>
              </h3>
              <div className="progress" style={{ margin: '14px 0 18px' }}>
                <div className="progress-bar">
                  <span className={pct >= 100 ? 'full' : ''} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {registrations.length === 0 ? (
                <p style={{ color: 'var(--muted-2)', fontSize: 14 }}>No teams yet — be the first to claim a slot.</p>
              ) : (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                  {registrations.map((r, i) => (
                    <li
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 11,
                        padding: '10px 12px',
                        background: 'var(--bg-1)',
                        border: '1px solid var(--line)',
                        borderRadius: 9,
                        fontSize: 14,
                      }}
                    >
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          flexShrink: 0,
                          borderRadius: 7,
                          display: 'grid',
                          placeItems: 'center',
                          fontFamily: 'var(--font-display)',
                          fontSize: 12,
                          fontWeight: 700,
                          background: i === 0 ? 'linear-gradient(135deg, var(--yellow), #ffb01f)' : 'var(--blue-soft)',
                          color: i === 0 ? '#181000' : 'var(--blue-bright)',
                        }}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      {r.team_image && (
                        <img
                          src={r.team_image}
                          alt=""
                          className="entry-thumb"
                          title={`${r.team_name} team photo / logo`}
                          loading="lazy"
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.team_name}</span>
                          {r.entry_type === 'solo' && <span className="entry-solo">Solo</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>
                          {r.entry_type === 'solo' ? 'Player' : 'Captain'}: {r.captain_name}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {tournament.status === 'open' && (
                <Link
                  to={`/register/${tournament.id}`}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 20 }}
                >
                  <Icon name="bolt" size={15} /> Register Now
                </Link>
              )}
              {tournament.status === 'open' && registrations.length >= tournament.max_teams && (
                <p style={{ color: 'var(--yellow)', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                  This tournament is full!
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
