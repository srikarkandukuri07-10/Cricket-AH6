import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Match } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/matches?status=all');
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (e: React.MouseEvent, matchId: string, matchName: string) => {
    e.stopPropagation();
    if (!window.confirm(`⚠️ DANGER ZONE: Are you sure you want to PERMANENTLY DELETE match "${matchName}"? All score data will be erased!`)) {
      return;
    }
    try {
      await api.delete(`/api/admin/matches/${matchId}`);
      toast.success(`Match "${matchName}" deleted`);
      fetchMatches();
    } catch (e) {
      toast.error('Failed to delete match');
    }
  };

  const routeForMatch = (match: Match) => {
    if (!user?.is_scorer) {
      return `/matches/${match.id}/score`;
    }
    switch (match.status) {
      case 'upcoming': return `/matches/${match.id}/squads`;
      case 'toss_pending': return `/matches/${match.id}/toss`;
      case 'toss_complete':
      case 'innings_break': return `/matches/${match.id}/innings-setup`;
      case 'innings1_live':
      case 'innings2_live': return `/matches/${match.id}/score`;
      default: return `/matches/${match.id}/result`;
    }
  };

  const filteredMatches = matches.filter(m => {
    if (filter === 'live') return ['innings1_live', 'innings2_live'].includes(m.status);
    if (filter === 'upcoming') return ['upcoming', 'toss_pending', 'toss_complete', 'innings_break'].includes(m.status);
    if (filter === 'completed') return ['completed', 'abandoned'].includes(m.status);
    return true;
  });

  return (
    <div className="setup-container">
      {/* Top Banner */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">📊 Match Center</h1>
          <p className="page-description">
            {user?.is_scorer
              ? 'Manage tournament matches, record ball-by-ball live scores & view results'
              : 'Live cricket scores, ball-by-ball updates & match scorecards'}
          </p>
        </div>
        {user?.is_scorer && (
          <Link to="/matches/new" className="btn-stitch-primary">
            ✨ + New Match
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="stitch-card mb-6">
        <div className="filter-tab-bar">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Matches ({matches.length})
          </button>
          <button
            className={`filter-tab ${filter === 'live' ? 'active' : ''}`}
            onClick={() => setFilter('live')}
          >
            🔴 Live ({matches.filter(m => ['innings1_live', 'innings2_live'].includes(m.status)).length})
          </button>
          <button
            className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            ⏳ Upcoming ({matches.filter(m => ['upcoming', 'toss_pending', 'toss_complete', 'innings_break'].includes(m.status)).length})
          </button>
          <button
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            🏆 Completed ({matches.filter(m => ['completed', 'abandoned'].includes(m.status)).length})
          </button>
        </div>
      </div>

      {/* Match Grid / Cards */}
      {loading ? (
        <div className="stitch-card text-center p-8">
          <p className="text-muted">Loading matches...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="stitch-card text-center empty-matches-box">
          <span className="empty-icon">🏏</span>
          <h3>No {filter !== 'all' ? filter : ''} matches found</h3>
          {user?.is_scorer && (
            <>
              <p className="text-muted mt-1">Create your first match to start live scoring!</p>
              <Link to="/matches/new" className="btn-stitch-primary mt-4">
                ✨ Create New Match
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="matches-grid">
          {filteredMatches.map(match => {
            const isLive = ['innings1_live', 'innings2_live'].includes(match.status);
            return (
              <div key={match.id} className={`stitch-card match-card-box ${isLive ? 'border-live' : ''}`}>
                <div className="match-card-top flex-between">
                  <span className={`status-badge-pill ${match.status}`} style={match.status === 'completed' ? { background: '#fef3c7', color: '#b45309', border: '1px solid #fde047' } : {}}>
                    {isLive && <span className="live-dot-pulse"></span>}
                    {match.status === 'completed' ? '🏆 COMPLETED' : match.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="format-tag">{match.name || 'AH6 T10 Match'}</span>
                </div>

                <div className="teams-clash-row my-4">
                  <div className="team-col">
                    <span className="team-avatar" style={{ backgroundColor: match.team_a?.primary_color || '#ff5722' }}>
                      {match.team_a?.short_name || 'A'}
                    </span>
                    <span className="team-fullname">{match.team_a?.name || 'Team A'}</span>
                  </div>

                  <div className="vs-badge">VS</div>

                  <div className="team-col">
                    <span className="team-avatar" style={{ backgroundColor: match.team_b?.primary_color || '#00b0ff' }}>
                      {match.team_b?.short_name || 'B'}
                    </span>
                    <span className="team-fullname">{match.team_b?.name || 'Team B'}</span>
                  </div>
                </div>

                {match.status === 'completed' && match.result_text && (
                  <div className="my-3 p-2 text-center" style={{ background: '#fef3c7', color: '#92400e', borderRadius: '10px', fontWeight: 800, fontSize: '0.88rem', border: '1px solid #fde047' }}>
                    🏆 {match.result_text}
                  </div>
                )}

                <div className="match-card-actions flex-between" style={{ gap: '8px' }}>
                  <button
                    className="btn-stitch-primary width-100"
                    style={{ flex: 1 }}
                    onClick={() => navigate(routeForMatch(match))}
                  >
                    {user?.is_scorer
                      ? (isLive ? '🏏 Continue Scoring' : match.status === 'completed' ? '📊 View Result' : '⚙️ Match Setup')
                      : '📊 View Match'}
                  </button>
                  {user?.is_scorer && (
                    <button
                      type="button"
                      className="btn-table-action delete"
                      title="Delete match (Danger Zone)"
                      onClick={(e) => handleDeleteMatch(e, match.id, match.name || 'Match')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
