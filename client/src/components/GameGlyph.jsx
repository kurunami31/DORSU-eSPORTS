import { gameGlyph } from '../utils.js';

export default function GameGlyph({ game }) {
  const g = gameGlyph(game);
  return (
    <span className="tc-game" title={game}>
      <span aria-hidden="true">{g.icon}</span>
      {game}
    </span>
  );
}
