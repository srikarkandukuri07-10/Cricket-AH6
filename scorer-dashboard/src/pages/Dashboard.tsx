import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Match } from '../types';

const Dashboard: React.FC = () => {
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

  const routeForMatch = (match: Match) => {
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
          <p className="page-description">Manage tournament matches, record ball-by-ball live scores & view results</p>
        </div>
        <Link to="/matches/new" className="btn-stitch-primary">
          ✨ + New Match
        </Link>
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
          <p className="text-muted mt-1">Create your first match to start live scoring!</p>
          <Link to="/matches/new" className="btn-stitch-primary mt-4">
            ✨ Create New Match
          </Link>
        </div>
      ) : (
        <div className="matches-grid">
          {filteredMatches.map(match => {
            const isLive = ['innings1_live', 'innings2_live'].includes(match.status);
            return (
              <div key={match.id} className={`stitch-card match-card-box ${isLive ? 'border-live' : ''}`}>
                <div className="match-card-top flex-between">
                  <span className={`status-badge-pill ${match.status}`}>
                    {isLive && <span className="live-dot-pulse"></span>}
                    {match.status.replace('_', ' ').toUpperCase()}
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

                <div className="match-card-actions">
                  <button
                    className="btn-stitch-primary width-100"
                    onClick={() => navigate(routeForMatch(match))}
                  >
                    {isLive ? '🏏 Continue Scoring' : match.status === 'completed' ? '📊 View Result' : '⚙️ Match Setup'}
                  </button>
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
