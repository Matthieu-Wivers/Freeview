import { Link } from "react-router-dom";

const productLinks = [
  { label: "Analyze", to: "/analyse" },
];

const resourceLinks = [
  { label: "Documentation", to: "/docs" },
  { label: "Support", to: "/support" },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link to="/analyse" className="site-footer__logo">
            <span>♞</span>
            <strong>Freeview</strong>
          </Link>

          <p>
            Analyze your chess games with a clean, fast interface built to help
            you improve move by move.
          </p>
        </div>

        <div className="site-footer__columns">
          <div className="site-footer__column">
            <h2>Product</h2>
            {productLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="site-footer__column">
            <h2>Resources</h2>
            {resourceLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="site-footer__column">
            <h2>Legal</h2>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <a href="mailto:matthieu.ganet@proton.me">Contact</a>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} Freeview. All rights reserved.</span>
        <span>Built for chess players.</span>
      </div>
    </footer>
  );
}