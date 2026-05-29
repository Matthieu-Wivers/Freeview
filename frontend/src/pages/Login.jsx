import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

async function readJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  const googleStatus = useMemo(() => {
    if (searchParams.get('google') === 'success') {
      return 'Google login successful.';
    }
    if (searchParams.get('error')) {
      return 'Google login failed.';
    }
    return '';
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (!cancelled) {
          setUser(payload.user);
        }
      } catch {
        // No session or API unavailable: keep the form visible.
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(isRegister ? { username } : {}),
        }),
      });

      const payload = await readJson(response);

      if (!response.ok) {
        throw new Error(payload?.message || 'Authentication failed.');
      }

      setUser(payload.user);
      setMessage(isRegister ? 'Account created.' : 'Login successful.');
      setPassword('');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setMessage('Logged out successfully.');
    } catch {
      setError('Logout failed.');
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
        <Link className="login-back" to="/analyse">← Back</Link>

        <div className="login-header">
          <p className="login-kicker">Freeview account</p>
          <h1>{user ? 'My account' : 'Login'}</h1>
          <p>
            Sign in with Google, or use an email and password.
          </p>
        </div>

        {(message || googleStatus) && <div className="login-alert success">{message || googleStatus}</div>}
        {error && <div className="login-alert error">{error}</div>}

        {user ? (
          <div className="login-session">
            {user.avatarUrl && <img src={user.avatarUrl} alt="Avatar" className="login-avatar" />}
            <div>
              <strong>{user.username}</strong>
              <span>{user.email}</span>
            </div>
            <button type="button" className="login-secondary-button" onClick={logout} disabled={loading}>
              Log out
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="login-google-button" onClick={connectWithGoogle}>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Google_Favicon_2025.svg/960px-Google_Favicon_2025.svg.png"
                className="google-logo"
                alt="Google logo"
              />
              Login with Google
            </button>

            <div className="login-separator"><span>or</span></div>

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
          </>
        )}
      </section>
    </main>
  );
}