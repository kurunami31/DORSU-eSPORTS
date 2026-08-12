import Icon from '../components/Icon.jsx';
import { FACEBOOK_URL } from '../utils.js';

const DEFAULT_MESSAGE =
  "The arena is temporarily closed while we roll out updates, fix bugs, and tune the servers. We'll be back before you know it.";

export default function Maintenance({ message }) {
  return (
    <div className="maintenance-page">
      <div className="maintenance-card">
        <div className="maintenance-emblem">
          <img src="/logos/dorsu-logo.jpg" alt="DOrSU eSPORTS logo" />
        </div>

        <span className="badge badge-active maintenance-badge">
          <span className="dot" /> Under Maintenance
        </span>

        <h1 className="maintenance-title">
          We're <span className="grad">Tuning the Arena</span>
        </h1>

        <p className="maintenance-sub">{message || DEFAULT_MESSAGE}</p>

        <div className="maintenance-actions">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-blue"
          >
            <Icon name="facebook" size={15} /> Follow on Facebook
          </a>
          <a href="mailto:esports@dorsu.edu.ph" className="btn btn-ghost">
            <Icon name="mail" size={15} /> esports@dorsu.edu.ph
          </a>
        </div>

        <p className="maintenance-foot">
          Thanks for your patience — see you in the arena soon.
        </p>
      </div>
    </div>
  );
}
