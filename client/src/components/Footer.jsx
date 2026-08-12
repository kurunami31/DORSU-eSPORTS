import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: 16, maxWidth: 300 }}>
              The official esports organization of Davao Oriental State University — forging champions
              through competition, discipline, and teamwork.
            </p>
          </div>
          <div>
            <h4>Navigate</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/tournaments">Tournaments</Link></li>
              <li><Link to="/announcements">Announcements</Link></li>
              <li><Link to="/about">About Us</Link></li>
            </ul>
          </div>
          <div>
            <h4>Get Involved</h4>
            <ul>
              <li><Link to="/register">Register a Team</Link></li>
              <li><Link to="/about">Varsity Tryouts</Link></li>
              <li><Link to="/announcements">Latest News</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>📧 esports@dorsu.edu.ph</li>
              <li>📍 DOrSU Main Campus, City of Mati, Davao Oriental</li>
              <li>🎮 Discord: discord.gg/dorsuesports</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} DOrSU eSPORTS. All rights reserved.</span>
          <span>
            <Link to="/admin" style={{ color: 'inherit', opacity: 0.7 }}>
              Admin
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
