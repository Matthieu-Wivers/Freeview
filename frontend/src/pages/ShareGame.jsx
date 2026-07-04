import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ChessPreview from '../components/community/ChessPreview';
import { createSharedGame, getGame } from '../services/freeviewApi';
import { getGameId, getSharedGameId, getSharedGameTitle, summarizePgn } from '../utils/pgn';

export default function ShareGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pgn = game?.pgn || '';
  const summary = useMemo(() => summarizePgn(pgn), [pgn]);

  useEffect(() => {
    async function loadGame() {
      setLoading(true);
      setError('');

      try {
        const nextGame = await getGame(id);
        setGame(nextGame);
        setTitle(getSharedGameTitle(nextGame));
      } catch (apiError) {
        setError(apiError.message || 'Impossible de charger la partie.');
      } finally {
        setLoading(false);
      }
    }

    loadGame();
  }, [id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const sharedGame = await createSharedGame({
        game_id: getGameId(game) || id,
        title,
        description,
        visibility,
      });
      const sharedGameId = getSharedGameId(sharedGame);
      navigate(sharedGameId ? `/shared-games/${sharedGameId}` : '/community');
    } catch (apiError) {
      setError(apiError.message || 'Impossible de publier la partie.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="panel community-state">Chargement de la partie...</p>;
  }

  if (error && !game) {
    return (
      <div className="panel community-empty">
        <h1>Partie introuvable</h1>
        <p>{error}</p>
        <Link className="btn btn--secondary" to="/games/import">Importer une autre partie</Link>
      </div>
    );
  }

  return (
    <div className="community-page">
      <section className="panel community-header">
        <p className="eyebrow">Partager</p>
        <h1>Publier cette partie</h1>
        <p className="subtle">Ajoute du contexte pour aider les autres joueurs à comprendre ce que tu veux analyser.</p>
      </section>

      <form className="community-editor" onSubmit={handleSubmit}>
        <section className="panel community-editor__main">
          <label className="form-field">
            <span>Titre</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={140} />
          </label>

          <label className="form-field">
            <span>Description personnalisée</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={10}
              required
              placeholder="Exemple : je ne comprends pas pourquoi mon sacrifice en e5 est mauvais..."
            />
          </label>

          <label className="form-field">
            <span>Visibilité</span>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
              <option value="public">Publique</option>
              <option value="unlisted">Non listée</option>
              <option value="private">Privée</option>
            </select>
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="input-actions">
            <button className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? 'Publication...' : 'Publier la partie'}
            </button>
            <Link className="btn btn--secondary" to="/profile">Annuler</Link>
          </div>
        </section>

        <aside className="panel community-editor__side">
          <h2>Partie importée</h2>
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
