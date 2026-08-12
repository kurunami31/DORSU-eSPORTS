import { Link } from 'react-router-dom';

const VALUES = [
  { title: 'God-Centered & Humane', icon: '🕊️', desc: 'We compete with integrity and respect for every player, teammate, and opponent.' },
  { title: 'Critical Thinking & Creativity', icon: '🧠', desc: 'Outplays are built on sharp decision-making, adaptation, and creative shot-calling.' },
  { title: 'Discipline & Competence', icon: '⚔️', desc: 'Practice schedules, game plans, and sportsmanship — we hold ourselves to a standard.' },
  { title: 'Commitment & Collaboration', icon: '🤝', desc: 'Five players, one goal. Trust and communication win championships.' },
  { title: 'Resilience & Sustainability', icon: '🌱', desc: 'Comebacks are our specialty — and we build a community that lasts season after season.' },
];

export default function About() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Who We Are</span>
          <h1>About DOrSU eSPORTS</h1>
          <p>
            The official competitive gaming organization of Davao Oriental State University.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="card" style={{ padding: 36 }}>
            <h2 style={{ fontSize: 26, marginBottom: 16 }}>Our Story</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
              Born from dorm-room scrims and intramurals hype, DOrSU eSPORTS has grown into the
              university's home for competitive gaming. From Mobile Legends to Valorant to the
              fighting-game stage, we give every Stallion a chance to compete — whether they're
              chasing a varsity roster spot or just playing for the love of the game.
            </p>
            <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
              Our tournaments are run with a simple promise: fair brackets, clear schedules, and
              results that are always announced. Register, get matched, and let your gameplay speak.
            </p>
            <p style={{ color: 'var(--muted)' }}>
              Representing the blue and gold of Davao Oriental State University — and the rich
              heritage of our province — in every arena we enter.
            </p>
          </div>

          <div style={{ marginTop: 56 }}>
            <div className="section-head" style={{ justifyContent: 'center', textAlign: 'center' }}>
              <div>
                <span className="eyebrow" style={{ justifyContent: 'center' }}>The Code</span>
                <h2 className="section-title">Core Values</h2>
              </div>
            </div>
            <div className="tournament-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              {VALUES.map((v) => (
                <div key={v.title} className="card hover-lift" style={{ padding: 28 }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }} aria-hidden="true">{v.icon}</div>
                  <h3 style={{ fontSize: 17, marginBottom: 8 }}>{v.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Join the squad</h2>
            <p style={{ color: 'var(--muted)', maxWidth: 460, margin: '0 auto 26px' }}>
              Tryouts for the varsity team run every semester. Check the announcements or register
              for an open tournament to get scouted.
            </p>
            <Link to="/register" className="btn btn-primary">⚡ Register Now</Link>
          </div>
        </div>
      </section>
    </>
  );
}
