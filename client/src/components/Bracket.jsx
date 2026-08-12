import { useMemo, useState } from 'react';
import { setWinner } from '../api.js';
import Icon from './Icon.jsx';

const MATCH_W = 252;
const MATCH_H = 96; // must match .match-card height in CSS
const H_GAP = 60;
const V_GAP = 24;
const LABEL_H = 40; // space reserved for the round label row

function roundName(round, totalRounds) {
  if (round === totalRounds) return 'Grand Finals';
  if (round === totalRounds - 1) return 'Semi-Finals';
  if (round === totalRounds - 2) return 'Quarter-Finals';
  return `Round ${round}`;
}

export default function Bracket({ bracket, admin = false, onAdvance }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const layout = useMemo(() => {
    const rounds = bracket.rounds;
    const leafCount = rounds[0].matches.length;
    const totalH = leafCount * MATCH_H + (leafCount - 1) * V_GAP;

    // Classic power-of-two bracket geometry: each round's matches are centered
    // between the two matches below them. Leaf matches are spaced MATCH_H + V_GAP
    // apart; round r's p-th match top is (p*2^r + (2^r-1)/2) * (MATCH_H + V_GAP).
    const roundLayout = rounds.map((round, r) => {
      const x = r * (MATCH_W + H_GAP);
      const span = Math.pow(2, r);
      return {
        ...round,
        x,
        yFor: (p) => (p * span + (span - 1) / 2) * (MATCH_H + V_GAP),
      };
    });

    // Connectors: horizontal from each child's center to a spine, vertical
    // spine joining the two children, horizontal from the spine's midpoint
    // into the parent's left edge.
    const connectors = [];
    for (let r = 0; r < roundLayout.length - 1; r++) {
      const childRound = roundLayout[r];
      const parentRound = roundLayout[r + 1];
      const childX = childRound.x + MATCH_W;
      const spineX = parentRound.x - H_GAP / 2;
      for (let q = 0; q < parentRound.matches.length; q++) {
        const yA = childRound.yFor(q * 2) + MATCH_H / 2;
        const yB = childRound.yFor(q * 2 + 1) + MATCH_H / 2;
        const mid = (yA + yB) / 2;
        connectors.push({
          key: `c${r}-${q}`,
          path: `M ${childX} ${yA} H ${spineX} V ${yB}`,
        });
        connectors.push({
          key: `g${r}-${q}`,
          path: `M ${spineX} ${mid} H ${parentRound.x}`,
        });
      }
    }

    const width = (rounds.length - 1) * (MATCH_W + H_GAP) + MATCH_W;
    return { roundLayout, connectors, totalH, width };
  }, [bracket]);

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

  const totalRounds = bracket.rounds.length;

  return (
    <div className="bracket-shell">
      {error && <div className="form-error" role="alert">{error}</div>}
      {admin && (
        <p
          style={{
            color: 'var(--muted)',
            fontSize: 13,
            fontFamily: 'var(--font-head)',
            marginBottom: 18,
            letterSpacing: '0.04em',
          }}
        >
          <Icon name="pencil" size={13} /> Admin mode — click a team to record them as the winner and advance the bracket.
        </p>
      )}
      <div
        className="bracket-scroll"
        style={{ minWidth: layout.width + 8, height: LABEL_H + layout.totalH, position: 'relative' }}
      >
        {layout.roundLayout.map((round, r) => (
          <div key={r} style={{ position: 'absolute', left: round.x, top: 0, width: MATCH_W }}>
            <div className="round-label">{roundName(round.round, totalRounds)}</div>
            {round.matches.map((match, p) => {
              const top = LABEL_H + round.yFor(p);
              const teamAId = match.teamAId;
              const teamBId = match.teamBId;
              const aIsWinner = match.winnerId !== null && match.winnerId === teamAId;
              const bIsWinner = match.winnerId !== null && match.winnerId === teamBId;
              const aIsLoser = match.winnerId !== null && teamAId !== null && !aIsWinner;
              const bIsLoser = match.winnerId !== null && teamBId !== null && !bIsWinner;
              const aIsBye = match.isBye && teamAId === null;
              const bIsBye = match.isBye && teamBId === null;

              const renderSlot = (side, props) => {
                const isBye = side === 'a' ? aIsBye : bIsBye;
                const tbd = props.teamId === null && !isBye;
                const winner = side === 'a' ? aIsWinner : bIsWinner;
                const loser = side === 'a' ? aIsLoser : bIsLoser;
                const clickable = admin && !busy && !tbd && !isBye && !winner;
                return (
                  <div
                    className={[
                      'team-slot',
                      tbd ? 'tbd' : '',
                      isBye ? 'bye-slot' : '',
                      winner ? 'winner' : '',
                      loser ? 'loser' : '',
                      clickable ? 'clickable' : '',
                    ].join(' ')}
                    key={side}
                    onClick={clickable ? () => handleAdvance(match, props.teamId) : undefined}
                    role={clickable ? 'button' : undefined}
                    aria-label={clickable ? `Advance ${props.name}` : undefined}
                  >
                    <span className="t-name">
                      {isBye ? 'BYE' : props.name || 'TBD'}
                    </span>
                    <span className="t-mark" aria-hidden="true">
                      {isBye ? '—' : winner ? '' : clickable ? <Icon name="crown" size={15} /> : ''}
                    </span>
                    {clickable && <span className="adv-hint"><Icon name="arrow" size={12} /> Advance</span>}
                  </div>
                );
              };

              return (
                <div
                  key={match.id}
                  className="match-card"
                  style={{ left: 0, top, width: MATCH_W }}
                >
                  <div className="m-round">{roundName(match.round, totalRounds)}</div>
                  {renderSlot('a', { name: match.teamA, teamId: teamAId })}
                  {renderSlot('b', { name: match.teamB, teamId: teamBId })}
                </div>
              );
            })}
          </div>
        ))}

        <svg
          className="connectors"
          width={layout.width}
          height={layout.totalH}
          style={{ position: 'absolute', top: LABEL_H, left: 0, pointerEvents: 'none', zIndex: 0 }}
          aria-hidden="true"
        >
          {layout.connectors.map((c) => (
            <path
              key={c.key}
              d={c.path}
              fill="none"
              stroke="rgba(125,150,255,0.4)"
              strokeWidth="1.6"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
