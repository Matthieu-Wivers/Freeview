import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Analyse from "./pages/Analyse";
import PrivacyPolicy from "./pages/Privacy";

export default function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="*" element={<Navigate to="/analyse" replace/>}/>
        <Route path="/" element={<Navigate to="/analyse" replace/>}/>
        
        <Route element={<MainLayout />}>
          <Route path="/privacy-policy" element={<PrivacyPolicy />}/>
          <Route path="/analyse" element={<Analyse />}/>
        </Route>
      </Routes>
    </Router>
  );
}
