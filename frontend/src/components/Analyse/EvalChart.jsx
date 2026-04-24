import { formatEval } from '../../utils/format';
export function EvalChart({ evaluations, currentPly, onSelect }) {
  return (
    <section className="panel eval-panel">
      <div className="section-title-row" style={{ display: "none" }}>
        <h2>Évolution</h2>
        <span className="subtle">positive = avantage blanc</span>
      </div>

      <div className="eval-chart">
        {evaluations.map((value, index) => {
            const height = Math.min(100, Math.max(16, Math.abs(value) * 18 + 18));
            const isPositive = value >= 0;
            const isActive = currentPly === index;
            return (<button key={`${index}-${value}`} type="button" className={`eval-bar ${isPositive ? 'eval-bar--positive' : 'eval-bar--negative'} ${isActive ? 'eval-bar--active' : ''}`} style={{ height: `${height}px` }} onClick={() => onSelect(index)} title={`Coup ${index}: ${formatEval(value)}`}>
              <span className="sr-only">Aller au coup {index}</span>
            </button>);
        })}
      </div>
    </section>
  );
}
