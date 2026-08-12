import Icon from './Icon.jsx';
import { gameGlyph } from '../utils.js';

// Inline version for cards/badges
export function GameIcon({ game }) {
  const g = gameGlyph(game);
  if (g.image) {
    return (
      <span className="tc-game" title={game}>
        <img className="game-chip-img" src={g.image} alt="" />
        {game}
      </span>
    );
  }
  return (
    <span className="tc-game" title={game}>
      <Icon name={g.icon} size={15} />
      {game}
    </span>
  );
}

// Larger version for page headers / detail views
export function GameTile({ game }) {
  const g = gameGlyph(game);
  return (
    <span className="game-tile" title={game}>
      {g.image ? <img src={g.image} alt="" /> : <Icon name={g.icon} size={16} />}
      {game}
    </span>
  );
}

export default GameIcon;
