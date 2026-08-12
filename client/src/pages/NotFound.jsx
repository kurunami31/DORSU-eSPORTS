import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="section" style={{ minHeight: '65vh', display: 'grid', placeItems: 'center' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(72px, 14vw, 140px)', fontWeight: 900, lineHeight: 1, background: 'linear-gradient(120deg, var(--blue-bright), var(--yellow))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          404
        </div>
        <h2 style={{ fontSize: 26, margin: '8px 0 12px' }}>Out of bounds</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 30 }}>
          This page doesn't exist — maybe it got nerfed in the latest patch.
        </p>
        <Link to="/" className="btn btn-primary">Back to Base</Link>
      </div>
    </section>
  );
}
