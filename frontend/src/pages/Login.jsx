import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  const googleStatus = useMemo(() => {
    if (searchParams.get('error')) {
      return 'Google login failed.';
    }

    return '';
  }, [searchParams]);

  async function submit(event) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register({ email, password, username });
      } else {
        await login({ email, password });
      }

      navigate('/', { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  function connectWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <Link className="login-back" to="/analyse">
          ← Back
        </Link>

        <div className="login-header">
          <p className="login-kicker">Freeview account</p>
          <h1>{isRegister ? 'Create account' : 'Login'}</h1>
          <p>Sign in with Google, or use an email and password.</p>
        </div>

        {googleStatus && <div className="login-alert error">{googleStatus}</div>}
        {error && <div className="login-alert error">{error}</div>}

        <button type="button" className="login-google-button" onClick={connectWithGoogle}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Google_Favicon_2025.svg/960px-Google_Favicon_2025.svg.png"
            className="google-logo"
            alt="Google logo"
          />
          Login with Google
        </button>

        <div className="login-separator">
          <span>or</span>
        </div>

        <div className="login-tabs" role="tablist" aria-label="Email authentication">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Login
          </button>

          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form className="login-form" onSubmit={submit}>
          {isRegister && (
            <label>
              Username
              <input
                type="text"
                minLength={3}
                maxLength={32}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="player@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={8}
              placeholder="8 characters minimum"
            />
          </label>

          <button type="submit" className="login-primary-button" disabled={loading}>
            {loading ? 'Loading…' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>
      </section>
    </main>
  );
}