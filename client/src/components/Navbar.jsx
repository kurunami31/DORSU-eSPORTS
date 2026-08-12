import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../auth.jsx';

// The full wordmark (logo + subtitle) stays visible at every size, so the bar
// only keeps the core links and tucks the rest into a "More" dropdown (which
// flattens into the burger drawer on smaller screens).
const VISIBLE_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/about', label: 'About' },
];
const MORE_LINKS = [
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/games', label: 'Games' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false); // mobile drawer
  const [moreOpen, setMoreOpen] = useState(false); // desktop dropdown
  const { user, ready } = useAuth();
  const { pathname } = useLocation();
  const moreRef = useRef(null);

  const isStaff = ready && user && (user.role === 'admin' || user.role === 'moderator');

  // Drop the More dropdown the moment the route changes.
  useEffect(() => setMoreOpen(false), [pathname]);

  // Close the More dropdown on any click outside it.
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        // Keyboard users: hand focus back to the trigger.
        moreRef.current?.querySelector('.nav-more-btn')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const closeAll = () => {
    setOpen(false);
    setMoreOpen(false);
  };

  const inMore = MORE_LINKS.some((l) => pathname.startsWith(l.to)) || (isStaff && pathname.startsWith('/admin'));

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Logo />
        <nav aria-label="Primary">
          <ul className={`nav-links ${open ? 'open' : ''}`}>
            {VISIBLE_LINKS.map((l) => (
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

            <li className="nav-more" ref={moreRef}>
              <button
                type="button"
                className={`nav-more-btn ${moreOpen ? 'open' : ''} ${inMore ? 'active' : ''}`}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                onClick={() => setMoreOpen((v) => !v)}
              >
                More <Icon name="chevron" size={14} />
              </button>
              <ul className={`nav-more-menu ${moreOpen ? 'open' : ''}`}>
                <li className="nav-more-label" aria-hidden="true">Browse the arena</li>
                {MORE_LINKS.map((l) => (
                  <li key={l.to}>
                    <NavLink
                      to={l.to}
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={closeAll}
                    >
                      {l.label}
                    </NavLink>
                  </li>
                ))}
                {isStaff && (
                  <li>
                    <NavLink
                      to="/admin"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={closeAll}
                    >
                      <Icon name="shield" size={14} /> Panel
                    </NavLink>
                  </li>
                )}
              </ul>
            </li>

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
              {user.avatar ? (
                <img src={user.avatar} alt="" className="nav-user-avatar nav-user-avatar-img" aria-hidden="true" />
              ) : (
                <span className="nav-user-avatar" aria-hidden="true">
                  {(user.name || '?').trim().charAt(0).toUpperCase()}
                </span>
              )}
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
