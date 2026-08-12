import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from './Logo.jsx';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Logo />
        <nav aria-label="Primary">
          <ul className={`nav-links ${open ? 'open' : ''}`}>
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-cta">
          <Link to="/tournaments" className="btn btn-ghost btn-sm">
            View Brackets
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
            Register
          </Link>
          <button
            className="nav-burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
