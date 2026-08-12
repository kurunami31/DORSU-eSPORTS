import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGames, getTournaments } from '../api.js';
import TournamentCard from '../components/TournamentCard.jsx';
import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { gameBannerGradient, gameGlyph, gameSlug } from '../utils.js';

export default function GameHub() {
  const { slug } = useParams();
  const [game, setGame] = useState(null);
  const [tournaments, setTournaments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getGames()
      .then((games) => {
        if (!alive) return;
        const match = games.find((g) => gameSlug(g.game) === slug);
        if (!match) {
          setError('notfound');
          setLoading(false);
          return;
        }
        setGame(match);
        return getTournaments(null, match.game).then((ts) => {
          if (alive) setTournaments(ts);
        });
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="loading">Loading game hub…</div>
        </div>
      </section>
    );
  }

  if (error === 'notfound') {
    return (
      <section className="section">
        <div className="container">
          <div className="empty">
            <Icon name="crosshair" size={28} />
            <p>That game isn't on the roster.</p>
            <Link to="/games" className="btn btn-blue btn-sm" style={{ marginTop: 14 }}>
              Browse all games
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (error || !game) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty">{error || 'Could not load this game hub.'}</div>
        </div>
      </section>
    );
  }

  const glyph = gameGlyph(game.game);
  const champions = game.champions || [];

  return (
    <>
      <section className="game-hero" style={{ backgroundImage: gameBannerGradient(game.game) }}>
        <div className="container game-hero-inner">
          <span className="game-hero-tile">
            {glyph.image ? <img src={glyph.image} alt="" /> : <Icon name={glyph.icon} size={26} />}
          </span>
          <div className="game-hero-text">
            <span className="eyebrow">Game Hub</span>
            <h1>{game.game}</h1>
            <div className="game-hero-stats">
              <span>
                <b>{game.tournaments}</b> tournaments
              </span>
              <span className={game.open_count > 0 ? 'hot' : ''}>
                <b>{game.open_count}</b> open now
              </span>
              <span>
                <b>{game.live_count}</b> live
              </span>
              <span>
                <b>{game.finished_count}</b> finished
              </span>
              <span>
                <b>{game.entrants}</b> entrants
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          {champions.length > 0 && (
            <div className="champions-wrap">
              <h2 className="section-title">
                <Icon name="crown" size={18} /> Hall of Champions
              </h2>
              <div className="champions-row">
                {champions.map((c) => (
                  <div key={c.tournament_id} className="champion-chip">
                    {c.team_image ? (
                      <img className="champion-chip-img" src={c.team_image} alt="" />
                    ) : (
                      <span className="champion-chip-avatar">
                        {c.team_name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <b>{c.team_name}</b>
                      <span>{c.tournament_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="section-title">Tournaments</h2>
          {tournaments.length === 0 ? (
            <div className="empty">
              No tournaments for {game.game} yet — the arena is warming up.
            </div>
          ) : (
            <Reveal className="tournament-grid">
              {tournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
