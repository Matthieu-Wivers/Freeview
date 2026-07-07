import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { AccuracySummary } from '../components/Analyse/AccuracySummary';
import { ChessBoardPanel } from '../components/Analyse/ChessBoardPanel';
import { EvalChart } from '../components/Analyse/EvalChart';
import { GameHeader } from '../components/Analyse/GameHeader';
import { MovesSidebar } from '../components/Analyse/MovesSidebar';
import { PgnInputPanel } from '../components/Analyse/PgnInputPanel';
import { samplePgn } from '../data/samplePgn';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { createSharedGame, importGame } from '../services/freeviewApi';
import { createChessFromFen, getFenAtPly } from '../utils/chess';
import { parsePgn } from '../utils/pgn';
import {
  buildReviewDescription,
  buildReviewSummary,
  buildReviewTitle,
} from '../utils/sharedReview';
import {
  analyzeGameWithStockfish,
  analyzeSandboxMoveWithStockfish,
} from '../utils/stockfishAnalysis';

const QUERY_PGN_KEYS = ['pgn', 'PGN', 'game', 'Game'];

function safeDecodeQueryValue(value) {
  const valueWithSpaces = value.replace(/\+/g, ' ');

  try {
    return decodeURIComponent(valueWithSpaces);
  } catch {
    return valueWithSpaces;
  }
}

function extractPgnFromSearch(search) {
  const rawSearch = search.startsWith('?') ? search.slice(1) : search;

  if (!rawSearch.trim()) {
    return '';
  }

  const params = new URLSearchParams(rawSearch);

  for (const key of QUERY_PGN_KEYS) {
    const value = params.get(key);

    if (value?.trim()) {
      return value.trim();
    }
  }

  return safeDecodeQueryValue(rawSearch).trim();
}

function getGamePgn(game, pgnInput) {
  return game?.normalizedPgn || pgnInput.trim();
}

function buildSerializableReviewPayload(game, review) {
  const summary = buildReviewSummary(game, review);

  const compactMoveReviews = Array.isArray(review?.moveReviews)
    ? review.moveReviews.map((move, index) => ({
        ply: Number(move.ply ?? index + 1),
        moveNumber: move.moveNumber ?? Math.ceil(Number(move.ply ?? index + 1) / 2),
        playedSan: move.playedSan ?? move.san ?? move.move ?? null,
        san: move.san ?? move.playedSan ?? move.move ?? null,
        bestSan: move.bestSan ?? move.bestMoveSan ?? null,
        bestMove: move.bestMove ?? null,
        category: move.category ?? 'good',
        label: move.label ?? move.category ?? 'Good move',
        loss: Number(move.loss ?? 0),
        comment: move.comment ?? '',
      }))
    : [];

  const compactCriticalMoves = compactMoveReviews
    .filter((move) => ['inaccuracy', 'miss', 'mistake', 'blunder'].includes(move.category))
    .sort((left, right) => Number(right.loss ?? 0) - Number(left.loss ?? 0))
    .slice(0, 10);

  return {
    accuracyWhite: Number(review?.accuracyWhite ?? 0),
    accuracyBlack: Number(review?.accuracyBlack ?? 0),
    averageLossWhite: Number(review?.averageLossWhite ?? 0),
    averageLossBlack: Number(review?.averageLossBlack ?? 0),
    finalEvaluation: Number(review?.finalEvaluation ?? 0),
    categoryCounts: summary.categoryCounts ?? {},
    moveReviews: compactMoveReviews,
    summary: {
      white: summary.white,
      black: summary.black,
      result: summary.result,
      moveCount: summary.moveCount,
      accuracyWhite: summary.accuracyWhite,
      accuracyBlack: summary.accuracyBlack,
      averageAccuracy: summary.averageAccuracy,
      averageLossWhite: summary.averageLossWhite,
      averageLossBlack: summary.averageLossBlack,
      finalEvaluation: summary.finalEvaluation,
      categoryCounts: summary.categoryCounts ?? {},
      criticalMoves: compactCriticalMoves,
    },
  };
}

export default function Analyse() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [pgnInput, setPgnInput] = useState('');
  const [game, setGame] = useState(null);
  const [review, setReview] = useState(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [showBestMove, setShowBestMove] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sandboxFen, setSandboxFen] = useState(null);
  const [sandboxFeedback, setSandboxFeedback] = useState(null);
  const [visiblePgnArea, setVisiblePgnArea] = useState(false);
  const [shareTitle, setShareTitle] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [shareVisibility, setShareVisibility] = useState('public');
  const [shareError, setShareError] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const autoAnalyzedPgnRef = useRef(null);

  const playedMoveReview =
    currentPly > 0 ? review?.moveReviews?.[currentPly - 1] ?? null : null;

  const positionReview = review?.moveReviews?.[currentPly] ?? null;

  const clearSandbox = useCallback(() => {
    setSandboxFen(null);
    setSandboxFeedback(null);
  }, []);

  const runAnalysis = useCallback(async (rawPgn) => {
    setIsLoading(true);
    setError(null);
    setShareError(null);

    try {
      const parsed = parsePgn(rawPgn);
      const analyzed = await analyzeGameWithStockfish(parsed);

      setGame(parsed);
      setReview(analyzed);
      setCurrentPly(0);
      setSandboxFen(null);
      setSandboxFeedback(null);
      setVisiblePgnArea(false);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'An unknown error happened during analysis.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlPgn = extractPgnFromSearch(location.search);

    if (!urlPgn) {
      autoAnalyzedPgnRef.current = null;
      return;
    }

    if (autoAnalyzedPgnRef.current === urlPgn) {
      return;
    }

    autoAnalyzedPgnRef.current = urlPgn;
    setPgnInput(urlPgn);
    setVisiblePgnArea(false);
    void runAnalysis(urlPgn);
  }, [location.search, runAnalysis]);

  useEffect(() => {
    if (!game || !review) {
      return;
    }

    setShareTitle(buildReviewTitle(game));
    setShareDescription(buildReviewDescription(game, review));
    setShareVisibility('public');
  }, [game, review]);

  const maxPly = game?.moves.length ?? 0;

  const officialFen = useMemo(() => {
    if (!game) {
      return 'start';
    }

    return getFenAtPly(game, currentPly);
  }, [game, currentPly]);

  const boardFen = sandboxFen ?? officialFen;
  const currentEval = review?.evaluations?.[currentPly] ?? 0;

  const goPrev = useCallback(() => {
    setCurrentPly((value) => Math.max(value - 1, 0));
    clearSandbox();
  }, [clearSandbox]);

  const goNext = useCallback(() => {
    setCurrentPly((value) => Math.min(value + 1, maxPly));
    clearSandbox();
  }, [clearSandbox, maxPly]);

  const jumpToPly = useCallback(
    (ply) => {
      setCurrentPly(ply);
      clearSandbox();
    },
    [clearSandbox],
  );

  const resetSandbox = useCallback(() => {
    clearSandbox();
  }, [clearSandbox]);

  useKeyboardNavigation({
    max: maxPly,
    onPrev: goPrev,
    onNext: goNext,
  });

  const handlePieceDrop = useCallback(
    (sourceSquare, targetSquare) => {
      const chess = createChessFromFen(boardFen);

      try {
        const move = chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });

        if (!move) {
          return false;
        }

        const nextFen = chess.fen();
        const uci = `${move.from}${move.to}${move.promotion ?? ''}`;

        setSandboxFen(nextFen);
        setSandboxFeedback(null);

        void analyzeSandboxMoveWithStockfish(boardFen, nextFen, uci, move.san)
          .then(setSandboxFeedback)
          .catch(() => {
            setSandboxFeedback(null);
          });

        return true;
      } catch {
        return false;
      }
    },
    [boardFen],
  );

  const loadSample = () => {
    setPgnInput(samplePgn);
  };

  const togglePgnInput = () => {
    setVisiblePgnArea((value) => !value);
  };

  const publishReview = async (event) => {
    event.preventDefault();

    if (!game || !review) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: `${location.pathname}${location.search}`,
        },
      });
      return;
    }

    const pgn = getGamePgn(game, pgnInput);

    if (!pgn) {
      setShareError('The PGN is missing.');
      return;
    }

    setIsPublishing(true);
    setShareError(null);

    try {
      const savedGame = await importGame({
        pgn,
        whitePlayer: game.headers.White ?? null,
        blackPlayer: game.headers.Black ?? null,
        result: game.headers.Result ?? null,
        source: 'pgn_import',
      });

      const reviewPayload = buildSerializableReviewPayload(game, review);
      const analysisSummary = reviewPayload.summary;
      const reviewedAt = new Date().toISOString();

      const sharedGame = await createSharedGame({
        gameId: savedGame.id,
        game_id: savedGame.id,
        title: shareTitle.trim(),
        description: shareDescription.trim(),
        visibility: shareVisibility,
        review: reviewPayload,
        reviewPayload,
        review_payload: reviewPayload,
        analysis: reviewPayload,
        analysisSummary,
        analysis_summary: analysisSummary,
        summary: analysisSummary,
        reviewedAt,
        reviewed_at: reviewedAt,
      });

      navigate(`/shared-games/${sharedGame.id}`);
    } catch (publishError) {
      setShareError(
        publishError instanceof Error
          ? publishError.message
          : 'The review could not be published.',
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="page-shell">
      <main className="app-content analysis-review-shell">
        {game && review ? (
          <aside className="analysis-side-actions" aria-label="Review actions">
            <button className="side-action-button" type="button" onClick={togglePgnInput}>
              {visiblePgnArea ? 'Hide PGN input' : 'Show PGN input'}
            </button>

            <button
              className="side-action-button side-action-button--primary"
              type="button"
              onClick={() =>
                document
                  .getElementById('share-review-panel')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Share review
            </button>

            <button
              className="side-action-button"
              type="button"
              onClick={() => navigate('/community')}
            >
              Community
            </button>
          </aside>
        ) : null}

        {!game || !review || visiblePgnArea ? (
          <PgnInputPanel
            value={pgnInput}
            onChange={setPgnInput}
            onAnalyze={() => void runAnalysis(pgnInput)}
            onLoadSample={() => {
              setPgnInput('');
            }}
            loadSample={loadSample}
            isLoading={isLoading}
            error={error}
          />
        ) : null}

        {game && review ? (
          <>
            <section
              className="review-share-panel review-share-panel--side"
              id="share-review-panel"
            >
              <div>
                <p className="eyebrow">Ready to share</p>
                <h2>Publish this analyzed review</h2>
                <p>
                  This will save the PGN and a compact review payload for the community.
                </p>
              </div>

              <form className="review-share-form" onSubmit={publishReview}>
                <label className="form-field">
                  Title
                  <input
                    type="text"
                    value={shareTitle}
                    onChange={(event) => setShareTitle(event.target.value)}
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </label>

                <label className="form-field">
                  Description
                  <textarea
                    value={shareDescription}
                    onChange={(event) => setShareDescription(event.target.value)}
                    maxLength={4000}
                    rows={5}
                  />
                </label>

                <label className="form-field">
                  Visibility
                  <select
                    value={shareVisibility}
                    onChange={(event) => setShareVisibility(event.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </label>

                {shareError ? <p className="error-text">{shareError}</p> : null}

                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={isPublishing || shareTitle.trim().length < 3}
                >
                  {isPublishing ? 'Publishing review...' : 'Publish review'}
                </button>
              </form>
            </section>

            <div className="top-grid">
              <GameHeader headers={game.headers} />

              <AccuracySummary
                whiteName={game.headers.White ?? 'White'}
                blackName={game.headers.Black ?? 'Black'}
                accuracyWhite={review.accuracyWhite}
                accuracyBlack={review.accuracyBlack}
              />
            </div>

            <EvalChart
              evaluations={review.evaluations}
              currentPly={currentPly}
              onSelect={jumpToPly}
            />

            <div className="main-grid main-grid--review-first">
              <ChessBoardPanel
                game={game}
                currentPly={currentPly}
                boardFen={boardFen}
                boardOrientation={boardOrientation}
                onPieceDrop={handlePieceDrop}
                onFlip={() =>
                  setBoardOrientation((value) => (value === 'white' ? 'black' : 'white'))
                }
                onPrev={goPrev}
                onNext={goNext}
                showBestMove={showBestMove}
                onToggleBestMove={() => setShowBestMove((value) => !value)}
                sandboxFeedback={sandboxFeedback}
                isSandboxActive={Boolean(sandboxFen)}
                onResetSandbox={resetSandbox}
                playedMoveReview={playedMoveReview}
                positionReview={positionReview}
              />

              <MovesSidebar
                game={game}
                review={review}
                currentPly={currentPly}
                currentEval={currentEval}
                currentMoveIndex={currentPly}
                sandboxFeedback={sandboxFeedback}
                onJumpToPly={jumpToPly}
              />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}