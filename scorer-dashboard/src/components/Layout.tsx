import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [editingChatName, setEditingChatName] = useState(false);
  const [chatName, setChatName] = useState(localStorage.getItem('chat_display_name') || user?.name || '');

  const handleSaveChatName = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatName.trim()) {
      localStorage.setItem('chat_display_name', chatName.trim());
      setEditingChatName(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <span className="cricket-icon">🏏</span>
            <span className="brand-title">AH6 <span>CRICKET</span></span>
          </Link>

          {user && (
            <div className="navbar-right">
              <nav className="nav-menu">
                <Link
                  to="/"
                  className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                >
                  {user.is_scorer ? 'Dashboard' : 'Matches'}
                </Link>
                {user.is_scorer && (
                  <>
                    <Link
                      to="/setup"
                      className={`nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
                    >
                      Teams & Squads
                    </Link>
                    <Link
                      to="/matches/new"
                      className={`nav-link ${location.pathname === '/matches/new' ? 'active' : ''}`}
                    >
                      + New Match
                    </Link>
                  </>
                )}
              </nav>

              <div className="user-section">
                {editingChatName ? (
                  <form onSubmit={handleSaveChatName} style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={chatName}
                      onChange={e => setChatName(e.target.value)}
                      style={{ height: '32px', fontSize: '0.85rem', padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      autoFocus
                    />
                    <button type="submit" className="btn-stitch-primary btn-compact" style={{ minHeight: '32px' }}>Save</button>
                  </form>
                ) : (
                  <div className="user-badge" style={{ cursor: 'pointer' }} onClick={() => setEditingChatName(true)} title="Click to change live chat name">
                    <span>👤 {localStorage.getItem('chat_display_name') || user.name}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>✏️</span>
                  </div>
                )}
                <button onClick={logout} className="btn-logout" title="Switch Name">
                  Switch Name
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
