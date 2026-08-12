import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import Icon from './Icon.jsx';
import { gameBannerGradient, gameGlyph, formatDate, teamSizeLabel } from '../utils.js';

export default function TournamentCard({ tournament }) {
  const g = gameGlyph(tournament.game);
  const pct = Math.min(100, Math.round((tournament.registered_count / tournament.max_teams) * 100));
  const full = tournament.registered_count >= tournament.max_teams;

  return (
    <article className="card tournament-card hover-lift rise">
      {g.image ? (
        <div
          className="tc-banner"
          style={{ backgroundImage: `url(${g.image})` }}
          role="img"
          aria-label={`${tournament.game} banner`}
        >
          <StatusBadge status={tournament.status} />
          <span className="tc-banner-game">
            <img src={g.image} alt="" />
            {tournament.game}
          </span>
        </div>
      ) : (
        <div
          className="tc-banner tc-banner-gradient"
          style={{ backgroundImage: gameBannerGradient(tournament.game) }}
          role="img"
          aria-label={`${tournament.game} banner`}
        >
          <StatusBadge status={tournament.status} />
          <span className="tc-banner-game">
            <Icon name={g.icon} size={18} />
            {tournament.game}
          </span>
        </div>
      )}

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
            <Icon name="calendar" size={13} /> Starts {formatDate(tournament.start_date)}
          </span>
          <span>
            <Icon name="trophy" size={13} /> {tournament.prize || 'Pride & glory'}
          </span>
        </div>
        <Link to={`/tournaments/${tournament.id}`} className="btn btn-blue btn-sm">
          {tournament.status === 'finished' ? 'Results' : tournament.status === 'open' ? 'Join' : 'View'}
        </Link>
      </div>
    </article>
  );
}
