interface PgnInputPanelProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
  isLoading: boolean;
  error?: string | null;
}

export function PgnInputPanel({
  value,
  onChange,
  onAnalyze,
  onLoadSample,
  isLoading,
  error,
}: PgnInputPanelProps) {
  return (
    <section className="panel input-panel">
      <div className="section-title-row section-title-row--stacked">
        <div>
          <h1>Freeview</h1>
          <span className="eyebrow">Free Chess game analyzer</span>
        </div>
        <p className="subtle">
          Paste the raw PGN file of the game. The application retains the essentials: players, result,
          moves and annotations.
        </p>
      </div>

      <textarea
        className="pgn-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        placeholder="Paste a PGN here..."
      />

      <div className="input-actions">
        <button type="button" className="btn btn--primary" onClick={onAnalyze} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Analyze this game'}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
