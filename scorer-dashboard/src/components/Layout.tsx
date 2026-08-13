import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <div className="logo">
          <Link to="/">🏏 AH6 Scorer</Link>
        </div>
        {user && (
          <nav className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/setup">Setup</Link>
            <button onClick={logout} className="btn btn-small">Logout</button>
          </nav>
        )}
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
