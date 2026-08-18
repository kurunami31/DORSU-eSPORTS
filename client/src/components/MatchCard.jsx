import Icon from './Icon.jsx';

export default function MatchCard({ match, admin = false, busy = false, onAdvance, label }) {
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
        onClick={clickable ? () => onAdvance?.(match, props.teamId) : undefined}
        role={clickable ? 'button' : undefined}
        aria-label={clickable ? `Advance ${props.name}` : undefined}
      >
        <span className="t-name">{isBye ? 'BYE' : props.name || 'TBD'}</span>
        <span className="t-mark" aria-hidden="true">
          {isBye ? '—' : winner ? <Icon name="crown" size={13} /> : clickable ? <Icon name="crown" size={15} /> : ''}
        </span>
        {clickable && <span className="adv-hint"><Icon name="arrow" size={12} /> Advance</span>}
      </div>
    );
  };

  return (
    <div className="match-card static">
      <div className="m-round">{label || `Round ${match.round}`}</div>
      {renderSlot('a', { name: match.teamA, teamId: teamAId })}
      {renderSlot('b', { name: match.teamB, teamId: teamBId })}
    </div>
  );
}