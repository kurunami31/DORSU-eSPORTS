import { useState } from 'react';
import { setWinner } from '../api.js';
import Icon from './Icon.jsx';
import MatchCard from './MatchCard.jsx';

export default function RoundRobin({ bracket, admin = false, onAdvance }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleAdvance = async (match, teamId) => {
    if (!admin || busy) return;
    setError('');
    setBusy(true);
    try {
      await setWinner(match.id, teamId);
      await onAdvance?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bracket-shell">
      {error && <div className="form-error" role="alert">{error}</div>}
      {admin && (
        <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-head)', marginBottom: 18, letterSpacing: '0.04em' }}>
          <Icon name="pencil" size={13} /> Admin mode — click a team to record the match result.
        </p>
      )}

      <div className="rr-shell">
        {bracket.standings && bracket.standings.length > 0 && (
          <div className="rr-standings">
            <h4>Standings</h4>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>Played</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Win %</th>
                </tr>
              </thead>
              <tbody>
                {bracket.standings.map((s, i) => (
                  <tr key={s.teamId} className={i === 0 ? 'lead' : ''}>
                    <td>{i + 1}</td>
                    <td className="rr-team">{s.name}</td>
                    <td>{s.played}</td>
                    <td>{s.wins}</td>
                    <td>{s.losses}</td>
                    <td>{s.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rr-grid">
          {bracket.rounds.map((r) => (
            <div key={`${r.phase}:${r.round}`} className="rr-round">
              <div className="round-label">Round {r.round}</div>
              {r.matches.map((m) => (
                <MatchCard key={m.id} match={m} admin={admin} busy={busy} onAdvance={handleAdvance} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}