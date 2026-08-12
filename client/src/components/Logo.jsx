import { Link } from 'react-router-dom';

export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="logo" aria-label="DOrSU eSPORTS home">
      <span className="logo-tile">
        <img src="/logos/dorsu-logo.jpg" alt="DOrSU eSPORTS logo" />
      </span>
      {!compact && (
        <span className="logo-text">
          <strong>DOrSU eSPORTS</strong>
          <small>Davao Oriental State University</small>
        </span>
      )}
    </Link>
  );
}
