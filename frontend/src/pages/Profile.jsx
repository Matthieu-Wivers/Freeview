import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setUsername(user.username || '');
    setBio(user.bio || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  async function submit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updateProfile({
        username,
        bio,
        avatarUrl,
      });

      setMessage('Profile updated.');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!user) {
    return null;
  }

  return (
    <section className="login-page profile-page">
      <div className="login-card profile-card">
        <div className="login-header">
          <p className="login-kicker">My profile</p>
          <h1>{user.username}</h1>
          <p>View and update your public information.</p>
        </div>

        {message && <div className="login-alert success">{message}</div>}
        {error && <div className="login-alert error">{error}</div>}

        <div className="login-session">
          {user.avatarUrl && <img src={user.avatarUrl} alt="Avatar" className="login-avatar" />}
          <div>
            <strong>{user.username}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label>
            Username
            <input
              type="text"
              minLength={3}
              maxLength={32}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label>
            Bio
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
              rows={5}
              placeholder="Tell other players a little about yourself"
            />
          </label>

          <label>
            Avatar URL
            <input
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label>
            Email
            <input type="email" value={user.email || ''} disabled />
          </label>

          <label>
            Email verified
            <input type="text" value={user.emailVerified ? 'Yes' : 'No'} disabled />
          </label>

          <label>
            Created at
            <input
              type="text"
              value={user.createdAt ? new Date(user.createdAt).toLocaleString() : ''}
              disabled
            />
          </label>

          <label>
            Last login
            <input
              type="text"
              value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
              disabled
            />
          </label>

          {Array.isArray(user.ratings) && user.ratings.length > 0 && (
            <div className="profile-ratings">
              <strong>Ratings</strong>
              {user.ratings.map((rating) => (
                <span key={rating.type}>
                  {rating.type}: {rating.elo}
                </span>
              ))}
            </div>
          )}

          <button type="submit" className="login-primary-button" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          <button
            type="button"
            className="login-secondary-button"
            onClick={handleLogout}
            disabled={saving}
          >
            Log out
          </button>
        </form>
      </div>
    </section>
  );
}