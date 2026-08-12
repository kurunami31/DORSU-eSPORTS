import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGames } from '../api.js';
import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { gameBannerGradient, gameGlyph, gameSlug } from '../utils.js';

export default function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getGames()
      .then((g) => {
        if (!alive) return;
        setGames(g);
        setError('');
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Game Hubs</span>
          <h1>Games</h1>
          <p>
            Every title the Stallions compete in, under one roof. Pick a game to see its
            tournaments, champions, and who's dominating the standings.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          {loading ? (
            <div className="loading">Loading game hubs…</div>
          ) : error ? (
            <div className="empty">{error}</div>
          ) : games.length === 0 ? (
            <div className="empty">No games on the roster yet — check back soon.</div>
          ) : (
            <Reveal className="games-grid">
              {games.map((g) => {
                const glyph = gameGlyph(g.game);
                const champion = g.champions && g.champions[0];
                return (
                  <Link key={g.game} to={`/games/${gameSlug(g.game)}`} className="game-hub-card rise">
                    <div
                      className="game-hub-art"
                      style={{ backgroundImage: gameBannerGradient(g.game) }}
                    >
                      {glyph.image ? (
                        <img className="game-hub-logo" src={glyph.image} alt="" />
                      ) : (
                        <span className="game-hub-logo game-hub-icon">
                          <Icon name={glyph.icon} size={30} />
                        </span>
                      )}
                    </div>
                    <div className="game-hub-body">
                      <h3>{g.game}</h3>
                      <div className="game-hub-stats">
                        <span>
                          <b>{g.tournaments}</b> tournaments
                        </span>
                        <span className={g.open_count > 0 ? 'hot' : ''}>
                          <b>{g.open_count}</b> open
                        </span>
                        <span>
                          <b>{g.entrants}</b> entrants
                        </span>
                      </div>
                      {champion ? (
                        <p className="game-hub-champ" title={`${champion.team_name} — ${champion.tournament_name}`}>
                          <Icon name="crown" size={13} />
                          <span className="champ-name">{champion.team_name}</span>
                          <span className="champ-ctx">last champion</span>
                        </p>
                      ) : (
                        <p className="game-hub-champ muted">No champion crowned yet</p>
                      )}
                      <span className="game-hub-cta">
                        Visit hub <Icon name="arrow" size={14} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
