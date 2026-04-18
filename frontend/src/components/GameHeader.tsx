import type { GameHeaders } from '../types/chess';
import { formatDate } from '../utils/format';

interface GameHeaderProps {
  headers: GameHeaders;
}

export function GameHeader({ headers }: GameHeaderProps) {
  return (
    <section className="panel game-header">
      <div className="game-header__topline">
        <span className="eyebrow">Loaded game</span>
        <span className="subtle">{headers.Site ?? 'Unknown source'}</span>
      </div>

      <div className="players-grid">
        <div className="player-card player-card--white">
          <span className="player-card__color">White</span>
          <strong>{headers.White ?? 'White player'}</strong>
          <span>{headers.WhiteElo ? `${headers.WhiteElo} Elo` : 'Elo unknown'}</span>
        </div>

        <div className="player-card player-card--black">
          <span className="player-card__color">Black</span>
          <strong>{headers.Black ?? 'Black player'}</strong>
          <span>{headers.BlackElo ? `${headers.BlackElo} Elo` : 'Elo unknown'}</span>
        </div>
      </div>
    </section>
  );
}
