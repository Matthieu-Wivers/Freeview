import { Outlet } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import "./style/layout.css";

export default function MainLayout({ isAuthenticated = false, user = null }) {
  return (
    <div className="app-shell">
      <Header isAuthenticated={isAuthenticated} user={user} />

      <main className="app-frame">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}