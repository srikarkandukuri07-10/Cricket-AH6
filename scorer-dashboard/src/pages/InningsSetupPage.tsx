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
    if (striker === nonStriker) return toast.error('Striker and Non-striker must be different players');
    try {
      await api.post(`/api/admin/matches/${matchId}/start-innings`, {
        striker_id: striker,
        non_striker_id: nonStriker,
        bowler_id: bowler
      });
      toast.success('Innings Started!');
      navigate(`/matches/${matchId}/score`);
    } catch (e) {
      toast.error('Failed to start innings');
    }
  };

  if (loading || !matchState) return <div className="setup-container text-center p-8"><p className="text-muted">Loading innings setup...</p></div>;

  return (
    <div className="setup-container max-width-600">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">🏏 Start Innings</h1>
          <p className="page-description">Select opening batter on strike, non-striker, and opening bowler</p>
        </div>
      </div>

      <div className="stitch-card border-glow">
        <form onSubmit={handleSubmit} className="stitch-form-stack">
          <div className="input-group">
            <label>🏏 Opening Striker *</label>
            <select
              value={striker}
              onChange={e => {
                const val = e.target.value;
                setStriker(val);
                if (val === nonStriker) setNonStriker('');
              }}
              required
            >
              <option value="">-- Select Striker --</option>
              {batters.filter(b => b.player_id !== nonStriker).map(b => (
                <option key={b.player_id} value={b.player_id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>🏏 Opening Non-Striker *</label>
            <select
              value={nonStriker}
              onChange={e => {
                const val = e.target.value;
                setNonStriker(val);
                if (val === striker) setStriker('');
              }}
              required
            >
              <option value="">-- Select Non-Striker --</option>
              {batters.filter(b => b.player_id !== striker).map(b => (
                <option key={b.player_id} value={b.player_id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>🎳 Opening Bowler *</label>
            <select value={bowler} onChange={e => setBowler(e.target.value)} required>
              <option value="">-- Select Opening Bowler --</option>
              {bowlers.filter(b => b.can_bowl).map(b => (
                <option key={b.player_id} value={b.player_id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="form-action-buttons mt-4">
            <button type="submit" className="btn-stitch-primary width-100">
              ⚡ Start Scoring Live Match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InningsSetupPage;
