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
      const items = await listSharedGames({
        moderation_status: moderationStatus,
        include_hidden: true,
        admin: true,
      });

      setSharedGames(items);
    } catch (apiError) {
      setError(apiError.message || 'Unable to load posts for moderation.');
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

      setSharedGames((items) =>
        items.map((item) =>
          String(item.id || item.shared_game_id) === String(sharedGameId)
            ? { ...item, moderation_status: nextStatus }
            : item,
        ),
      );
    } catch (apiError) {
      setError(apiError.message || 'Unable to apply moderation action.');
    }
  }

  return (
    <div className="community-page">
      <section className="panel community-header">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Post moderation</h1>
            <p className="subtle">
              Hide or restore shared games according to the community rules.
            </p>
          </div>

          <Link className="btn btn--secondary" to="/admin/reports">
            Reports
          </Link>
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

      {loading && (
        <p className="panel community-state">
          Loading...
        </p>
      )}

      {error && (
        <p className="panel community-state error-text">
          {error}
        </p>
      )}

      <div className="admin-list">
        {sharedGames.map((sharedGame) => {
          const id = sharedGame.id || sharedGame.shared_game_id;

          return (
            <div className="admin-moderation-item" key={id}>
              <SharedGameCard sharedGame={sharedGame} />

              <div className="panel admin-card__actions admin-card__actions--inline">
                <Link className="btn btn--secondary" to={`/shared-games/${id}`}>
                  Open
                </Link>

                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => handleModeration(id, 'hidden')}
                >
                  Hide
                </button>

                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => handleModeration(id, 'visible')}
                >
                  Restore
                </button>

                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => handleModeration(id, 'deleted')}
                >
                  Delete from moderation
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && sharedGames.length === 0 && (
        <p className="panel community-state">
          No posts found for this status.
        </p>
      )}
    </div>
  );
}