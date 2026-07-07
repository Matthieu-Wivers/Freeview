import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { listMyGames, listSharedGames } from '../services/freeviewApi';
import { getUserDisplayName } from '../utils/pgn';

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

  useEffect(() => {
    let mounted = true;

    async function loadProfileData() {
      setLoading(true);
      setError('');

      try {
        const [nextGames, nextSharedGames] = await Promise.all([
          listMyGames().catch(() => []),
          listSharedGames({ mine: true }).catch(() => []),
        ]);

        if (mounted) {
          setGames(Array.isArray(nextGames) ? nextGames : []);
          setSharedGames(Array.isArray(nextSharedGames) ? nextSharedGames : []);
        }
      } catch (apiError) {
        if (mounted) {
          setError(apiError instanceof Error ? apiError.message : 'Profile data could not be loaded.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadProfileData();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const publicPosts = sharedGames.filter((game) => game.visibility === 'public').length;
    const comments = sharedGames.reduce(
      (total, game) => total + Number(game.comments_count || game.comment_count || 0),
      0,
    );
    const likes = sharedGames.reduce(
      (total, game) => total + Number(game.likes_count || game.like_count || 0),
      0,
    );

    return {
      importedGames: games.length,
      sharedReviews: sharedGames.length,
      publicPosts,
      comments,
      likes,
    };
  }, [games.length, sharedGames]);

  async function handleProfileSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateProfile(profileForm);
      setMessage('Profile updated.');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Profile could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  const displayName = getUserDisplayName(user);
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <main className="community-page profile-page profile-page--account-only">
      <section className="panel profile-hero profile-hero--focused">
        <div className="profile-hero__identity">
          <div className="profile-avatar profile-avatar--large">
            {profileForm.avatar_url ? (
              <img src={profileForm.avatar_url} alt={`${displayName} avatar`} />
            ) : (
              <span>{avatarInitial}</span>
            )}
          </div>

          <div>
            <p className="eyebrow">Profile</p>
            <h1>{displayName}</h1>
            <p className="subtle">{user?.email}</p>
            <span className="review-badge review-badge--good">{user?.role || 'USER'}</span>
          </div>
        </div>

        <div className="profile-stats profile-stats--responsive">
          <span>
            <strong>{stats.importedGames}</strong>
            imported games
          </span>
          <span>
            <strong>{stats.sharedReviews}</strong>
            shared reviews
          </span>
          <span>
            <strong>{stats.likes}</strong>
            likes
          </span>
          <span>
            <strong>{stats.comments}</strong>
            comments
          </span>
        </div>
      </section>

      {(message || error) && (
        <p className={error ? 'panel community-state error-text' : 'panel community-state'}>
          {error || message}
        </p>
      )}

      <section className="profile-grid profile-grid--account">
        <form className="panel profile-card profile-card--form" onSubmit={handleProfileSubmit}>
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Account</p>
              <h2>Edit profile</h2>
            </div>
          </div>

          <label className="form-field">
            <span>Username</span>
            <input
              value={profileForm.username}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              maxLength={60}
              placeholder="Choose a public username"
            />
          </label>

          <label className="form-field">
            <span>Bio</span>
            <textarea
              value={profileForm.bio}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
              rows={5}
              maxLength={500}
              placeholder="Share your level, style, or what you want to improve."
            />
          </label>

          <label className="form-field">
            <span>Avatar URL</span>
            <input
              value={profileForm.avatar_url}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  avatar_url: event.target.value,
                }))
              }
              placeholder="https://..."
            />
          </label>

          <div className="input-actions">
            <button className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
            <button className="btn btn--secondary" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </form>

        <aside className="panel profile-card profile-card--summary">
          <p className="eyebrow">Activity</p>
          <h2>Your Freeview space</h2>

          {loading ? (
            <p className="inline-note">Loading activity...</p>
          ) : (
            <div className="profile-summary-list">
              <span>
                <strong>{stats.publicPosts}</strong>
                public posts
              </span>
              <span>
                <strong>{stats.sharedReviews}</strong>
                shared reviews
              </span>
              <span>
                <strong>{stats.importedGames}</strong>
                saved games
              </span>
            </div>
          )}

          <div className="profile-action-list">
            <Link className="btn btn--primary" to="/analyse">
              Review a game
            </Link>
            <Link className="btn btn--secondary" to="/community">
              Open Community
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}