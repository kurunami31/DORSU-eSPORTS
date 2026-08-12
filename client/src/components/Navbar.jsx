import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../auth.jsx';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, ready } = useAuth();

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
            {ready && user && (user.role === 'admin' || user.role === 'moderator') && (
              <li className="nav-link-staff">
                <NavLink
                  to="/admin"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => setOpen(false)}
                >
                  <Icon name="shield" size={13} /> Panel
                </NavLink>
              </li>
            )}
            {ready && (
              <li className={user ? 'nav-link-user' : 'nav-link-user nav-link-mobile-only'}>
                <NavLink
                  to="/login"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => setOpen(false)}
                >
                  {user ? 'My Account' : 'Sign In'}
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
        <div className="nav-cta">
          {user ? (
            <Link to="/login" className="nav-user" title="My account">
              <span className="nav-user-avatar" aria-hidden="true">
                {(user.name || '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="nav-user-name">{user.name.split(' ')[0]}</span>
            </Link>
          ) : ready ? (
            <Link to="/login" className="btn btn-ghost btn-sm">
              <Icon name="lockOpen" size={14} /> Sign In
            </Link>
          ) : null}
          <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
            <Icon name="bolt" size={15} /> Register
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
