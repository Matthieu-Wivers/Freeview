import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';

const navLinks = [
  { label: 'Analyze', to: '/analyse' },
  { label: 'Share Hub', to: '/hub' },
];

export default function Header() {
  const { user, isAuthenticated } = useAuth();

  const displayName = user?.username || user?.email || 'Compte';
  const accountPath = isAuthenticated ? '/profile' : '/login';
  const accountLabel = isAuthenticated ? displayName : 'Login';
  const accountInitial = displayName.trim().charAt(0).toUpperCase() || '♙';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/analyse" className="site-header__brand" aria-label="Freeview">
          <span className="site-header__logo">♞</span>
          <span>
            <strong>Freeview</strong>
            <small>Chess analysis</small>
          </span>
        </Link>

        <nav className="site-header__nav" aria-label="Main navigation">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'site-header__nav-link is-active' : 'site-header__nav-link'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <Link to={accountPath} className="site-header__account">
          <span className="site-header__account-avatar">{accountInitial}</span>
          <span className="site-header__account-text">
            <small>{isAuthenticated ? 'Profile' : 'Account'}</small>
            <strong>{accountLabel}</strong>
          </span>
        </Link>
      </div>
    </header>
  );
}