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

function getAuthorLabel(sharedGame) {
  const author = getAuthor(sharedGame);
  const label = getUserDisplayName(author);

  if (label && label !== 'Utilisateur' && label !== 'Unknown user') {
    return label;
  }

  return (
    sharedGame?.username ||
    sharedGame?.author?.username ||
    sharedGame?.user?.username ||
    sharedGame?.email ||
    'Unknown user'
  );
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
    summary?.accuracyWhite ??
    summary?.white?.accuracy ??
    review?.accuracyWhite ??
    review?.whiteAccuracy ??
    review?.accuracy?.white
  );
}

function getBlackAccuracy(review, summary) {
  return (
    summary?.accuracyBlack ??
    summary?.black?.accuracy ??
    review?.accuracyBlack ??
    review?.blackAccuracy ??
    review?.accuracy?.black
  );
}

function getAverageAccuracy(review, summary) {
  const explicit = summary?.averageAccuracy ?? review?.summary?.averageAccuracy;

  if (explicit !== undefined && explicit !== null) {
    return explicit;
  }

  const white = Number(getWhiteAccuracy(review, summary));
  const black = Number(getBlackAccuracy(review, summary));

  if (Number.isFinite(white) && Number.isFinite(black)) {
    return (white + black) / 2;
  }

  if (Number.isFinite(white)) {
    return white;
  }

  if (Number.isFinite(black)) {
    return black;
  }

  return null;
}

function getCardCriticalMoves(review, summary) {
  const fromSummary = Array.isArray(summary?.criticalMoves)
    ? summary.criticalMoves
    : [];

  if (fromSummary.length > 0) {
    return fromSummary.slice(0, 3);
  }

  return getCriticalMoves(review, 3);
}

function getMoveSan(move) {
  return move.playedSan || move.san || move.move || move.bestSan || move.bestMove || 'Move';
}

function getMoveLabel(move) {
  return move.label || move.category || move.classification || 'Review point';
}

export default function SharedGameCard({ sharedGame }) {
  const id = getSharedGameId(sharedGame);
  const authorName = getAuthorLabel(sharedGame);
  const pgn = sharedGame.pgn || sharedGame.game?.pgn || '';
  const pgnSummary = summarizePgn(pgn);
  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);
  const reviewed = hasSharedReview(sharedGame);
  const criticalMoves = getCardCriticalMoves(review, summary);

  const title = getSharedGameTitle(sharedGame);
  const status = sharedGame.moderation_status || sharedGame.moderationStatus || 'visible';
  const visibility = sharedGame.visibility || 'public';

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

  const result = summary?.result || sharedGame.result || pgnSummary.result || '*';

  return (
    <article className="shared-game-card shared-game-card--post">
      <div className="shared-game-card__side">
        <ChessPreview pgn={pgn} sharedGame={sharedGame} compact />
      </div>

      <div className="shared-game-card__body">
        <header className="shared-game-card__header">
          <div className="post-author-badge">
            <span className="post-author-badge__avatar">{getInitial(authorName)}</span>
            <span>
              <strong>{authorName}</strong>
              <small>{formatDate(sharedGame.created_at || sharedGame.createdAt)}</small>
            </span>
          </div>

          <div className="shared-game-card__badges">
            <span className="badge">{reviewed ? 'Review' : 'Game'}</span>
            <span className="badge badge--muted">{visibility}</span>
            {status !== 'visible' ? <span className="badge badge--warning">{status}</span> : null}
          </div>
        </header>

        <div className="shared-game-card__title-row">
          <div>
            <h2>{title}</h2>
            <p className="shared-game-card__match">
              {whiteName} vs {blackName} · {result}
            </p>
          </div>

          <Link className="btn btn--ghost" to={`/shared-games/${id}`}>
            Open review
          </Link>
        </div>

        {sharedGame.description ? (
          <p className="shared-game-card__description">{sharedGame.description}</p>
        ) : null}

        {reviewed ? (
          <section className="shared-game-card__review-strip" aria-label="Review preview">
            <div className="shared-game-card__stats">
              <span>
                <small>Average</small>
                <strong>{formatAccuracy(getAverageAccuracy(review, summary))}</strong>
              </span>
              <span>
                <small>White</small>
                <strong>{formatAccuracy(getWhiteAccuracy(review, summary))}</strong>
              </span>
              <span>
                <small>Black</small>
                <strong>{formatAccuracy(getBlackAccuracy(review, summary))}</strong>
              </span>
            </div>

            {criticalMoves.length > 0 ? (
              <div className="shared-game-card__moments">
                {criticalMoves.map((move, index) => (
                  <span key={`${move.ply ?? index}-${getMoveSan(move)}`}>
                    <strong>{getMoveSan(move)}</strong>
                    <small>{getMoveLabel(move)}</small>
                  </span>
                ))}
              </div>
            ) : (
              <p className="inline-note">Review saved. Open the review to inspect every move.</p>
            )}
          </section>
        ) : (
          <p className="inline-note">This post does not contain a saved review payload yet.</p>
        )}

        <footer className="shared-game-card__footer">
          <span>{getLikeCount(sharedGame)} likes</span>
          <span>{getCommentCount(sharedGame)} comments</span>
        </footer>
      </div>
    </article>
  );
}