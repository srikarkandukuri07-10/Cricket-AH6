import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TossPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<any>(null);
  const [winnerId, setWinnerId] = useState('');
  const [decision, setDecision] = useState<'bat'|'bowl'|''>('');

  useEffect(() => {
    api.get(`/api/matches/${matchId}`).then(({data}) => setMatch(data));
  }, [matchId]);

  const handleSubmit = async () => {
    if (!winnerId || !decision) return toast.error('Select winner and decision');
    try {
      await api.post(`/api/admin/matches/${matchId}/toss`, { toss_winner_team_id: winnerId, toss_decision: decision });
      toast.success('Toss recorded');
      navigate(`/matches/${matchId}/innings-setup`);
    } catch (e) {
      toast.error('Failed to save toss');
    }
  };

  if (!match) return null;

  return (
    <div className="container max-w-md toss-page">
      <h2>Toss</h2>
      <div className="card text-center">
        <h3>Who won the toss?</h3>
        <div className="toss-buttons">
          <button className={`btn ${winnerId === match.team_a.id ? 'btn-primary' : ''}`} onClick={() => setWinnerId(match.team_a.id)}>
            {match.team_a.name}
          </button>
          <button className={`btn ${winnerId === match.team_b.id ? 'btn-primary' : ''}`} onClick={() => setWinnerId(match.team_b.id)}>
            {match.team_b.name}
          </button>
        </div>
        
        {winnerId && (
          <>
            <h3 className="mt-4">Decision</h3>
            <div className="toss-buttons">
              <button className={`btn ${decision === 'bat' ? 'btn-primary' : ''}`} onClick={() => setDecision('bat')}>BAT</button>
              <button className={`btn ${decision === 'bowl' ? 'btn-primary' : ''}`} onClick={() => setDecision('bowl')}>BOWL</button>
            </div>
          </>
        )}
        
        <button className="btn btn-primary mt-4 full-width" onClick={handleSubmit} disabled={!winnerId || !decision}>
          Start Match
        </button>
      </div>
    </div>
  );
};

export default TossPage;
