import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TossPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<any>(null);
  const [winnerId, setWinnerId] = useState('');
  const [decision, setDecision] = useState<'bat' | 'bowl' | ''>('');

  useEffect(() => {
    api.get(`/api/matches/${matchId}`).then(({ data }) => setMatch(data));
  }, [matchId]);

  const handleSubmit = async () => {
    if (!winnerId || !decision) return toast.error('Select toss winner and decision');
    try {
      await api.post(`/api/admin/matches/${matchId}/toss`, {
        toss_winner_team_id: winnerId,
        toss_decision: decision
      });
      toast.success('Toss recorded!');
      navigate(`/matches/${matchId}/innings-setup`);
    } catch (e) {
      toast.error('Failed to save toss');
    }
  };

  if (!match) return <div className="setup-container text-center p-8"><p className="text-muted">Loading match...</p></div>;

  return (
    <div className="setup-container max-width-600">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">🪙 Match Toss</h1>
          <p className="page-description">Record toss winner and election to bat or bowl</p>
        </div>
      </div>

      <div className="stitch-card border-glow text-center p-6">
        <h3 className="section-tag mb-4">WHO WON THE TOSS?</h3>

        <div className="toss-choice-grid mb-6">
          <button
            type="button"
            className={`toss-choice-card ${winnerId === match.team_a.id ? 'active' : ''}`}
            onClick={() => setWinnerId(match.team_a.id)}
          >
            <span className="team-avatar" style={{ backgroundColor: match.team_a.primary_color || '#ff5722' }}>
              {match.team_a.short_name}
            </span>
            <span className="choice-name">{match.team_a.name}</span>
          </button>

          <button
            type="button"
            className={`toss-choice-card ${winnerId === match.team_b.id ? 'active' : ''}`}
            onClick={() => setWinnerId(match.team_b.id)}
          >
            <span className="team-avatar" style={{ backgroundColor: match.team_b.primary_color || '#00b0ff' }}>
              {match.team_b.short_name}
            </span>
            <span className="choice-name">{match.team_b.name}</span>
          </button>
        </div>

        {winnerId && (
          <div className="mt-6 border-top-subtle pt-6">
            <h3 className="section-tag mb-4">ELECTED TO:</h3>
            <div className="toss-choice-grid mb-6">
              <button
                type="button"
                className={`toss-choice-card ${decision === 'bat' ? 'active' : ''}`}
                onClick={() => setDecision('bat')}
              >
                <span className="choice-icon">🏏</span>
                <span className="choice-name">BAT FIRST</span>
              </button>

              <button
                type="button"
                className={`toss-choice-card ${decision === 'bowl' ? 'active' : ''}`}
                onClick={() => setDecision('bowl')}
              >
                <span className="choice-icon">🎳</span>
                <span className="choice-name">BOWL FIRST</span>
              </button>
            </div>
          </div>
        )}

        <button
          className="btn-stitch-primary width-100 mt-4"
          onClick={handleSubmit}
          disabled={!winnerId || !decision}
        >
          🚀 Confirm Toss & Setup Innings
        </button>
      </div>
    </div>
  );
};

export default TossPage;
