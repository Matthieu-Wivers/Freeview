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
import {
  getSharedReview,
  getSharedReviewSummary,
  hasSharedReview,
} from '../../utils/sharedReview';

export default function SharedGameCard({ sharedGame }) {
  const id = getSharedGameId(sharedGame);
  const author = getAuthor(sharedGame);
  const pgn = sharedGame.pgn || sharedGame.game?.pgn || '';
  const status = sharedGame.moderation_status || sharedGame.moderationStatus || 'visible';
  const visibility = sharedGame.visibility || 'public';
  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);
  const reviewed = hasSharedReview(sharedGame);

  return (
    <article className="shared-game-card">
      <Link className="shared-game-card__board-link" to={`/shared-games/${id}`}>
        <ChessPreview pgn={pgn} compact />
      </Link>

      <div className="shared-game-card__content">
        <div className="shared-game-card__topline">
          <span className="badge">{reviewed ? 'Review' : 'Game'}</span>
          <span className="badge badge--muted">{visibility}</span>
          {status !== 'visible' ? <span className="badge badge--warning">{status}</span> : null}
        </div>

        <h2>
          <Link to={`/shared-games/${id}`}>{getSharedGameTitle(sharedGame)}</Link>
        </h2>

        <p>{sharedGame.description || 'No description for this review yet.'}</p>

        {reviewed ? (
          <div className="shared-game-card__review-stats">
            <span>
              Accuracy
              <strong>{Math.round(summary?.averageAccuracy ?? 0)}%</strong>
            </span>
            <span>
              White
              <strong>{Math.round(review?.accuracyWhite ?? 0)}%</strong>
            </span>
            <span>
              Black
              <strong>{Math.round(review?.accuracyBlack ?? 0)}%</strong>
            </span>
          </div>
        ) : null}

        <footer className="shared-game-card__footer">
          <span>By {getUserDisplayName(author)}</span>
          <span>{formatDate(sharedGame.created_at || sharedGame.createdAt)}</span>
          <span>♥ {getLikeCount(sharedGame)}</span>
          <span>{getCommentCount(sharedGame)} comments</span>
        </footer>
      </div>
    </article>
  );
}