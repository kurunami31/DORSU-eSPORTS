import { useEffect, useState } from 'react';
import { getAnnouncements } from '../api.js';
import AnnouncementCard from '../components/AnnouncementCard.jsx';

const CATEGORIES = ['All', 'Tournament', 'General', 'Community', 'Patch'];

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnnouncements()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = cat === 'All' ? items : items.filter((a) => a.category === cat);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Intel Feed</span>
          <h1>Announcements</h1>
          <p>
            Tournament alerts, results, patch notes, and community news — everything you need to stay
            in the loop.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="filter-tabs" role="tablist" aria-label="Filter announcements">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={cat === c}
                className={`filter-tab ${cat === c ? 'active' : ''}`}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading">Fetching intel…</div>
          ) : filtered.length === 0 ? (
            <div className="empty">No announcements in this category.</div>
          ) : (
            <div className="announcement-list">
              {filtered.map((a) => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
