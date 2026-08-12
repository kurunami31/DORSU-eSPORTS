import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { FACEBOOK_URL } from '../utils.js';

// Shown once per device — returning visitors go straight to the site.
const STORAGE_KEY = 'dorsu_welcomed_v1';

export default function WelcomeGate() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [leaving, setLeaving] = useState(false);

  // Lock body scroll while the gate is up so the site behind never shifts.
  useEffect(() => {
    if (dismissed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dismissed]);

  useEffect(() => {
    if (dismissed) return;
    const onKey = (e) => {
      if (e.key === 'Escape') enter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed]);

  const enter = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode — dismiss for this session only */
    }
    setLeaving(true);
    window.setTimeout(() => setDismissed(true), 700);
  };

  if (dismissed) return null;

  return (
    <div className={`welcome ${leaving ? 'leaving' : ''}`} role="dialog" aria-modal="true" aria-label="Welcome to DOrSU eSPORTS">
      <div className="welcome-glow welcome-glow-blue" aria-hidden="true" />
      <div className="welcome-glow welcome-glow-yellow" aria-hidden="true" />
      <div className="texture-grid welcome-grid" aria-hidden="true" />

      <div className="welcome-inner">
        <span className="welcome-emblem" aria-hidden="true">
          <img src="/logos/dorsu-logo.jpg" alt="" />
        </span>

        <p className="welcome-eyebrow">Davao Oriental State University</p>
        <h1 className="welcome-title">
          DOrSU <span className="grad">eSPORTS</span>
        </h1>
        <p className="welcome-tagline">
          Enter a tournament, get matched into a bracket, and represent your campus on the stage.
        </p>

        <button className="btn btn-primary welcome-enter" onClick={enter} autoFocus>
          <Icon name="bolt" size={18} /> Enter the Arena
        </button>

        <p className="welcome-hint">
          Press <kbd>Enter</kbd> or click the button to step inside
        </p>
      </div>

      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="welcome-fb"
      >
        <Icon name="facebook" size={14} /> Join the DOrSU eSPORTS Community
      </a>
    </div>
  );
}
