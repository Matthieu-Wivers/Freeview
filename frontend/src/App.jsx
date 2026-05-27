import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './layout/MainLayout';
import Analyse from './pages/Analyse';
import Login from './pages/Login';
import PrivacyPolicy from './pages/Privacy';

export default function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<MainLayout />}>
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/analyse" element={<Analyse />} />
        </Route>

        <Route path="*" element={<Navigate to="/analyse" replace />} />
        <Route path="/" element={<Navigate to="/analyse" replace />} />
      </Routes>
    </Router>
  );
}
