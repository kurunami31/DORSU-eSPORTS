import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import GameGlyph from './GameGlyph.jsx';
import { formatDate, teamSizeLabel } from '../utils.js';

export default function TournamentCard({ tournament }) {
  const pct = Math.min(
    100,
    Math.round((tournament.registered_count / tournament.max_teams) * 100)
  );
  const full = tournament.registered_count >= tournament.max_teams;

  return (
    <article className="card tournament-card hover-lift rise">
      <div className="tc-top">
        <GameGlyph game={tournament.game} />
        <StatusBadge status={tournament.status} />
      </div>

      <div className="tc-body">
        <h3>{tournament.name}</h3>
        <p className="desc">{tournament.description}</p>
      </div>

      <div className="progress">
        <div className="meta">
          <span>
            <b>{tournament.registered_count}</b> / {tournament.max_teams} {tournament.team_size === 1 ? 'players' : 'teams'}
          </span>
          <span>{teamSizeLabel(tournament.team_size)} · {full ? 'Full' : `${pct}% full`}</span>
        </div>
        <div className="progress-bar">
          <span className={full ? 'full' : ''} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="tc-foot">
        <div className="tc-meta">
          <span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Starts {formatDate(tournament.start_date)}
          </span>
          <span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
            </svg>
            {tournament.prize || 'Pride & glory'}
          </span>
        </div>
        <Link to={`/tournaments/${tournament.id}`} className="btn btn-blue btn-sm">
          {tournament.status === 'finished' ? 'Results' : tournament.status === 'open' ? 'Join' : 'View'}
        </Link>
      </div>
    </article>
  );
}
