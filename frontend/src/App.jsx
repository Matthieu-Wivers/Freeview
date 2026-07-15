import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext';
import MainLayout from './layout/MainLayout';
import AdminModeration from './pages/AdminModeration';
import AdminReports from './pages/AdminReports';
import Analyse from './pages/Analyse';
import Community from './pages/Community';
import GameImport from './pages/GameImport';
import Home from './pages/Home';
import Login from './pages/Login';
import PrivacyPolicy from './pages/Privacy';
import Profile from './pages/Profile';
import ShareGame from './pages/ShareGame';
import SharedGameDetail from './pages/SharedGameDetail';
import './styles/community.css';

function GuestOnlyRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return null;
  }

  return isAuthenticated ? <Navigate to="/profile" replace /> : children;
}

function PrivateRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return null;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, authLoading } = useAuth();

  if (authLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return isAdmin ? children : <Navigate to="/community" replace />;
}

export default function App() {
  return (
    <Router basename="/">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />
          <Route path="/register" element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/analyse" replace />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/analyse" element={<Analyse />} />
            <Route path="/community" element={<Community />} />
            <Route path="/shared-games/:id" element={<SharedGameDetail />} />

            <Route path="/games/import" element={<PrivateRoute><GameImport /></PrivateRoute>} />
            <Route path="/games/:id/share" element={<PrivateRoute><ShareGame /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="/admin/moderation" element={<AdminRoute><AdminModeration /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
