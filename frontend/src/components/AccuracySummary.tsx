import { toPercent } from '../utils/format';

interface AccuracySummaryProps {
  whiteName: string;
  blackName: string;
  accuracyWhite: number;
  accuracyBlack: number;
}

export function AccuracySummary({
  whiteName,
  blackName,
  accuracyWhite,
  accuracyBlack,
}: AccuracySummaryProps) {
  return (
    <section className="panel accuracy-panel">
      <div className="section-title-row">
        <h2>Global Accuracy</h2>
      </div>

      <div className="accuracy-grid">
        <article className="accuracy-card accuracy-card--white">
          <span className="meta-label">White</span>
          <strong>{whiteName}</strong>
          <div className="accuracy-value">{toPercent(accuracyWhite)}</div>
        </article>

        <article className="accuracy-card accuracy-card--black">
          <span className="meta-label">Black</span>
          <strong>{blackName}</strong>
          <div className="accuracy-value">{toPercent(accuracyBlack)}</div>
        </article>
      </div>
    </section>
  );
}
