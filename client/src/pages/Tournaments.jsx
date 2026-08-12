import { useEffect, useState } from 'react';
import { getTournaments } from '../api.js';
import TournamentCard from '../components/TournamentCard.jsx';

const TABS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'active', label: 'Live' },
  { key: 'finished', label: 'Finished' },
];

export default function Tournaments() {
  const [tab, setTab] = useState('');
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getTournaments()
      .then((t) => {
        if (!alive) return;
        setAll(t);
        setError('');
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = tab === '' ? all : all.filter((t) => t.status === tab);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">The Arena</span>
          <h1>Tournaments</h1>
          <p>
            Every battle hosted by DOrSU eSPORTS. Register while slots are open, then follow the
            bracket as teams fight their way to the finals.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="filter-tabs" role="tablist" aria-label="Filter tournaments">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={`filter-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading">Loading tournaments…</div>
          ) : error ? (
            <div className="empty">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="empty">No tournaments here yet — check back soon.</div>
          ) : (
            <div className="tournament-grid">
              {filtered.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
