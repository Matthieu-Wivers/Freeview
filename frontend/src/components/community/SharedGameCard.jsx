import { Link } from 'react-router-dom';

import ChessPreview from './ChessPreview';
import {
  formatDate,
  getAuthor,
  getCommentCount,
  getLikeCount,
  getSharedGameId,
  getSharedGameTitle,
  getUserDisplayName,
} from '../../utils/pgn';

export default function SharedGameCard({ sharedGame }) {
  const id = getSharedGameId(sharedGame);
  const author = getAuthor(sharedGame);
  const pgn = sharedGame.pgn || sharedGame.game?.pgn || '';
  const status = sharedGame.moderation_status || sharedGame.moderationStatus || 'visible';
  const visibility = sharedGame.visibility || 'public';

  return (
    <article className="shared-game-card panel">
      <ChessPreview pgn={pgn} compact />
      <div className="shared-game-card__content">
        <div className="shared-game-card__topline">
          <span className="review-badge review-badge--good">{visibility}</span>
          {status !== 'visible' && <span className="review-badge review-badge--mistake">{status}</span>}
        </div>
        <h2>
          <Link to={`/shared-games/${id}`}>{getSharedGameTitle(sharedGame)}</Link>
        </h2>
        <p>{sharedGame.description || 'Aucune description pour cette partie.'}</p>
        <div className="shared-game-card__footer">
          <span>Par {getUserDisplayName(author)}</span>
          <span>{formatDate(sharedGame.created_at || sharedGame.createdAt)}</span>
          <span>♥ {getLikeCount(sharedGame)}</span>
          <span>💬 {getCommentCount(sharedGame)}</span>
        </div>
      </div>
    </article>
  );
}
