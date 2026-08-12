import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGames, getLeaderboard } from '../api.js';
import Icon from '../components/Icon.jsx';
import { gameGlyph, gameSlug } from '../utils.js';

const MEDALS = ['gold', 'silver', 'bronze'];

function EntryBadge({ type }) {
  return <span className={`entry-badge ${type}`}>{type === 'solo' ? 'Solo' : 'Team'}</span>;
}

function GameMark({ game, className = '' }) {
  const glyph = gameGlyph(game);
  return glyph.image ? (
    <img className={className} src={glyph.image} alt="" title={game} />
  ) : (
    <Icon className={className} name={glyph.icon} size={14} />
  );
}

function TeamCell({ row }) {
  return (
    <div className="lb-team">
      {row.team_image ? (
        <img className="lb-team-img" src={row.team_image} alt="" />
      ) : (
        <span className="lb-team-img lb-team-avatar">{row.team_name.trim().charAt(0).toUpperCase()}</span>
      )}
      <div className="lb-team-meta">
        <b>{row.team_name}</b>
        <span className="lb-team-sub">
          <EntryBadge type={row.entry_type} />
          <GameMark game={row.game} className="lb-game-img" />
          {row.game}
        </span>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [games, setGames] = useState([]);
  const [game, setGame] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getGames()
      .then((g) => {
        if (alive) setGames(g);
      })
      .catch(() => {
        /* game filter chips are optional — board still loads */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getLeaderboard({ game: game || undefined, limit: 50 })
      .then((r) => {
        if (!alive) return;
        setRows(r);
        setError('');
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [game]);

  const podium = useMemo(() => rows.slice(0, 3), [rows]);
  const table = useMemo(() => rows.slice(3), [rows]);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Hall of Fame</span>
          <h1>Leaderboard</h1>
          <p>
            The Stallions who dominate the brackets. Standings are built from real match results —
            wins, championship titles, and win rate across every tournament.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          {games.length > 1 && (
            <div className="filter-tabs" role="tablist" aria-label="Filter leaderboard by game">
              <button
                role="tab"
                aria-selected={game === ''}
                className={`filter-tab ${game === '' ? 'active' : ''}`}
                onClick={() => setGame('')}
              >
                All Games
              </button>
              {games.map((g) => (
                <button
                  key={g.game}
                  role="tab"
                  aria-selected={game === g.game}
                  className={`filter-tab ${game === g.game ? 'active' : ''}`}
                  onClick={() => setGame(g.game)}
                >
                  <GameMark game={g.game} className="filter-tab-glyph" />
                  {g.game}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="loading">Crunching the standings…</div>
          ) : error ? (
            <div className="empty">{error}</div>
          ) : rows.length === 0 ? (
            <div className="empty">
              <Icon name="trophy" size={28} />
              <p>No battles recorded yet — the first champions will rise here.</p>
              <Link to="/tournaments" className="btn btn-blue btn-sm" style={{ marginTop: 14 }}>
                Browse tournaments
              </Link>
            </div>
          ) : (
            <>
              {podium.length > 0 && (
                <div className="podium" aria-label="Top three">
                  {[1, 0, 2].map((i) => {
                    const row = podium[i];
                    if (!row) return null;
                    const rank = i + 1;
                    return (
                      <div key={row.team_name} className={`podium-card ${MEDALS[rank - 1]} ${rank === 1 ? 'first' : ''}`}>
                        <span className="podium-rank">{rank}</span>
                        {row.team_image ? (
                          <img className="podium-img" src={row.team_image} alt="" />
                        ) : (
                          <span className="podium-img podium-avatar">
                            {row.team_name.trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                        <b className="podium-name">{row.team_name}</b>
                        <span className="podium-game">
                          <GameMark game={row.game} className="podium-game-img" />
                          {row.game}
                        </span>
                        <div className="podium-stats">
                          <span title="Championship titles">
                            <Icon name="crown" size={13} /> {row.titles}
                          </span>
                          <span title="Match wins">
                            <Icon name="bolt" size={13} /> {row.wins}
                          </span>
                          <span title="Win rate">
                            <Icon name="medal" size={13} /> {row.win_rate}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {table.length > 0 && (
                <div className="lb-table-wrap">
                  <table className="lb-table">
                    <thead>
                      <tr>
                        <th aria-label="Rank">#</th>
                        <th>Team</th>
                        <th>Events</th>
                        <th>Played</th>
                        <th>Wins</th>
                        <th>Titles</th>
                        <th>Win rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.map((row, idx) => (
                        <tr key={`${row.game}-${row.team_name}`}>
                          <td className="lb-rank">{idx + 4}</td>
                          <td>
                            <TeamCell row={row} />
                          </td>
                          <td>{row.tournaments}</td>
                          <td>{row.played}</td>
                          <td className="lb-wins">{row.wins}</td>
                          <td className="lb-titles">
                            {row.titles > 0 ? (
                              <>
                                <Icon name="crown" size={13} /> {row.titles}
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <span className="lb-rate">
                              <span
                                className="lb-rate-bar"
                                style={{ width: `${Math.min(100, row.win_rate)}%` }}
                              />
                              {row.win_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
