import { useState } from 'react';
import { setWinner } from '../api.js';
import Icon from './Icon.jsx';
import MatchCard from './MatchCard.jsx';

const COLUMNS = [
  { phase: 'winners', title: 'Winners Bracket' },
  { phase: 'losers', title: 'Losers Bracket' },
  { phase: 'final', title: 'Grand Final' },
];

export default function DoubleElim({ bracket, admin = false, onAdvance }) {
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

  const roundLabel = (r) => {
    if (r.phase === 'final') return 'Grand Final';
    if (r.phase === 'losers') return `Losers · Round ${r.round}`;
    return `Winners · Round ${r.round}`;
  };

  return (
    <div className="bracket-shell">
      {error && <div className="form-error" role="alert">{error}</div>}
      {admin && (
        <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-head)', marginBottom: 18, letterSpacing: '0.04em' }}>
          <Icon name="pencil" size={13} /> Admin mode — click a team to record them as the winner and advance the bracket.
        </p>
      )}

      <div className="de-shell">
        {COLUMNS.map((col) => {
          const rounds = bracket.rounds.filter((r) => r.phase === col.phase);
          if (rounds.length === 0) return null;
          return (
            <div key={col.phase} className="de-col">
              <div className="de-col-title">{col.title}</div>
              {rounds.map((r) => (
                <div key={`${r.phase}:${r.round}`} className="de-round">
                  <div className="round-label">{roundLabel(r)}</div>
                  {r.matches.map((m) => (
                    <MatchCard key={m.id} match={m} admin={admin} busy={busy} onAdvance={handleAdvance} />
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}