import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { formatDate, FACEBOOK_URL } from '../utils.js';

// Read a picked image file, square-crop to 256×256 on a canvas and return a
// compact JPEG data URL (≈15–40 KB) — small enough for the API body limit.
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Image is too large — please pick one under 8 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Your browser could not process the image.'));
          return;
        }
        // Square center-crop, then scale down.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const PERKS = [
  { icon: 'bolt', title: 'One-tap registration', desc: 'Your captain details are prefilled when you sign your team up.' },
  { icon: 'crown', title: 'Track the season', desc: 'A single account ties you to every tournament you enter.' },
  { icon: 'shield', title: 'Private & secure', desc: 'Passwords are scrypt-hashed. Sessions expire in 30 days.' },
];

export default function Auth() {
  const { user, signup, login, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [mode, setMode] = useState(pathname === '/signup' ? 'signup' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const switchMode = (m) => {
    setMode(m);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup') {
      if (form.password !== form.confirm) {
        setError('Passwords do not match.');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup({ name: form.name, email: form.email, password: form.password });
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Logged in: account profile + editor ─────────────────
  if (user) {
    return <ProfileCard onLogout={logout} />;
  }

  // ── Signed out: login / signup forms ────────────────────
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Player HQ</span>
          <h1>Sign In / Create Account</h1>
          <p>
            One account for the whole season — register teams faster, keep your
            details on hand, and stay locked into the DOrSU eSPORTS arena.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 44 }}>
        <div className="container">
          <Reveal>
            <div className="auth-layout card">
              {/* Branding panel */}
              <aside className="auth-brand">
                <div className="auth-brand-logo" aria-hidden="true">
                  <img src="/logos/dorsu-logo.jpg" alt="" />
                </div>
                <h2>
                  Gear up for the <span className="grad">season</span>.
                </h2>
                <p className="auth-brand-sub">
                  Your player profile follows you from sign-up to the champion's podium.
                </p>
                <ul className="auth-perks">
                  {PERKS.map((p) => (
                    <li key={p.title}>
                      <span className="auth-perk-icon" aria-hidden="true">
                        <Icon name={p.icon} size={18} />
                      </span>
                      <span>
                        <b>{p.title}</b>
                        <small>{p.desc}</small>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="auth-brand-foot">
                  <Icon name="shield" size={14} /> Secured with scrypt password hashing
                </div>
              </aside>

              {/* Forms */}
              <div className="auth-form-wrap">
                <div className="auth-tabs" role="tablist" aria-label="Account">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                    onClick={() => switchMode('login')}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signup'}
                    className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                    onClick={() => switchMode('signup')}
                  >
                    Create Account
                  </button>
                </div>

                <form onSubmit={submit} noValidate>
                  {error && (
                    <div className="form-error" role="alert">
                      {error}
                    </div>
                  )}

                  {mode === 'signup' && (
                    <div className="field">
                      <label htmlFor="auth-name">Name</label>
                      <input
                        id="auth-name"
                        className="input"
                        placeholder="Your gamer / real name"
                        autoComplete="name"
                        value={form.name}
                        onChange={set('name')}
                        required
                        minLength={2}
                        maxLength={60}
                      />
                    </div>
                  )}

                  <div className="field">
                    <label htmlFor="auth-email">Email</label>
                    <input
                      id="auth-email"
                      type="email"
                      className="input"
                      placeholder="you@dorsu.edu.ph"
                      autoComplete="email"
                      value={form.email}
                      onChange={set('email')}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="auth-password">Password</label>
                    <div className="pw-wrap">
                      <input
                        id="auth-password"
                        type={showPw ? 'text' : 'password'}
                        className="input"
                        placeholder={mode === 'signup' ? 'At least 8 characters, incl. a number' : 'Your password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        value={form.password}
                        onChange={set('password')}
                        required
                        minLength={8}
                        maxLength={128}
                      />
                      <button
                        type="button"
                        className="pw-toggle"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPw((v) => !v)}
                      >
                        <Icon name="eye" size={17} />
                      </button>
                    </div>
                  </div>

                  {mode === 'signup' && (
                    <div className="field">
                      <label htmlFor="auth-confirm">Confirm Password</label>
                      <input
                        id="auth-confirm"
                        type={showPw ? 'text' : 'password'}
                        className="input"
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        value={form.confirm}
                        onChange={set('confirm')}
                        required
                        minLength={8}
                        maxLength={128}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={busy}
                  >
                    {busy ? (
                      <span className="spin" />
                    ) : mode === 'login' ? (
                      <>
                        <Icon name="lockOpen" size={15} /> Sign In
                      </>
                    ) : (
                      <>
                        <Icon name="sparkles" size={15} /> Create Account
                      </>
                    )}
                  </button>

                  <p className="auth-note">
                    {mode === 'login' ? (
                      <>
                        New to the arena?{' '}
                        <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                          Create an account
                        </button>
                      </>
                    ) : (
                      <>
                        Already registered?{' '}
                        <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                          Sign in instead
                        </button>
                      </>
                    )}
                  </p>
                </form>

                <div className="auth-org-line">
                  <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                    <Icon name="facebook" size={14} /> Join the community on Facebook
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

// Logged-in profile card with an edit mode: name, bio, contact and avatar.
function ProfileCard({ onLogout }) {
  const { user, updateProfile } = useAuth();
  const fileRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    contact: user.contact || '',
  });
  const [avatar, setAvatar] = useState(user.avatar || ''); // data URL ('' = none)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startEdit = () => {
    setForm({ name: user.name || '', bio: user.bio || '', contact: user.contact || '' });
    setAvatar(user.avatar || '');
    setError('');
    setSaved(false);
    setEditing(true);
  };

  const pickAvatar = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');
    try {
      setAvatar(await fileToAvatar(file));
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      await updateProfile({ ...form, avatar });
      setSaved(true);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const initial = (user.name || '?').trim().charAt(0).toUpperCase();

  return (
    <section className="section" style={{ minHeight: '72vh', display: 'grid', placeItems: 'center' }}>
      <div className="container">
        <Reveal>
          <div className="auth-profile card" style={{ maxWidth: 720 }}>
            <div className="auth-profile-badge" aria-hidden="true">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="auth-profile-img" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="auth-profile-main">
              <span className="eyebrow">Player HQ</span>
              <h1 style={{ fontSize: 30, marginBottom: 6 }}>{user.name}</h1>
              <p style={{ color: 'var(--muted)', marginBottom: editing ? 18 : 22 }}>
                {user.email}
                {user.username ? ` · @${user.username}` : ''}
                {user.created_at ? (
                  <>
                    {' '}· member since {formatDate(user.created_at.slice(0, 10))}
                  </>
                ) : null}
              </p>
              {!editing && user.bio && (
                <p style={{ color: 'var(--text)', opacity: 0.9, marginBottom: 18 }}>{user.bio}</p>
              )}
              {!editing && user.contact && (
                <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 18 }}>
                  <Icon name="phone" size={13} /> Contact: {user.contact}
                </p>
              )}

              {saved && (
                <div className="form-success" style={{ marginBottom: 16 }}>Profile updated — nice one!</div>
              )}

              {editing ? (
                <form onSubmit={save} noValidate>
                  {error && (
                    <div className="form-error" role="alert" style={{ marginBottom: 14 }}>
                      {error}
                    </div>
                  )}

                  {/* Avatar picker */}
                  <div className="field">
                    <label>Profile Picture</label>
                    <div className="avatar-picker">
                      <span className="avatar-picker-thumb" aria-hidden="true">
                        {avatar ? (
                          <img src={avatar} alt="" />
                        ) : (
                          <Icon name="camera" size={26} />
                        )}
                      </span>
                      <div className="avatar-picker-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current && fileRef.current.click()}>
                          <Icon name="camera" size={14} /> Choose Image
                        </button>
                        {avatar && (
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => setAvatar('')}>
                            <Icon name="trash" size={14} /> Remove
                          </button>
                        )}
                        <small className="avatar-hint">
                          Square crops best. Resized to 256×256 automatically.
                        </small>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={pickAvatar}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="pf-name">Name</label>
                      <input id="pf-name" className="input" value={form.name} onChange={set('name')} required minLength={2} maxLength={60} />
                    </div>
                    <div className="field">
                      <label htmlFor="pf-contact">Contact Number (optional)</label>
                      <input id="pf-contact" className="input" placeholder="09xx xxx xxxx — digits only" value={form.contact} onChange={set('contact')} maxLength={30} />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="pf-bio">Bio (optional)</label>
                    <textarea
                      id="pf-bio"
                      className="input"
                      rows={3}
                      maxLength={300}
                      placeholder="Rank, role, favorite game — show who you are on the arena."
                      value={form.bio}
                      onChange={set('bio')}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {busy ? <span className="spin" /> : <Icon name="check" size={15} />}
                      Save Changes
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button className="btn btn-blue" onClick={startEdit}>
                    <Icon name="pencil" size={15} /> Edit Profile
                  </button>
                  <Link to="/register" className="btn btn-primary">
                    <Icon name="bolt" size={15} /> Register a Team
                  </Link>
                  <Link to="/tournaments" className="btn btn-ghost">
                    Browse Tournaments
                  </Link>
                  <button className="btn btn-danger" onClick={onLogout}>
                    <Icon name="lock" size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
