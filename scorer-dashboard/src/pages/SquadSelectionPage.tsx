import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const SquadSelectionPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    api.get(`/api/matches/${matchId}`).then(({ data }) => setMatch(data));
  }, [matchId]);

  const handleSubmit = async () => {
    try {
      await api.post(`/api/admin/matches/${matchId}/squads`, {
        team_a_squad: [],
        team_b_squad: []
      });
      toast.success('Squads confirmed for match!');
      navigate(`/matches/${matchId}/toss`);
    } catch (e) {
      toast.error('Failed to save squads');
    }
  };

  if (!match) return <div className="setup-container text-center p-8"><p className="text-muted">Loading match details...</p></div>;

  return (
    <div className="setup-container max-width-600">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">👥 Squad Confirmation</h1>
          <p className="page-description">Confirm playing squads for {match.team_a?.name} vs {match.team_b?.name}</p>
        </div>
      </div>

      <div className="stitch-card border-glow text-center p-6">
        <div className="teams-clash-row mb-6">
          <div className="team-col">
            <span className="team-avatar" style={{ backgroundColor: match.team_a?.primary_color || '#ff5722' }}>
              {match.team_a?.short_name}
            </span>
            <span className="team-fullname">{match.team_a?.name}</span>
          </div>

          <div className="vs-badge">VS</div>

          <div className="team-col">
            <span className="team-avatar" style={{ backgroundColor: match.team_b?.primary_color || '#00b0ff' }}>
              {match.team_b?.short_name}
            </span>
            <span className="team-fullname">{match.team_b?.name}</span>
          </div>
        </div>

        <p className="text-muted mb-6">Full squad roster will be automatically included for this match.</p>

        <button onClick={handleSubmit} className="btn-stitch-primary width-100">
          🪙 Confirm Squads & Conduct Toss
        </button>
      </div>
    </div>
  );
};

export default SquadSelectionPage;
