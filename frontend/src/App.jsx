import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext';
import MainLayout from './layout/MainLayout';
import Analyse from './pages/Analyse';
import Login from './pages/Login';
import PrivacyPolicy from './pages/Privacy';
import Profile from './pages/Profile';

function GuestOnlyRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return null;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

function PrivateRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return null;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router basename="/">
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnlyRoute>
                <Login />
              </GuestOnlyRoute>
            }
          />

          <Route element={<MainLayout />}>
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/analyse" element={<Analyse />} />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to="/analyse" replace />} />
          <Route path="*" element={<Navigate to="/analyse" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}