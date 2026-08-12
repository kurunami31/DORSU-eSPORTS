import { Link } from 'react-router-dom';

export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="logo" aria-label="DOrSU eSPORTS home">
      <svg className="logo-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="lgLogo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2f6fe4" />
            <stop offset="1" stopColor="#ffc61a" />
          </linearGradient>
        </defs>
        <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" fill="url(#lgLogo)" />
        <path d="M22.5 9 L13 21.5 h5.5 L17 31 L27 18 h-6 z" fill="#04060d" />
      </svg>
      {!compact && (
        <span className="logo-text">
          <strong>DOrSU eSPORTS</strong>
          <small>Compete · Dominate</small>
        </span>
      )}
    </Link>
  );
}
