import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import SharedGameCard from '../components/community/SharedGameCard';
import { deleteGame, listMyGames, listSharedGames } from '../services/freeviewApi';
import { formatDate, getGameId, getGameTitle, getUserDisplayName, summarizePgn } from '../utils/pgn';

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    bio: user?.bio || user?.profile?.bio || '',
    avatar_url: user?.avatar_url || user?.avatarUrl || user?.profile?.avatar_url || '',
  });
  const [games, setGames] = useState([]);
  const [sharedGames, setSharedGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setProfileForm({
      username: user?.username || '',
      bio: user?.bio || user?.profile?.bio || '',
      avatar_url: user?.avatar_url || user?.avatarUrl || user?.profile?.avatar_url || '',
    });
  }, [user]);

  async function loadProfileData() {
    setLoading(true);
    setError('');

    try {
      const [nextGames, nextSharedGames] = await Promise.all([
        listMyGames().catch(() => []),
        listSharedGames({ mine: true }).catch(() => []),
      ]);
      setGames(nextGames);
      setSharedGames(nextSharedGames);
    } catch (apiError) {
      setError(apiError.message || 'Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfileData();
  }, []);

  const stats = useMemo(() => {
    const publicGames = sharedGames.filter((game) => game.visibility === 'public').length;
    const comments = sharedGames.reduce((total, game) => total + Number(game.comments_count || game.comment_count || 0), 0);
    const likes = sharedGames.reduce((total, game) => total + Number(game.likes_count || game.like_count || 0), 0);

    return { publicGames, comments, likes };
  }, [sharedGames]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateProfile(profileForm);
      setMessage('Profil mis à jour.');
    } catch (apiError) {
      setError(apiError.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGame(gameId) {
    try {
      await deleteGame(gameId);
      setGames((items) => items.filter((game) => String(getGameId(game)) !== String(gameId)));
    } catch (apiError) {
      setError(apiError.message || 'Impossible de supprimer cette partie.');
    }
  }

  return (
    <div className="community-page profile-page">
      <section className="panel profile-hero">
        <div className="profile-hero__identity">
          <div className="profile-avatar">
            {profileForm.avatar_url ? <img src={profileForm.avatar_url} alt="Avatar" /> : <span>{getUserDisplayName(user).charAt(0).toUpperCase()}</span>}
          </div>
          <div>
            <p className="eyebrow">Profil</p>
            <h1>{getUserDisplayName(user)}</h1>
            <p className="subtle">{user?.email}</p>
            <span className="review-badge review-badge--good">{user?.role || 'USER'}</span>
          </div>
        </div>
        <div className="profile-stats">
          <span><strong>{games.length}</strong> parties</span>
          <span><strong>{sharedGames.length}</strong> publications</span>
          <span><strong>{stats.likes}</strong> likes</span>
          <span><strong>{stats.comments}</strong> commentaires</span>
        </div>
      </section>

      {(message || error) && (
        <p className={error ? 'panel community-state error-text' : 'panel community-state'}>{error || message}</p>
      )}

      <section className="profile-grid">
        <form className="panel profile-card" onSubmit={handleProfileSubmit}>
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Informations</p>
              <h2>Modifier mon profil</h2>
            </div>
          </div>
          <label className="form-field">
            <span>Nom d'utilisateur</span>
            <input
              value={profileForm.username}
              onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))}
              maxLength={60}
            />
          </label>
          <label className="form-field">
            <span>Bio</span>
            <textarea
              value={profileForm.bio}
              onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
              rows={5}
              placeholder="Présente rapidement ton niveau, ton style ou ce que tu veux travailler."
            />
          </label>
          <label className="form-field">
            <span>URL avatar</span>
            <input
              value={profileForm.avatar_url}
              onChange={(event) => setProfileForm((current) => ({ ...current, avatar_url: event.target.value }))}
              placeholder="https://..."
            />
          </label>
          <div className="input-actions">
            <button className="btn btn--primary" type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            <button className="btn btn--secondary" type="button" onClick={logout}>Déconnexion</button>
          </div>
        </form>

        <aside className="panel profile-card">
          <p className="eyebrow">Actions rapides</p>
          <h2>Continuer le projet</h2>
          <div className="profile-action-list">
            <Link className="btn btn--primary" to="/games/import">Importer une partie</Link>
            <Link className="btn btn--secondary" to="/community">Voir la communauté</Link>
            <Link className="btn btn--secondary" to="/analyse">Analyser un PGN</Link>
          </div>
        </aside>
      </section>

      <section className="profile-sections">
        <article className="panel profile-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Mes parties</p>
              <h2>Parties importées</h2>
            </div>
            <Link className="btn btn--secondary" to="/games/import">Ajouter</Link>
          </div>

          {loading && <p className="subtle">Chargement...</p>}
          {!loading && games.length === 0 && <p className="inline-note">Aucune partie importée pour le moment.</p>}

          <div className="profile-game-list">
            {games.map((game) => {
              const gameId = getGameId(game);
              const summary = summarizePgn(game.pgn || '');
              return (
                <div className="profile-game-row" key={gameId}>
                  <div>
                    <strong>{getGameTitle(game)}</strong>
                    <span>{summary.moveCount} coups · {formatDate(game.created_at || game.createdAt || summary.date)}</span>
                  </div>
                  <div className="input-actions">
                    <Link className="btn btn--secondary" to={`/games/${gameId}/share`}>Partager</Link>
                    <button className="btn btn--ghost" type="button" onClick={() => handleDeleteGame(gameId)}>Supprimer</button>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel profile-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Publications</p>
              <h2>Mes parties partagées</h2>
            </div>
          </div>

          {!loading && sharedGames.length === 0 && <p className="inline-note">Aucune publication pour le moment.</p>}
          <div className="shared-game-list shared-game-list--compact">
            {sharedGames.map((sharedGame) => (
              <SharedGameCard key={sharedGame.id || sharedGame.shared_game_id} sharedGame={sharedGame} />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
