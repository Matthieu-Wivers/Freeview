import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ChessPreview from '../components/community/ChessPreview';
import { importGame } from '../services/freeviewApi';
import { getGameId, summarizePgn } from '../utils/pgn';

const samplePgn = `[Event "Freeview demo"]\n[Site "freeview.wivers.fr"]\n[Date "2026.06.23"]\n[White "White player"]\n[Black "Black player"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

export default function GameImport() {
  const navigate = useNavigate();
  const [pgn, setPgn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const summary = useMemo(() => summarizePgn(pgn), [pgn]);
  const canSubmit = pgn.trim().length > 20;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const game = await importGame({
        pgn,
        white_player: summary.white,
        black_player: summary.black,
        result: summary.result,
        played_at: summary.date || undefined,
      });
      const gameId = getGameId(game);
      navigate(gameId ? `/games/${gameId}/share` : '/profile');
    } catch (apiError) {
      setError(apiError.message || 'Import impossible. Vérifie le format PGN.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="community-page">
      <section className="panel community-header">
        <p className="eyebrow">Importer</p>
        <h1>Ajouter une partie PGN</h1>
        <p className="subtle">Colle une partie exportée depuis Chess.com, Lichess ou ton logiciel d'échecs.</p>
      </section>

      <form className="community-editor" onSubmit={handleSubmit}>
        <section className="panel community-editor__main">
          <label className="form-field">
            <span>PGN de la partie</span>
            <textarea
              className="pgn-textarea"
              value={pgn}
              onChange={(event) => setPgn(event.target.value)}
              placeholder="Colle ton PGN ici..."
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <div className="input-actions">
            <button className="btn btn--primary" type="submit" disabled={!canSubmit || saving}>
              {saving ? 'Import en cours...' : 'Importer et continuer'}
            </button>
            <button className="btn btn--secondary" type="button" onClick={() => setPgn(samplePgn)}>
              Utiliser un exemple
            </button>
          </div>
        </section>

        <aside className="panel community-editor__side">
          <h2>Aperçu</h2>
          <ChessPreview pgn={pgn} />
          <div className="community-meta-list">
            <span><strong>Blancs</strong>{summary.white}</span>
            <span><strong>Noirs</strong>{summary.black}</span>
            <span><strong>Résultat</strong>{summary.result}</span>
            <span><strong>Coups</strong>{summary.moveCount}</span>
          </div>
        </aside>
      </form>
    </div>
  );
}
