import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useMatchState } from '../hooks/useMatchState';
import toast from 'react-hot-toast';

const InningsSetupPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { matchState, loading } = useMatchState(matchId);
  const [batters, setBatters] = useState<any[]>([]);
  const [bowlers, setBowlers] = useState<any[]>([]);

  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');

  useEffect(() => {
    if (!matchId) return;
    Promise.all([
      api.get(`/api/admin/matches/${matchId}/available-batters`),
      api.get(`/api/admin/matches/${matchId}/available-bowlers`)
    ]).then(([batRes, bowlRes]) => {
      setBatters(batRes.data);
      setBowlers(bowlRes.data);
    });
  }, [matchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (striker === nonStriker) return toast.error('Striker and Non-striker must be different');
    try {
      await api.post(`/api/admin/matches/${matchId}/start-innings`, {
        striker_id: striker, non_striker_id: nonStriker, bowler_id: bowler
      });
      toast.success('Innings Started!');
      navigate(`/matches/${matchId}/score`);
    } catch (e) { toast.error('Failed to start innings'); }
  };

  if (loading || !matchState) return <div>Loading...</div>;

  return (
    <div className="container max-w-md">
      <h2>Innings Setup</h2>
      <div className="card">
        <form onSubmit={handleSubmit} className="form-col">
          <div className="form-group">
            <label>Striker</label>
            <select value={striker} onChange={e=>setStriker(e.target.value)} required>
              <option value="">Select Striker</option>
              {batters.map(b => <option key={b.player_id} value={b.player_id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Non-Striker</label>
            <select value={nonStriker} onChange={e=>setNonStriker(e.target.value)} required>
              <option value="">Select Non-Striker</option>
              {batters.map(b => <option key={b.player_id} value={b.player_id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Opening Bowler</label>
            <select value={bowler} onChange={e=>setBowler(e.target.value)} required>
              <option value="">Select Bowler</option>
              {bowlers.filter(b => b.can_bowl).map(b => <option key={b.player_id} value={b.player_id}>{b.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary full-width mt-4">Start Scoring</button>
        </form>
      </div>
    </div>
  );
};

export default InningsSetupPage;
