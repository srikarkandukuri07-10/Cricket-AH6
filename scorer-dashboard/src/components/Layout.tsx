import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <span className="cricket-icon">🏏</span>
            <span className="brand-title">AH6 <span>SCORER</span></span>
          </Link>

          {user && (
            <div className="navbar-right">
              <nav className="nav-menu">
                <Link
                  to="/"
                  className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                >
                  📊 Dashboard
                </Link>
                <Link
                  to="/setup"
                  className={`nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
                >
                  ⚙️ Teams & Squads
                </Link>
              </nav>
              <div className="user-section">
                <span className="user-email">{(user as any)?.email || (user as any)?.username || 'Scorer'}</span>
                <button onClick={logout} className="btn-logout">
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="main-viewport">
        <Outlet />
      </main>
    </div>
  );
};
