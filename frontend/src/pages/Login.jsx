import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    login,
    register,
    loginWithGoogle,
    isAuthenticated,
    authLoading,
  } = useAuth();

  const [mode, setMode] = useState(
    location.pathname === '/register' ? 'register' : 'login',
  );

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(location.pathname === '/register' ? 'register' : 'login');
    setError('');
  }, [location.pathname]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/profile', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        await register({
          username: form.username,
          email: form.email,
          password: form.password,
        });
      } else {
        await login({
          email: form.email,
          password: form.password,
        });
      }

      navigate('/profile', { replace: true });
    } catch (apiError) {
      setError(apiError?.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    setError('');
    loginWithGoogle();
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <Link className="login-back" to="/">
          ← Retour à Freeview
        </Link>

        <div className="login-header">
          <p className="login-kicker">Compte Freeview</p>

          <h1>
            {mode === 'register' ? 'Créer un compte' : 'Connexion'}
          </h1>

          <p>
            Connecte-toi pour importer, publier, liker et commenter des parties
            d&apos;échecs.
          </p>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Connexion
          </button>

          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Inscription
          </button>
        </div>

        {error && (
          <p className="login-alert error">
            {error}
          </p>
        )}

        {mode === 'login' && (
          <>
            <button
              type="button"
              className="login-google-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              Continuer avec Google
            </button>

            <div className="login-separator">
              <span />
              <p>ou</p>
              <span />
            </div>
          </>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Nom d&apos;utilisateur
              <input
                type="text"
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
                required
                autoComplete="username"
                placeholder="Wivers"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
              autoComplete="email"
              placeholder="exemple@mail.com"
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="login-primary-button"
            disabled={loading}
          >
            {loading
              ? 'Chargement...'
              : mode === 'register'
                ? 'Créer mon compte'
                : 'Se connecter'}
          </button>
        </form>
      </section>
    </div>
  );
}