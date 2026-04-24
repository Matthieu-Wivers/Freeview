import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Analyse from "./pages/Analyse";

export default function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="*" element={<Navigate to="/analyse" replace/>}/>
        <Route path="/" element={<Navigate to="/analyse" replace/>}/>
        
        <Route element={<MainLayout />}>
          <Route path="/analyse" element={<Analyse />}/>
        </Route>
      </Routes>
    </Router>
  );
}
