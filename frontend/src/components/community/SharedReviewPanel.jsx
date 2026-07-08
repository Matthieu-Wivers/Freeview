import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

import {
  getSharedReview,
  getSharedReviewSummary,
} from '../../utils/sharedReview';

const CATEGORY_LABELS = {
  theory: 'Theory',
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  miss: 'Miss',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatAccuracy(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 'N/A';
  }

  return `${Math.round(number)}%`;
}

function formatEval(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 'N/A';
  }

  return `${number >= 0 ? '+' : ''}${number.toFixed(1)}`;
}

function getReviewCategoryClass(category) {
  return `review-table-badge review-table-badge--${category || 'good'}`;
}

function getMoveLabel(move) {
  const category = move?.category || 'good';
  return move?.label || CATEGORY_LABELS[category] || 'Review point';
}

function getMoveSan(move) {
  return move?.playedSan || move?.san || move?.move || move?.bestSan || move?.bestMove || 'Move';
}

function getHeaders(chess) {
  if (typeof chess.getHeaders === 'function') {
    return chess.getHeaders();
  }

  if (typeof chess.header === 'function') {
    return chess.header();
  }

  return {};
}

function parsePgnToReviewModel(pgn) {
  const chess = new Chess();

  try {
    chess.loadPgn(pgn || '');
  } catch {
    const empty = new Chess();

    return {
      history: [],
      fens: [empty.fen()],
      headers: {},
      isValid: false,
    };
  }

  const replay = new Chess();
  const history = chess.history({ verbose: true });
  const fens = [replay.fen()];

  for (const move of history) {
    replay.move(move);
    fens.push(replay.fen());
  }

  return {
    history,
    fens,
    headers: getHeaders(chess),
    isValid: true,
  };
}

function buildMoveRows(history) {
  const rows = [];

  for (let index = 0; index < history.length; index += 2) {
    rows.push({
      moveNumber: Math.floor(index / 2) + 1,
      whiteMove: history[index] ?? null,
      blackMove: history[index + 1] ?? null,
    });
  }

  return rows;
}

function getPlayerName(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.name || fallback;
}

function useResponsiveBoardWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(340);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return undefined;
    }

    function updateWidth() {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);
      const safeWidth = Math.max(240, Math.min(520, nextWidth));
      setWidth(safeWidth);
    }

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

export default function SharedReviewPanel({ sharedGame }) {
  const pgn = sharedGame?.pgn || sharedGame?.game?.pgn || '';
  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);

  const { history, fens, headers, isValid } = useMemo(() => parsePgnToReviewModel(pgn), [pgn]);
  const moveRows = useMemo(() => buildMoveRows(history), [history]);

  const [boardContainerRef, boardWidth] = useResponsiveBoardWidth();
  const [currentPly, setCurrentPly] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState('white');

  useEffect(() => {
    setCurrentPly(0);
  }, [pgn]);

  const totalPlies = history.length;
  const currentFen = fens[currentPly] || fens[0] || new Chess().fen();

  const moveReviewsByPly = useMemo(() => {
    const map = new Map();

    for (const move of review?.moveReviews ?? []) {
      const ply = Number(move.ply);

      if (Number.isFinite(ply)) {
        map.set(ply, move);
      }
    }

    for (const move of summary?.criticalMoves ?? []) {
      const ply = Number(move.ply);

      if (Number.isFinite(ply) && !map.has(ply)) {
        map.set(ply, move);
      }
    }

    return map;
  }, [review, summary]);

  const selectedMoveReview = currentPly > 0 ? moveReviewsByPly.get(currentPly) ?? null : null;

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

  const categoryCounts = summary?.categoryCounts ?? review?.categoryCounts ?? {};
  const criticalMoves = Array.isArray(summary?.criticalMoves) ? summary.criticalMoves : [];

  const whiteName =
    getPlayerName(summary?.white, null) ||
    sharedGame?.white_player ||
    sharedGame?.whitePlayer ||
    headers?.White ||
    'White';

  const blackName =
    getPlayerName(summary?.black, null) ||
    sharedGame?.black_player ||
    sharedGame?.blackPlayer ||
    headers?.Black ||
    'Black';

  const result =
    summary?.result ||
    sharedGame?.result ||
    headers?.Result ||
    '*';

  function goToPly(nextPly) {
    setCurrentPly(Math.max(0, Math.min(totalPlies, nextPly)));
  }

  return (
    <section className="shared-review-live">
      <div className="shared-review-live__board-column">
        <article className="shared-review-live__board-card">
          <div className="shared-review-live__board-frame" ref={boardContainerRef}>
            <Chessboard
              id={`shared-review-board-${sharedGame?.id || 'review'}`}
              position={currentFen}
              boardWidth={boardWidth}
              arePiecesDraggable={false}
              boardOrientation={boardOrientation}
              customBoardStyle={{
                borderRadius: '18px',
                overflow: 'hidden',
              }}
            />
          </div>

          <div className="shared-review-live__board-meta">
            <strong>{whiteName} vs {blackName}</strong>
            <span>
              {result} · {Math.ceil(totalPlies / 2)} moves
            </span>
          </div>

          <div className="shared-review-live__controls" aria-label="Board controls">
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => goToPly(0)}
              disabled={currentPly === 0}
            >
              Start
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => goToPly(currentPly - 1)}
              disabled={currentPly === 0}
            >
              Prev
            </button>

            <span className="shared-review-live__ply">
              {currentPly}/{totalPlies}
            </span>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => goToPly(currentPly + 1)}
              disabled={currentPly >= totalPlies}
            >
              Next
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => goToPly(totalPlies)}
              disabled={currentPly >= totalPlies}
            >
              End
            </button>

            <button
              className="btn btn--secondary"
              type="button"
              onClick={() =>
                setBoardOrientation((value) => (value === 'white' ? 'black' : 'white'))
              }
            >
              Flip
            </button>
          </div>
        </article>

        <article className="shared-review-live__focus-card">
          <p className="eyebrow">Selected move</p>

          {selectedMoveReview ? (
            <>
              <div className="selected-move-card__top">
                <h3>
                  Move {selectedMoveReview.moveNumber ?? Math.ceil(currentPly / 2)} ·{' '}
                  {getMoveSan(selectedMoveReview)}
                </h3>
                <span className={getReviewCategoryClass(selectedMoveReview.category)}>
                  {getMoveLabel(selectedMoveReview)}
                </span>
              </div>

              <p>
                {selectedMoveReview.comment || 'No engine comment is available for this move.'}
              </p>

              <div className="selected-move-card__meta">
                {selectedMoveReview.bestSan || selectedMoveReview.bestMove ? (
                  <span>Best move: {selectedMoveReview.bestSan ?? selectedMoveReview.bestMove}</span>
                ) : null}

                <span>Loss: {safeNumber(selectedMoveReview.loss, 0).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <h3>Start position</h3>
              <p>Click a move or a critical moment to inspect the review directly on the board.</p>
            </>
          )}
        </article>
      </div>

      <div className="shared-review-live__review-column">
        <article className="shared-review-live__summary-card">
          <div className="shared-review-live__section-header">
            <div>
              <p className="eyebrow">Engine review</p>
              <h2>Game overview</h2>
            </div>

            {!isValid ? (
              <span className="badge badge--warning">PGN unavailable</span>
            ) : null}
          </div>

          <div className="review-stat-grid">
            <article className="review-stat-card">
              <small>Average accuracy</small>
              <strong>{formatAccuracy(averageAccuracy)}</strong>
              <span>Both players</span>
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
              <strong>{formatEval(summary?.finalEvaluation ?? review?.finalEvaluation)}</strong>
              <span>White perspective</span>
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
                  {CATEGORY_LABELS[category] || category}
                </span>
              ))}
          </div>
        </article>

        {criticalMoves.length > 0 ? (
          <article className="shared-review-live__critical-card">
            <div className="shared-review-live__section-header">
              <div>
                <p className="eyebrow">Critical moments</p>
                <h2>Key positions</h2>
              </div>
            </div>

            <div className="critical-shortcut-grid">
              {criticalMoves.map((move, index) => {
                const targetPly = safeNumber(move.ply, 0);

                return (
                  <button
                    key={`${move.ply ?? index}-${getMoveSan(move)}`}
                    type="button"
                    className={`critical-shortcut-card${currentPly === targetPly ? ' is-active' : ''}`}
                    onClick={() => goToPly(targetPly)}
                  >
                    <strong>Move {move.moveNumber ?? Math.ceil(targetPly / 2)}</strong>
                    <span>{getMoveSan(move)}</span>
                    <small>{getMoveLabel(move)}</small>
                  </button>
                );
              })}
            </div>
          </article>
        ) : null}

        <article className="shared-review-live__moves-card">
          <div className="shared-review-live__section-header">
            <div>
              <p className="eyebrow">Moves</p>
              <h2>Move list</h2>
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
                            onClick={() => goToPly(whitePly)}
                          >
                            <span>{row.whiteMove.san}</span>
                            {whiteReview ? (
                              <small className={getReviewCategoryClass(whiteReview.category)}>
                                {getMoveLabel(whiteReview)}
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
                            onClick={() => goToPly(blackPly)}
                          >
                            <span>{row.blackMove.san}</span>
                            {blackReview ? (
                              <small className={getReviewCategoryClass(blackReview.category)}>
                                {getMoveLabel(blackReview)}
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
        </article>
      </div>
    </section>
  );
}