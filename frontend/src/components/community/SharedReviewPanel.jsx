import ChessPreview from './ChessPreview';
import { formatEval } from '../../utils/format';
import {
  countReviewCategories,
  getAverageAccuracy,
  getCriticalMoves,
  getSharedReview,
  getSharedReviewSummary,
} from '../../utils/sharedReview';

function StatCard({ label, value, detail }) {
  return (
    <article className="review-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function CategoryPill({ label, value, tone }) {
  return (
    <span className={`review-category-pill review-category-pill--${tone}`}>
      {label}
      <strong>{value}</strong>
    </span>
  );
}

export default function SharedReviewPanel({ sharedGame }) {
  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);
  const pgn = sharedGame?.pgn || sharedGame?.game?.pgn || '';

  if (!review?.moveReviews?.length) {
    return (
      <section className="shared-review-panel">
        <div className="shared-review-panel__preview">
          <ChessPreview pgn={pgn} />
        </div>

        <div className="shared-review-panel__empty">
          <p className="eyebrow">Game only</p>
          <h2>No saved engine review</h2>
          <p>
            This publication was created before shared reviews were enabled.
            Open it in the analyzer to create and publish a full review.
          </p>
        </div>
      </section>
    );
  }

  const categoryCounts = summary?.categoryCounts ?? countReviewCategories(review);
  const criticalMoves = summary?.criticalMoves ?? getCriticalMoves(review);
  const averageAccuracy = summary?.averageAccuracy ?? getAverageAccuracy(review);

  return (
    <section className="shared-review-panel">
      <div className="shared-review-panel__preview">
        <ChessPreview pgn={pgn} />
      </div>

      <div className="shared-review-panel__content">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Engine review</p>
            <h2>Analyzed game overview</h2>
          </div>
        </div>

        <div className="review-stat-grid">
          <StatCard
            label="Average accuracy"
            value={`${Math.round(averageAccuracy)}%`}
            detail="Both players combined"
          />
          <StatCard
            label="White accuracy"
            value={`${Math.round(review.accuracyWhite ?? 0)}%`}
            detail={summary?.white ?? sharedGame.whitePlayer ?? 'White'}
          />
          <StatCard
            label="Black accuracy"
            value={`${Math.round(review.accuracyBlack ?? 0)}%`}
            detail={summary?.black ?? sharedGame.blackPlayer ?? 'Black'}
          />
          <StatCard
            label="Final eval"
            value={formatEval(review.finalEvaluation ?? 0)}
            detail="From White perspective"
          />
        </div>

        <div className="review-category-list">
          <CategoryPill label="Best" value={categoryCounts.best ?? 0} tone="best" />
          <CategoryPill label="Excellent" value={categoryCounts.excellent ?? 0} tone="excellent" />
          <CategoryPill label="Good" value={categoryCounts.good ?? 0} tone="good" />
          <CategoryPill label="Inaccuracies" value={categoryCounts.inaccuracy ?? 0} tone="inaccuracy" />
          <CategoryPill label="Misses" value={categoryCounts.miss ?? 0} tone="miss" />
          <CategoryPill label="Mistakes" value={categoryCounts.mistake ?? 0} tone="mistake" />
          <CategoryPill label="Blunders" value={categoryCounts.blunder ?? 0} tone="blunder" />
        </div>

        {criticalMoves.length ? (
          <div className="critical-move-list">
            <h3>Key moments to discuss</h3>

            {criticalMoves.map((move) => (
              <article key={`${move.ply}-${move.playedSan}`} className="critical-move-card">
                <span>Move {move.ply}</span>
                <strong>{move.playedSan}</strong>
                <p>{move.comment}</p>
                <small>
                  Best move: {move.bestSan} · Loss: {Number(move.loss ?? 0).toFixed(2)}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="critical-move-list">
            <h3>No major mistakes found</h3>
            <p>This review does not contain blunders, mistakes, misses or inaccuracies.</p>
          </div>
        )}

        <div className="review-move-table-wrap">
          <table className="review-move-table">
            <thead>
              <tr>
                <th>Move</th>
                <th>Played</th>
                <th>Label</th>
                <th>Best</th>
                <th>Loss</th>
                <th>Accuracy</th>
              </tr>
            </thead>

            <tbody>
              {review.moveReviews.map((move) => (
                <tr key={`${move.ply}-${move.playedUci ?? move.playedSan}`}>
                  <td>{move.ply}</td>
                  <td>{move.playedSan}</td>
                  <td>
                    <span className={`review-table-badge review-table-badge--${move.category}`}>
                      {move.label ?? move.category}
                    </span>
                  </td>
                  <td>{move.bestSan}</td>
                  <td>{Number(move.loss ?? 0).toFixed(2)}</td>
                  <td>{Math.round(move.accuracy ?? 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}