import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Match } from '../types';

const Dashboard: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data } = await api.get('/api/matches?status=all');
        setMatches(data);
      } catch (err) {
        console.error('Failed to fetch matches', err);
      }
    };
    fetchMatches();
  }, []);

  const routeForMatch = (match: Match) => {
    switch(match.status) {
      case 'upcoming': return `/matches/${match.id}/squads`;
      case 'toss_pending': return `/matches/${match.id}/toss`;
      case 'toss_complete':
      case 'innings_break': return `/matches/${match.id}/innings-setup`;
      case 'innings1_live':
      case 'innings2_live': return `/matches/${match.id}/score`;
      default: return `/matches/${match.id}/result`;
    }
  };

  return (
    <div className="dashboard container">
      <div className="header-actions">
        <h2>Matches</h2>
        <Link to="/matches/new" className="btn btn-primary">+ New Match</Link>
      </div>
      
      <div className="matches-grid">
        {matches.map(match => (
          <div key={match.id} className="match-card card">
            <div className="match-card-header">
              <span className={`status-badge ${match.status.includes('live') ? 'live' : ''}`}>{match.status.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div className="match-teams">
              <h3>{match.team_a.short_name} vs {match.team_b.short_name}</h3>
              <p className="match-name">{match.name}</p>
            </div>
            <button className="btn full-width" onClick={() => navigate(routeForMatch(match))}>
              {match.status.includes('completed') ? 'View Result' : 'Score Match'}
            </button>
          </div>
        ))}
        {matches.length === 0 && <p>No matches found.</p>}
      </div>
    </div>
  );
};

export default Dashboard;
