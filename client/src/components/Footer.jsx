import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { FACEBOOK_URL } from '../utils.js';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: 16, maxWidth: 300 }}>
              The official esports organization of Davao Oriental State University — forging
              champions through competition, discipline, and teamwork.
            </p>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-blue btn-sm"
              style={{ marginTop: 18 }}
            >
              <Icon name="facebook" size={15} /> Follow on Facebook
            </a>
          </div>
          <div>
            <h4>Navigate</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/tournaments">Tournaments</Link></li>
              <li><Link to="/games">Game Hubs</Link></li>
              <li><Link to="/leaderboard">Leaderboard</Link></li>
              <li><Link to="/announcements">Announcements</Link></li>
              <li><Link to="/about">About Us</Link></li>
            </ul>
          </div>
          <div>
            <h4>Get Involved</h4>
            <ul>
              <li><Link to="/register">Register a Team</Link></li>
              <li>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                  Facebook Community
                </a>
              </li>
              <li><Link to="/about">Varsity Tryouts</Link></li>
              <li><Link to="/announcements">Latest News</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>
                <Icon name="mail" size={14} /> esports@dorsu.edu.ph
              </li>
              <li>
                <Icon name="mapPin" size={14} /> DOrSU Main Campus, City of Mati, Davao Oriental
              </li>
              <li>
                <Icon name="facebook" size={14} />{' '}
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                  DOrSU eSPORTS Community
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} DOrSU eSPORTS. All rights reserved.</span>
          <span>Forged in the Arena · Davao Oriental State University</span>
        </div>
      </div>
    </footer>
  );
}
