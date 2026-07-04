import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../services/apiClient';

const AuthContext = createContext(null);

function extractUser(payload) {
  if (!payload) {
    return null;
  }

  if (payload.user) {
    return payload.user;
  }

  if (payload.data?.user) {
    return payload.data.user;
  }

  if (payload.id || payload.email || payload.username || payload.role) {
    return payload;
  }

  return null;
}

function checkIsAdmin(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN';
}

function getGoogleSsoUrl() {
  const explicitGoogleUrl = import.meta.env.VITE_GOOGLE_SSO_URL;

  if (explicitGoogleUrl) {
    return explicitGoogleUrl;
  }

  const rawApiBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    '';

  if (!rawApiBase) {
    return '/api/auth/google';
  }

  const base = String(rawApiBase).replace(/\/+$/, '');

  if (base.endsWith('/api')) {
    return `${base}/auth/google`;
  }

  return `${base}/api/auth/google`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function refreshUser() {
    try {
      const payload = await apiRequest('/auth/me');
      const nextUser = extractUser(payload);

      setUser(nextUser);
      return nextUser;
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
    const payload = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const nextUser = extractUser(payload);
    setUser(nextUser);

    return nextUser;
  }

  async function register({ username, email, password }) {
    const payload = await apiRequest('/auth/register', {
      method: 'POST',
      body: { username, email, password },
    });

    const nextUser = extractUser(payload);
    setUser(nextUser);

    return nextUser;
  }

  function loginWithGoogle() {
    window.location.href = getGoogleSsoUrl();
  }

  async function updateProfile(values) {
    const payload = await apiRequest('/auth/me', {
      method: 'PATCH',
      body: values,
    });

    const nextUser = extractUser(payload);
    setUser(nextUser);

    return nextUser;
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } finally {
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      authLoading,
      isAuthenticated: Boolean(user),
      isAdmin: checkIsAdmin(user),
      login,
      register,
      loginWithGoogle,
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
    throw new Error('useAuth doit être utilisé dans un AuthProvider.');
  }

  return value;
}