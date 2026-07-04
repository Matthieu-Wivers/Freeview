import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import SharedGameCard from '../components/community/SharedGameCard';
import { listSharedGames, moderateSharedGame } from '../services/freeviewApi';

export default function AdminModeration() {
  const [sharedGames, setSharedGames] = useState([]);
  const [moderationStatus, setModerationStatus] = useState('visible');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadItems() {
    setLoading(true);
    setError('');

    try {
      const items = await listSharedGames({ moderation_status: moderationStatus, include_hidden: true, admin: true });
      setSharedGames(items);
    } catch (apiError) {
      setError(apiError.message || 'Impossible de charger les publications à modérer.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [moderationStatus]);

  async function handleModeration(sharedGameId, nextStatus) {
    try {
      await moderateSharedGame(sharedGameId, nextStatus);
      setSharedGames((items) => items.map((item) => (String(item.id || item.shared_game_id) === String(sharedGameId) ? { ...item, moderation_status: nextStatus } : item)));
    } catch (apiError) {
      setError(apiError.message || 'Action de modération impossible.');
    }
  }

  return (
    <div className="community-page">
      <section className="panel community-header">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Modération des publications</h1>
            <p className="subtle">Masque ou restaure les parties partagées selon les règles de la communauté.</p>
          </div>
          <Link className="btn btn--secondary" to="/admin/reports">Signalements</Link>
        </div>
        <div className="community-tabs">
          {['visible', 'pending_review', 'hidden', 'deleted'].map((status) => (
            <button
              key={status}
              className={moderationStatus === status ? 'btn btn--primary' : 'btn btn--secondary'}
              type="button"
              onClick={() => setModerationStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {loading && <p className="panel community-state">Chargement...</p>}
      {error && <p className="panel community-state error-text">{error}</p>}

      <div className="admin-list">
        {sharedGames.map((sharedGame) => {
          const id = sharedGame.id || sharedGame.shared_game_id;
          return (
            <div className="admin-moderation-item" key={id}>
              <SharedGameCard sharedGame={sharedGame} />
              <div className="panel admin-card__actions admin-card__actions--inline">
                <Link className="btn btn--secondary" to={`/shared-games/${id}`}>Ouvrir</Link>
                <button className="btn btn--ghost" type="button" onClick={() => handleModeration(id, 'hidden')}>Masquer</button>
                <button className="btn btn--ghost" type="button" onClick={() => handleModeration(id, 'visible')}>Restaurer</button>
                <button className="btn btn--ghost" type="button" onClick={() => handleModeration(id, 'deleted')}>Supprimer côté modération</button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && sharedGames.length === 0 && <p className="panel community-state">Aucune publication pour ce statut.</p>}
    </div>
  );
}
