import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

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

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || 'Une erreur est survenue.');
  }

  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function refreshUser() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        setUser(null);
        return null;
      }

      const payload = await response.json();
      setUser(payload.user);
      return payload.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  async function login({ email, password }) {
    const payload = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setUser(payload.user);
    return payload.user;
  }

  async function register({ email, password, username }) {
    const payload = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });

    setUser(payload.user);
    return payload.user;
  }

  async function updateProfile(values) {
    const payload = await apiRequest('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(values),
    });

    setUser(payload.user);
    return payload.user;
  }

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      authLoading,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    }),
    [user, authLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth doit être utilisé dans AuthProvider.');
  }

  return value;
}