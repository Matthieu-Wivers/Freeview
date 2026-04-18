import type { GameReview, ParsedGame, SandboxFeedback } from '../types/chess';
import { formatEval } from '../utils/format';
import { ReviewBadge } from './ReviewBadge';

interface MovesSidebarProps {
  game: ParsedGame;
  review: GameReview;
  currentPly: number;
  currentEval: number;
  currentMoveIndex: number;
  sandboxFeedback?: SandboxFeedback | null;
  onJumpToPly: (ply: number) => void;
}

export function MovesSidebar({
  game,
  review,
  currentPly,
  currentEval,
  currentMoveIndex,
  sandboxFeedback,
  onJumpToPly,
}: MovesSidebarProps) {
  const currentMoveReview = currentPly > 0 ? review.moveReviews[currentPly - 1] : null;
  const currentPositionSuggestion = currentPly < review.moveReviews.length ? review.moveReviews[currentPly] : null;

  return (
    <aside className="sidebar-layout">
      <section className="panel move-review-panel">

        <div className="summary-grid">
          <div className="summary-card" style={{paddingTop: "5px", paddingBottom: "5px"}}>
            <span className="meta-label">Actual eval</span>
            <strong>{formatEval(currentEval)}</strong>
          </div>
          <div className="summary-card" style={{paddingTop: "5px", paddingBottom: "5px"}}>
            <span className="meta-label">Final eval</span>
            <strong>{formatEval(review.finalEvaluation)}</strong>
          </div>
        </div>
      </section>

      <section className="panel move-list-panel">
        <div className="moves-table">
          {Array.from({ length: Math.ceil(game.moves.length / 2) }).map((_, rowIndex) => {
            const whiteMove = game.moves[rowIndex * 2];
            const blackMove = game.moves[rowIndex * 2 + 1];
            const whiteReview = review.moveReviews[rowIndex * 2];
            const blackReview = review.moveReviews[rowIndex * 2 + 1];

            return (
              <div key={rowIndex} className="moves-row">
                <div className="moves-row__number">{rowIndex + 1}</div>

                {whiteMove ? (
                  <button
                    type="button"
                    className={`move-chip ${currentMoveIndex === whiteMove.ply ? 'move-chip--active' : ''}`}
                    onClick={() => onJumpToPly(whiteMove.ply)}
                  >
                    <span className="move-chip__text">
                      <strong>{whiteMove.san}</strong>
                      <small>{whiteReview.bestSan}</small>
                    </span>
                  </button>
                ) : (
                  <div />
                )}

                {blackMove ? (
                  <button
                    type="button"
                    className={`move-chip ${currentMoveIndex === blackMove.ply ? 'move-chip--active' : ''}`}
                    onClick={() => onJumpToPly(blackMove.ply)}
                  >
                    <span className="move-chip__text">
                      <strong>{blackMove.san}</strong>
                      <small>{blackReview.bestSan}</small>
                    </span>
                  </button>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
      </section>
      


{currentMoveReview ? (
          <div className="review-card">
            <div className="review-card__header">
              <div>
                <span className="meta-label">Coup joué</span>
                <h3>{currentMoveReview.playedSan}</h3>
              </div>
              <ReviewBadge category={currentMoveReview.category} label={currentMoveReview.label} />
            </div>

            <p>{currentMoveReview.comment}</p>

            <div className="review-stats-grid">
              <div>
                <span className="meta-label">Accuracy</span>
                <strong>{Math.round(currentMoveReview.accuracy)}%</strong>
              </div>
              <div>
                <span className="meta-label">Perte</span>
                <strong>{currentMoveReview.loss.toFixed(2)}</strong>
              </div>
              <div>
                <span className="meta-label">Meilleur coup</span>
                <strong>{currentMoveReview.bestSan}</strong>
              </div>
              <div>
                <span className="meta-label">Après le coup</span>
                <strong>{formatEval(currentMoveReview.scoreAfter)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <>
          </>
        )}

        {currentPositionSuggestion ? (
          <div className="review-card review-card--suggestion">
            <div className="review-card__header">
              <div>
                <span className="meta-label">Meilleur coup dans la position affichée</span>
                <h3>{currentPositionSuggestion.bestSan}</h3>
              </div>
              <ReviewBadge
                category={currentPositionSuggestion.category}
                label={currentPositionSuggestion.label}
              />
            </div>

            <p>
              Variante suggérée pour le camp au trait. Utilise le bouton “Afficher le meilleur coup”
              pour voir la flèche verte directement sur l’échiquier.
            </p>

            <div className="review-stats-grid">
              <div>
                <span className="meta-label">Éval après meilleur coup</span>
                <strong>{formatEval(currentPositionSuggestion.bestScoreWhite)}</strong>
              </div>
              <div>
                <span className="meta-label">Top 3</span>
                <strong>
                  {currentPositionSuggestion.suggestions
                    .slice(0, 3)
                    .map((move) => move.san)
                    .join(' · ')}
                </strong>
              </div>
            </div>
          </div>
        ) : null}

        {sandboxFeedback ? (
          <div className="inline-note">
            <span className="meta-label">Dernier test interactif</span>
            <strong>
              {sandboxFeedback.san} · meilleur coup {sandboxFeedback.bestSan}
            </strong>
          </div>
        ) : null}


    </aside>
    
  );
}
