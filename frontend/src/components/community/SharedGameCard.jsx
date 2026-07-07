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
  summarizePgn,
} from '../../utils/pgn';
import {
  getCriticalMoves,
  getSharedReview,
  getSharedReviewSummary,
  hasSharedReview,
} from '../../utils/sharedReview';

function getInitial(label) {
  return String(label || 'U').trim().charAt(0).toUpperCase() || 'U';
}

function formatAccuracy(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 'N/A';
  }

  return `${Math.round(number)}%`;
}

function getSummaryPlayerName(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.name || fallback;
}

function getWhiteAccuracy(review, summary) {
  return (
    summary?.white?.accuracy ??
    summary?.accuracyWhite ??
    review?.accuracyWhite ??
    review?.whiteAccuracy ??
    review?.accuracy?.white
  );
}

function getBlackAccuracy(review, summary) {
  return (
    summary?.black?.accuracy ??
    summary?.accuracyBlack ??
    review?.accuracyBlack ??
    review?.blackAccuracy ??
    review?.accuracy?.black
  );
}

function getAverageAccuracy(review, summary) {
  const explicitAverage = summary?.averageAccuracy ?? review?.summary?.averageAccuracy;

  if (explicitAverage !== undefined && explicitAverage !== null) {
    return explicitAverage;
  }

  const whiteAccuracy = Number(getWhiteAccuracy(review, summary));
  const blackAccuracy = Number(getBlackAccuracy(review, summary));

  if (Number.isFinite(whiteAccuracy) && Number.isFinite(blackAccuracy)) {
    return (whiteAccuracy + blackAccuracy) / 2;
  }

  if (Number.isFinite(whiteAccuracy)) {
    return whiteAccuracy;
  }

  if (Number.isFinite(blackAccuracy)) {
    return blackAccuracy;
  }

  return null;
}

function getReviewCriticalMoves(review, summary) {
  const fromReview = getCriticalMoves(review, 4);

  if (fromReview.length > 0) {
    return fromReview;
  }

  if (Array.isArray(summary?.criticalMoves)) {
    return summary.criticalMoves.slice(0, 4);
  }

  if (Array.isArray(review?.summary?.criticalMoves)) {
    return review.summary.criticalMoves.slice(0, 4);
  }

  return [];
}

function getMoveSan(move) {
  return (
    move.playedSan ||
    move.san ||
    move.move ||
    move.bestSan ||
    move.bestMove ||
    'Move'
  );
}

function getMoveLabel(move) {
  return (
    move.label ||
    move.category ||
    move.classification ||
    move.type ||
    'Review point'
  );
}

function getMoveNumber(move, index) {
  if (move.moveNumber) {
    return `${move.moveNumber}.`;
  }

  if (move.ply) {
    return `${Math.ceil(Number(move.ply) / 2)}.`;
  }

  return `${index + 1}.`;
}

function getCategoryCounts(review, summary) {
  return (
    summary?.categoryCounts ||
    review?.summary?.categoryCounts ||
    review?.categoryCounts ||
    null
  );
}

export default function SharedGameCard({ sharedGame }) {
  const sharedGameId = getSharedGameId(sharedGame);
  const author = getAuthor(sharedGame);
  const authorName = getUserDisplayName(author);

  const pgn = sharedGame.pgn || sharedGame.game?.pgn || '';
  const pgnSummary = summarizePgn(pgn);

  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);
  const reviewed = hasSharedReview(sharedGame);

  const criticalMoves = getReviewCriticalMoves(review, summary);
  const categoryCounts = getCategoryCounts(review, summary);

  const title = getSharedGameTitle(sharedGame);
  const description = sharedGame.description?.trim();

  const whiteName =
    getSummaryPlayerName(summary?.white, null) ||
    sharedGame.white_player ||
    sharedGame.whitePlayer ||
    pgnSummary.white ||
    'White';

  const blackName =
    getSummaryPlayerName(summary?.black, null) ||
    sharedGame.black_player ||
    sharedGame.blackPlayer ||
    pgnSummary.black ||
    'Black';

  const result = sharedGame.result || summary?.result || pgnSummary.result || '*';

  return (
    <article className="shared-game-card shared-game-card--post shared-game-card--review-first">
      <header className="shared-game-card__post-header">
        <div className="post-author-badge">
          <span className="post-author-badge__avatar">{getInitial(authorName)}</span>
          <span>
            <strong>{authorName}</strong>
            <small>{formatDate(sharedGame.created_at || sharedGame.createdAt)}</small>
          </span>
        </div>

        <div className="shared-game-card__badges">
          <span className="badge">{reviewed ? 'Review' : 'Game'}</span>
          <span className="badge badge--muted">{sharedGame.visibility || 'public'}</span>
        </div>
      </header>

      <div className="shared-game-card__layout">
        <div className="shared-game-card__board">
          <ChessPreview pgn={pgn} />
        </div>

        <div className="shared-game-card__content">
          <h2>{title}</h2>

          <p className="shared-game-card__match">
            {whiteName} vs {blackName} · {result}
          </p>

          {description ? (
            <p className="shared-game-card__description">{description}</p>
          ) : null}

          {reviewed ? (
            <section className="shared-game-card__review-direct" aria-label="Review summary">
              <div className="shared-game-card__review-grid">
                <span>
                  <small>Average accuracy</small>
                  <strong>{formatAccuracy(getAverageAccuracy(review, summary))}</strong>
                </span>

                <span>
                  <small>White accuracy</small>
                  <strong>{formatAccuracy(getWhiteAccuracy(review, summary))}</strong>
                </span>

                <span>
                  <small>Black accuracy</small>
                  <strong>{formatAccuracy(getBlackAccuracy(review, summary))}</strong>
                </span>
              </div>

              {categoryCounts ? (
                <div className="review-category-list">
                  {Object.entries(categoryCounts)
                    .filter(([, count]) => Number(count) > 0)
                    .map(([category, count]) => (
                      <span
                        className={`review-category-pill review-category-pill--${category}`}
                        key={category}
                      >
                        <strong>{count}</strong>
                        {category}
                      </span>
                    ))}
                </div>
              ) : null}

              {criticalMoves.length > 0 ? (
                <div className="shared-game-card__critical-list">
                  <h3>Key review moments</h3>

                  {criticalMoves.map((move, index) => (
                    <div
                      className="shared-game-card__critical-move"
                      key={`${move.ply || index}-${getMoveSan(move)}`}
                    >
                      <span className="shared-game-card__critical-index">
                        {getMoveNumber(move, index)}
                      </span>

                      <div>
                        <strong>{getMoveSan(move)}</strong>
                        <small>{getMoveLabel(move)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="inline-note">
                  Review saved. No critical move found in this payload.
                </p>
              )}
            </section>
          ) : (
            <p className="inline-note">
              This post has no saved review payload yet.
            </p>
          )}

          <footer className="shared-game-card__footer">
            <span>{getLikeCount(sharedGame)} likes</span>
            <span>{getCommentCount(sharedGame)} comments</span>

            <Link className="btn btn--ghost" to={`/shared-games/${sharedGameId}`}>
              Open discussion
            </Link>
          </footer>
        </div>
      </div>
    </article>
  );
}