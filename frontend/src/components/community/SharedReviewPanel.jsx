import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

import {
  getSharedReview,
  getSharedReviewSummary,
} from '../../utils/sharedReview';

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function formatAccuracy(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 'N/A';
  }

  return `${Math.round(number)}%`;
}

function getReviewCategoryClass(category) {
  return `review-table-badge review-table-badge--${category || 'good'}`;
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

function parsePgnToReviewModel(pgn) {
  const chess = new Chess();

  try {
    chess.loadPgn(pgn || '');
  } catch {
    return {
      history: [],
      fens: [new Chess().fen()],
      headers: {},
    };
  }

  const replay = new Chess();
  const history = chess.history({ verbose: true });
  const fens = [replay.fen()];

  history.forEach((move) => {
    replay.move(move);
    fens.push(replay.fen());
  });

  return {
    history,
    fens,
    headers: chess.header(),
  };
}

function buildMoveRows(history) {
  const rows = [];

  for (let index = 0; index < history.length; index += 2) {
    const whiteMove = history[index];
    const blackMove = history[index + 1] ?? null;

    rows.push({
      moveNumber: Math.floor(index / 2) + 1,
      whiteMove,
      blackMove,
    });
  }

  return rows;
}

export default function SharedReviewPanel({ sharedGame }) {
  const pgn = sharedGame?.pgn || sharedGame?.game?.pgn || '';
  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);

  const { history, fens, headers } = useMemo(() => parsePgnToReviewModel(pgn), [pgn]);

  const [currentPly, setCurrentPly] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState('white');

  const moveRows = useMemo(() => buildMoveRows(history), [history]);

  const moveReviewsByPly = useMemo(() => {
    const map = new Map();

    for (const move of review?.moveReviews ?? []) {
      map.set(Number(move.ply), move);
    }

    return map;
  }, [review]);

  const selectedMoveReview = currentPly > 0 ? moveReviewsByPly.get(currentPly) ?? null : null;
  const currentFen = fens[currentPly] ?? fens[0] ?? new Chess().fen();

  const whiteAccuracy =
    summary?.accuracyWhite ??
    summary?.white?.accuracy ??
    review?.accuracyWhite;

  const blackAccuracy =
    summary?.accuracyBlack ??
    summary?.black?.accuracy ??
    review?.accuracyBlack;

  const averageAccuracy =
    summary?.averageAccuracy ??
    (() => {
      const white = Number(whiteAccuracy);
      const black = Number(blackAccuracy);

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
    })();

  const categoryCounts =
    summary?.categoryCounts ??
    review?.categoryCounts ??
    {};

  const criticalMoves = Array.isArray(summary?.criticalMoves)
    ? summary.criticalMoves
    : [];

  const totalPlies = history.length;

  const whiteName =
    summary?.white?.name ||
    summary?.white ||
    sharedGame?.white_player ||
    sharedGame?.whitePlayer ||
    headers?.White ||
    'White';

  const blackName =
    summary?.black?.name ||
    summary?.black ||
    sharedGame?.black_player ||
    sharedGame?.blackPlayer ||
    headers?.Black ||
    'Black';

  const result =
    summary?.result ||
    sharedGame?.result ||
    headers?.Result ||
    '*';

  return (
    <section className="shared-review-live">
      <div className="shared-review-live__board">
        <div className="shared-review-live__board-card">
          <Chessboard
            id={`shared-review-board-${sharedGame?.id ?? 'review'}`}
            position={currentFen}
            boardWidth={360}
            arePiecesDraggable={false}
            boardOrientation={boardOrientation}
          />

          <div className="shared-review-live__board-meta">
            <strong>
              {whiteName} vs {blackName}
            </strong>
            <span>
              {result} · {Math.ceil(totalPlies / 2)} moves
            </span>
          </div>

          <div className="shared-review-live__controls">
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setCurrentPly(0)}
              disabled={currentPly === 0}
            >
              Start
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setCurrentPly((value) => Math.max(0, value - 1))}
              disabled={currentPly === 0}
            >
              Prev
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setCurrentPly((value) => Math.min(totalPlies, value + 1))}
              disabled={currentPly >= totalPlies}
            >
              Next
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setCurrentPly(totalPlies)}
              disabled={currentPly >= totalPlies}
            >
              End
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() =>
                setBoardOrientation((value) => (value === 'white' ? 'black' : 'white'))
              }
            >
              Flip
            </button>
          </div>
        </div>

        {criticalMoves.length > 0 ? (
          <div className="shared-review-live__critical-shortcuts">
            <p className="eyebrow">Critical moments</p>

            <div className="shared-review-live__critical-list">
              {criticalMoves.map((move, index) => {
                const targetPly = safeNumber(move.ply, 0);

                return (
                  <button
                    key={`${move.ply ?? index}-${move.playedSan ?? move.san ?? 'move'}`}
                    type="button"
                    className="critical-shortcut-card"
                    onClick={() => setCurrentPly(targetPly)}
                  >
                    <strong>
                      Move {move.moveNumber ?? Math.ceil(targetPly / 2)}
                    </strong>
                    <span>{move.playedSan ?? move.san ?? 'Move'}</span>
                    <small>{move.label ?? move.category ?? 'Critical moment'}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="shared-review-live__content">
        <div className="shared-review-live__summary">
          <p className="eyebrow">Engine review</p>
          <h2>Analyzed game overview</h2>

          <div className="review-stat-grid">
            <article className="review-stat-card">
              <small>Average accuracy</small>
              <strong>{formatAccuracy(averageAccuracy)}</strong>
              <span>Both players combined</span>
            </article>

            <article className="review-stat-card">
              <small>White accuracy</small>
              <strong>{formatAccuracy(whiteAccuracy)}</strong>
              <span>{whiteName}</span>
            </article>

            <article className="review-stat-card">
              <small>Black accuracy</small>
              <strong>{formatAccuracy(blackAccuracy)}</strong>
              <span>{blackName}</span>
            </article>

            <article className="review-stat-card">
              <small>Final eval</small>
              <strong>
                {Number.isFinite(Number(summary?.finalEvaluation ?? review?.finalEvaluation))
                  ? `${Number(summary?.finalEvaluation ?? review?.finalEvaluation) >= 0 ? '+' : ''}${Number(summary?.finalEvaluation ?? review?.finalEvaluation).toFixed(1)}`
                  : 'N/A'}
              </strong>
              <span>From White perspective</span>
            </article>
          </div>

          <div className="review-category-list">
            {Object.entries(categoryCounts)
              .filter(([, count]) => Number(count) > 0)
              .map(([category, count]) => (
                <span
                  key={category}
                  className={`review-category-pill review-category-pill--${category}`}
                >
                  <strong>{count}</strong>
                  {category}
                </span>
              ))}
          </div>
        </div>

        <div className="shared-review-live__focus">
          <div>
            <p className="eyebrow">Selected move</p>
            <h3>
              {selectedMoveReview
                ? `Move ${selectedMoveReview.moveNumber ?? Math.ceil(currentPly / 2)}`
                : 'Start position'}
            </h3>
          </div>

          {selectedMoveReview ? (
            <div className="selected-move-card">
              <div className="selected-move-card__top">
                <strong>{selectedMoveReview.playedSan ?? selectedMoveReview.san ?? 'Move'}</strong>
                <span className={getReviewCategoryClass(selectedMoveReview.category)}>
                  {selectedMoveReview.label ?? getMoveLabel(selectedMoveReview)}
                </span>
              </div>

              <p>
                {selectedMoveReview.comment || 'No engine comment available for this move.'}
              </p>

              <div className="selected-move-card__meta">
                {selectedMoveReview.bestSan || selectedMoveReview.bestMove ? (
                  <span>
                    Best move: {selectedMoveReview.bestSan ?? selectedMoveReview.bestMove}
                  </span>
                ) : null}

                <span>
                  Loss: {safeNumber(selectedMoveReview.loss, 0).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="selected-move-card">
              <p>
                Select a move from the move list or jump to a critical moment to inspect the review.
              </p>
            </div>
          )}
        </div>

        <div className="shared-review-live__moves">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Moves</p>
              <h3>Move list</h3>
            </div>
          </div>

          <div className="review-move-table-wrap">
            <table className="review-move-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>White</th>
                  <th>Black</th>
                </tr>
              </thead>
              <tbody>
                {moveRows.map((row) => {
                  const whitePly = (row.moveNumber - 1) * 2 + 1;
                  const blackPly = whitePly + 1;
                  const whiteReview = moveReviewsByPly.get(whitePly);
                  const blackReview = moveReviewsByPly.get(blackPly);

                  return (
                    <tr key={row.moveNumber}>
                      <td>{row.moveNumber}</td>

                      <td>
                        {row.whiteMove ? (
                          <button
                            type="button"
                            className={`move-link-button${currentPly === whitePly ? ' is-active' : ''}`}
                            onClick={() => setCurrentPly(whitePly)}
                          >
                            <span>{row.whiteMove.san}</span>
                            {whiteReview ? (
                              <small className={getReviewCategoryClass(whiteReview.category)}>
                                {whiteReview.label ?? getMoveLabel(whiteReview)}
                              </small>
                            ) : null}
                          </button>
                        ) : null}
                      </td>

                      <td>
                        {row.blackMove ? (
                          <button
                            type="button"
                            className={`move-link-button${currentPly === blackPly ? ' is-active' : ''}`}
                            onClick={() => setCurrentPly(blackPly)}
                          >
                            <span>{row.blackMove.san}</span>
                            {blackReview ? (
                              <small className={getReviewCategoryClass(blackReview.category)}>
                                {blackReview.label ?? getMoveLabel(blackReview)}
                              </small>
                            ) : null}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}