import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import WelcomeGate from './components/WelcomeGate.jsx';
import Home from './pages/Home.jsx';
import Tournaments from './pages/Tournaments.jsx';
import TournamentDetail from './pages/TournamentDetail.jsx';
import Games from './pages/Games.jsx';
import GameHub from './pages/GameHub.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Register from './pages/Register.jsx';
import Announcements from './pages/Announcements.jsx';
import About from './pages/About.jsx';
import Admin from './pages/Admin.jsx';
import Auth from './pages/Auth.jsx';
import NotFound from './pages/NotFound.jsx';
import Maintenance from './pages/Maintenance.jsx';
import { getMaintenance } from './api.js';
import { useAuth } from './auth.jsx';

// While maintenance mode is on, visitors see the "Under Maintenance" page.
// Staff (super admin + moderator) are allowed through so the site can be
// managed — e.g. to flip maintenance off again.
function MaintenanceGate({ maintenance, children }) {
  const { user, ready } = useAuth();
  const { pathname } = useLocation();
  const isStaff = ready && (user?.role === 'admin' || user?.role === 'moderator');

  if (maintenance === null) {
    // First check still in flight — hold the splash so the site never flashes.
    return (
      <div className="maintenance-loading" aria-hidden="true">
        <span className="logo-tile">
          <img src="/logos/dorsu-logo.jpg" alt="" />
        </span>
      </div>
    );
  }

  if (maintenance.maintenance) {
    // Wait for auth before hiding the site, so an admin who is already
    // signed in is never flashed the maintenance page.
    if (!ready) {
      return (
        <div className="maintenance-loading" aria-hidden="true">
          <span className="logo-tile">
            <img src="/logos/dorsu-logo.jpg" alt="" />
          </span>
        </div>
      );
    }
    // Staff always get in (to manage + turn maintenance off), and /admin
    // stays reachable so a lost staff session can be recovered.
    if (!isStaff && pathname !== '/admin') {
      return <Maintenance message={maintenance.message} />;
    }
  }

  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function App() {
  const [maintenance, setMaintenance] = useState(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await getMaintenance();
        if (active) setMaintenance(res);
      } catch {
        // API unreachable — never false-positive into maintenance mode.
        if (active) setMaintenance({ maintenance: false, message: null });
      }
    };
    check();
    // Re-check every minute + on tab focus so the site comes back
    // automatically the moment maintenance is switched off.
    const id = setInterval(check, 60_000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <MaintenanceGate maintenance={maintenance}>
      <WelcomeGate />
      <ScrollToTop />
      <Navbar />
      <ChatWidget />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:slug" element={<GameHub />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/:tournamentId" element={<Register />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </MaintenanceGate>
  );
}
