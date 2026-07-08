import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

import { summarizePgn } from '../../utils/pgn';
import {
  getCriticalMoves,
  getSharedReview,
  getSharedReviewSummary,
} from '../../utils/sharedReview';

function getHeaders(chess) {
  if (typeof chess.getHeaders === 'function') {
    return chess.getHeaders();
  }

  if (typeof chess.header === 'function') {
    return chess.header();
  }

  return {};
}

function parsePgnToModel(pgn) {
  const empty = new Chess();

  if (!pgn?.trim()) {
    return {
      history: [],
      fens: [empty.fen()],
      headers: {},
      isValid: false,
    };
  }

  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch {
    return {
      history: [],
      fens: [empty.fen()],
      headers: {},
      isValid: false,
    };
  }

  const history = chess.history({ verbose: true });
  const replay = new Chess();
  const fens = [replay.fen()];

  for (const move of history) {
    try {
      replay.move(move.san);
      fens.push(replay.fen());
    } catch {
      break;
    }
  }

  return {
    history,
    fens,
    headers: getHeaders(chess),
    isValid: true,
  };
}

function safePly(value, maxPly) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.max(0, Math.min(maxPly, number));
}

function getFirstCriticalPly(sharedGame, maxPly) {
  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);

  const summaryCriticalMoves = Array.isArray(summary?.criticalMoves)
    ? summary.criticalMoves
    : [];

  const reviewCriticalMoves = getCriticalMoves(review, 1);

  const firstCriticalMove = summaryCriticalMoves[0] || reviewCriticalMoves[0];
  const ply = safePly(firstCriticalMove?.ply, maxPly);

  return ply;
}

function getMoveLabel(moveReview) {
  return (
    moveReview?.label ||
    moveReview?.category ||
    moveReview?.classification ||
    'Review point'
  );
}

function getMoveSan(moveReview, currentMove) {
  return (
    moveReview?.playedSan ||
    moveReview?.san ||
    moveReview?.move ||
    currentMove?.san ||
    'Move'
  );
}

function getReviewBadgeClass(category) {
  return `review-table-badge review-table-badge--${category || 'good'}`;
}

function useBoardWidth(compact) {
  const ref = useRef(null);
  const [width, setWidth] = useState(compact ? 220 : 320);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return undefined;
    }

    function updateWidth() {
      const availableWidth = Math.floor(element.getBoundingClientRect().width);
      const maxWidth = compact ? 260 : 420;
      const minWidth = compact ? 180 : 240;

      setWidth(Math.max(minWidth, Math.min(maxWidth, availableWidth)));
    }

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [compact]);

  return [ref, width];
}

export default function ChessPreview({
  pgn = '',
  sharedGame = null,
  compact = false,
}) {
  const pgnSummary = useMemo(() => summarizePgn(pgn), [pgn]);
  const { history, fens, headers, isValid } = useMemo(() => parsePgnToModel(pgn), [pgn]);

  const totalPlies = history.length;
  const firstCriticalPly = useMemo(
    () => getFirstCriticalPly(sharedGame, totalPlies),
    [sharedGame, totalPlies],
  );

  const defaultPly = firstCriticalPly ?? Math.min(totalPlies, compact ? 8 : 12);

  const [currentPly, setCurrentPly] = useState(defaultPly);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [boardRef, boardWidth] = useBoardWidth(compact);

  useEffect(() => {
    setCurrentPly(defaultPly);
  }, [defaultPly, pgn]);

  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);

  const reviewByPly = useMemo(() => {
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

  const currentFen = fens[currentPly] || fens[0] || new Chess().fen();
  const currentMove = currentPly > 0 ? history[currentPly - 1] : null;
  const currentReview = currentPly > 0 ? reviewByPly.get(currentPly) : null;

  const whiteName =
    summary?.white?.name ||
    summary?.white ||
    sharedGame?.white_player ||
    sharedGame?.whitePlayer ||
    headers?.White ||
    pgnSummary.white ||
    'White';

  const blackName =
    summary?.black?.name ||
    summary?.black ||
    sharedGame?.black_player ||
    sharedGame?.blackPlayer ||
    headers?.Black ||
    pgnSummary.black ||
    'Black';

  const result =
    summary?.result ||
    sharedGame?.result ||
    headers?.Result ||
    pgnSummary.result ||
    '*';

  function goToPly(nextPly) {
    setCurrentPly(Math.max(0, Math.min(totalPlies, nextPly)));
  }

  function goToCriticalMove() {
    if (firstCriticalPly !== null && firstCriticalPly !== undefined) {
      goToPly(firstCriticalPly);
    }
  }

  return (
    <section className={`community-review-board${compact ? ' community-review-board--compact' : ''}`}>
      <div className="community-review-board__frame" ref={boardRef}>
        <Chessboard
          id={`community-review-board-${sharedGame?.id || pgnSummary.white || 'preview'}`}
          position={currentFen}
          boardWidth={boardWidth}
          arePiecesDraggable={false}
          boardOrientation={boardOrientation}
          customBoardStyle={{
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        />
      </div>

      <div className="community-review-board__meta">
        <strong>
          {whiteName} vs {blackName}
        </strong>
        <span>
          {result} · {Math.ceil(totalPlies / 2)} moves
        </span>

        {!isValid ? (
          <small>PGN unavailable</small>
        ) : null}
      </div>

      <div className="community-review-board__controls" aria-label="Board preview controls">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => goToPly(currentPly - 1)}
          disabled={currentPly <= 0}
        >
          Prev
        </button>

        <span className="community-review-board__ply">
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
          className="btn btn--secondary"
          type="button"
          onClick={goToCriticalMove}
          disabled={firstCriticalPly === null || firstCriticalPly === undefined}
        >
          Key move
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

      <div className="community-review-board__current">
        {currentReview ? (
          <>
            <span className={getReviewBadgeClass(currentReview.category)}>
              {getMoveLabel(currentReview)}
            </span>
            <strong>{getMoveSan(currentReview, currentMove)}</strong>
          </>
        ) : currentMove ? (
          <>
            <span className="review-table-badge review-table-badge--good">
              Move
            </span>
            <strong>{currentMove.san}</strong>
          </>
        ) : (
          <>
            <span className="review-table-badge review-table-badge--good">
              Start
            </span>
            <strong>Initial position</strong>
          </>
        )}
      </div>
    </section>
  );
}