import { useCallback, useMemo, useState } from 'react';
import type { ParsedGame, SandboxFeedback } from './types/chess';
import { AccuracySummary } from './components/AccuracySummary';
import { ChessBoardPanel } from './components/ChessBoardPanel';
import { EvalChart } from './components/EvalChart';
import { GameHeader } from './components/GameHeader';
import { MovesSidebar } from './components/MovesSidebar';
import { PgnInputPanel } from './components/PgnInputPanel';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { samplePgn } from './data/samplePgn';
import { analyzeGame, analyzeSandboxMove } from './utils/analysis';
import { createChessFromFen, getFenAtPly } from './utils/chess';
import { parsePgn } from './utils/pgn';

function App() {
  const [pgnInput, setPgnInput] = useState(samplePgn);
  const [game, setGame] = useState<ParsedGame | null>(null);
  const [review, setReview] = useState<ReturnType<typeof analyzeGame> | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [showBestMove, setShowBestMove] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxFen, setSandboxFen] = useState<string | null>(null);
  const [sandboxFeedback, setSandboxFeedback] = useState<SandboxFeedback | null>(null);
  const playedMoveReview = currentPly > 0 ? review?.moveReviews[currentPly - 1] ?? null : null;
  const positionReview = review?.moveReviews[currentPly] ?? null;

  const runAnalysis = useCallback((rawPgn: string) => {
    setIsLoading(true);
    setError(null);

    window.setTimeout(() => {
      try {
        const parsed = parsePgn(rawPgn);
        const analyzed = analyzeGame(parsed);
        setGame(parsed);
        setReview(analyzed);
        setCurrentPly(0);
        setSandboxFen(null);
        setSandboxFeedback(null);
      } catch (analysisError) {
        setError(
          analysisError instanceof Error
            ? analysisError.message
            : 'Une erreur inconnue est survenue pendant l’analyse.',
        );
      } finally {
        setIsLoading(false);
      }
    }, 40);
  }, []);

  const maxPly = game?.moves.length ?? 0;

  const officialFen = useMemo(() => {
    if (!game) return 'start';
    return getFenAtPly(game, currentPly);
  }, [game, currentPly]);

  const boardFen = sandboxFen ?? officialFen;

  const currentPositionReview = useMemo(() => {
    if (!review || !game) return null;
    if (currentPly >= review.moveReviews.length) return null;
    return review.moveReviews[currentPly];
  }, [currentPly, game, review]);

  const currentEval = review?.evaluations[currentPly] ?? 0;

  const goPrev = useCallback(() => {
    setCurrentPly((value) => Math.max(value - 1, 0));
    setSandboxFen(null);
  }, []);

  const goNext = useCallback(() => {
    setCurrentPly((value) => Math.min(value + 1, maxPly));
    setSandboxFen(null);
  }, [maxPly]);

  const jumpToPly = useCallback((ply: number) => {
    setCurrentPly(ply);
    setSandboxFen(null);
  }, []);

  const resetSandbox = useCallback(() => {
    setSandboxFen(null);
    setSandboxFeedback(null);
  }, []);

  useKeyboardNavigation({
    max: maxPly,
    onPrev: goPrev,
    onNext: goNext,
  });

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      const chess = createChessFromFen(boardFen);

      try {
        const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (!move) return false;

        const feedback = analyzeSandboxMove(boardFen, `${move.from}${move.to}${move.promotion ?? ''}`, move.san);
        setSandboxFen(chess.fen());
        setSandboxFeedback(feedback);
        return true;
      } catch {
        return false;
      }
    },
    [boardFen],
  );

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <main className="app-content">

        {!game && !review ? (
          <PgnInputPanel
            value={pgnInput}
            onChange={setPgnInput}
            onAnalyze={() => runAnalysis(pgnInput)}
            onLoadSample={() => {
              setPgnInput(samplePgn);
              runAnalysis(samplePgn);
            }}
            isLoading={isLoading}
            error={error}
          />
        ): ""

        }

        {game && review ? (
          <>
            <div className="top-grid">
              <GameHeader headers={game.headers} />
              <AccuracySummary
                whiteName={game.headers.White ?? 'Blancs'}
                blackName={game.headers.Black ?? 'Noirs'}
                accuracyWhite={review.accuracyWhite}
                accuracyBlack={review.accuracyBlack}
              />
            </div>

            <EvalChart evaluations={review.evaluations} currentPly={currentPly} onSelect={jumpToPly} />

            <div className="main-grid">
              <ChessBoardPanel
                game={game}
                currentPly={currentPly}
                boardFen={boardFen}
                boardOrientation={boardOrientation}
                onPieceDrop={handlePieceDrop}
                onFlip={() => setBoardOrientation((value) => (value === 'white' ? 'black' : 'white'))}
                onPrev={goPrev}
                onNext={goNext}
                showBestMove={!showBestMove}
                onToggleBestMove={() => setShowBestMove((value) => !value)}
                suggestedMove={currentPositionReview}
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

export default App;
