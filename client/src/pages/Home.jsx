import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getTournaments, getAnnouncements } from '../api.js';
import TournamentCard from '../components/TournamentCard.jsx';
import AnnouncementCard from '../components/AnnouncementCard.jsx';
import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { FACEBOOK_URL } from '../utils.js';

const STEPS = [
  {
    icon: 'clipboard',
    title: 'Register',
    desc: 'Sign your team up with captain info and a full roster. Slots are first-come, first-served — lock yours in early.',
  },
  {
    icon: 'dice',
    title: 'We draw the bracket',
    desc: 'Once registration closes, teams are matched into a single-elimination bracket. Every draw is random and fair.',
  },
  {
    icon: 'trophy',
    title: 'Compete for the cup',
    desc: 'Battle through the rounds. Winners advance automatically until a champion is crowned.',
  },
];

export default function Home() {
  const [stats, setStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all([getStats(), getTournaments(), getAnnouncements(3)])
      .then(([s, t, a]) => {
        if (!alive) return;
        setStats(s);
        setTournaments(t.filter((x) => x.status !== 'finished').slice(0, 3));
        setAnnouncements(a);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero grain">
        <div className="container hero-inner">
          <span className="hero-tag rise">
            <span className="ping" aria-hidden="true" />
            Registration open for the new season
          </span>
          <h1 className="rise rise-1">
            Home of the <span className="grad">Stallions</span>.
          </h1>
          <p className="lead rise rise-2">
            DOrSU eSPORTS is the official competitive gaming organization of Davao Oriental State
            University. Enter a tournament, get matched into a bracket, and represent your campus
            on the stage.
          </p>
          <div className="hero-cta rise rise-3">
            <Link to="/register" className="btn btn-primary">
              <Icon name="bolt" size={16} /> Register Now
            </Link>
            <Link to="/tournaments" className="btn btn-ghost">
              View Tournaments <Icon name="arrow" size={16} />
            </Link>
          </div>

          {stats && (
            <div className="stats-strip rise rise-4">
              <div className="stat">
                <div className="num">{stats.openTournaments}</div>
                <div className="lbl">Open Events</div>
              </div>
              <div className="stat">
                <div className="num">{stats.totalTeams}</div>
                <div className="lbl">Teams In</div>
              </div>
              <div className="stat">
                <div className="num">{stats.finishedTournaments}</div>
                <div className="lbl">Champions Crowned</div>
              </div>
              <div className="stat">
                <div className="num">{stats.announcements}</div>
                <div className="lbl">Announcements</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Active tournaments ── */}
      <section className="section" id="tournaments">
        <div className="container">
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">The Arena</span>
              <h2 className="section-title">Open Battles</h2>
              <p className="section-sub">
                Tournaments you can enter right now — slots are limited, so lock yours in early.
              </p>
            </div>
            <Link to="/tournaments" className="btn btn-ghost">
              All Tournaments <Icon name="arrow" size={16} />
            </Link>
          </Reveal>
          {tournaments.length === 0 ? (
            <div className="loading">Checking the arena…</div>
          ) : (
            <Reveal className="tournament-grid" delay={120}>
              {tournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </Reveal>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section" style={{ background: 'var(--bg-1)', borderBlock: '1px solid var(--line)' }}>
        <div className="container">
          <Reveal className="section-head" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <div>
              <span className="eyebrow" style={{ justifyContent: 'center' }}>The Path</span>
              <h2 className="section-title">How it works</h2>
            </div>
          </Reveal>
          <Reveal
            className="tournament-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
            delay={100}
          >
            {STEPS.map((s, i) => (
              <div key={s.title} className="card hover-lift" style={{ padding: 30, textAlign: 'center' }}>
                <div
                  className="step-icon"
                  style={{
                    width: 56,
                    height: 56,
                    margin: '0 auto 16px',
                    borderRadius: 16,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg, var(--blue-soft), var(--yellow-soft))',
                    border: '1px solid var(--line-strong)',
                    color: 'var(--yellow)',
                  }}
                  aria-hidden="true"
                >
                  <Icon name={s.icon} size={26} />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--yellow)',
                    fontSize: 13,
                    letterSpacing: '0.2em',
                    marginBottom: 8,
                  }}
                >
                  STEP 0{i + 1}
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>{s.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Facebook community band ── */}
      <section className="section" style={{ padding: '56px 0' }}>
        <div className="container">
          <Reveal>
            <div
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                flexWrap: 'wrap',
                padding: '34px 36px',
                background:
                  'radial-gradient(600px 220px at 0% 0%, rgba(47,111,228,0.18), transparent 65%), linear-gradient(180deg, var(--panel), var(--bg-2))',
                borderColor: 'var(--line-strong)',
              }}
            >
              <span
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg, #2f6fe4, #1877f2)',
                  color: '#fff',
                  boxShadow: '0 10px 26px rgba(47, 111, 228, 0.4)',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <Icon name="facebook" size={28} />
              </span>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h3 style={{ fontSize: 21, marginBottom: 6 }}>Join the DOrSU eSPORTS Community</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14.5, maxWidth: 460 }}>
                  Updates, scrims, memes, and bracket banter — everything happens on our Facebook
                  page. Follow us so you never miss a tournament announcement.
                </p>
              </div>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <Icon name="facebook" size={15} /> Follow us
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Latest announcements ── */}
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">Intel</span>
              <h2 className="section-title">Latest News</h2>
            </div>
            <Link to="/announcements" className="btn btn-ghost">
              All Announcements <Icon name="arrow" size={16} />
            </Link>
          </Reveal>
          <Reveal className="announcement-list" delay={120}>
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <Reveal>
            <div
              className="card"
              style={{
                padding: '52px 40px',
                textAlign: 'center',
                background:
                  'radial-gradient(700px 260px at 50% 0%, rgba(255,198,26,0.14), transparent 70%), linear-gradient(180deg, var(--panel), var(--bg-2))',
                borderColor: 'rgba(255,198,26,0.25)',
              }}
            >
              <h2 className="section-title" style={{ marginBottom: 12 }}>
                Ready to compete?
              </h2>
              <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '0 auto 30px' }}>
                Grab your squad, register for an open tournament, and take the first step toward
                etching your name in DOrSU gaming history.
              </p>
              <Link to="/register" className="btn btn-primary">
                <Icon name="bolt" size={16} /> Register a Team
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
