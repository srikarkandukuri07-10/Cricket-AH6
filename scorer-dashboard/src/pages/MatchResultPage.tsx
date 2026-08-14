import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const MatchResultPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [resultText, setResultText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/api/admin/matches/${matchId}/result`, { result_text: resultText });
      toast.success('Result saved');
      navigate('/');
    } catch (e) { toast.error('Failed to save result'); }
  };

  return (
    <div className="setup-container max-width-600">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">🏆 Match Result</h1>
          <p className="page-description">Finalize match and publish official result summary</p>
        </div>
      </div>

      <div className="stitch-card border-glow p-6">
        <form onSubmit={handleSubmit} className="stitch-form-stack">
          <div className="input-group">
            <label>Official Match Result Summary *</label>
            <input
              type="text"
              value={resultText}
              onChange={e => setResultText(e.target.value)}
              required
              placeholder="e.g. Team A won by 15 runs / Team B won by 4 wickets"
            />
          </div>
          <div className="form-action-buttons mt-6">
            <button type="submit" className="btn-stitch-primary width-100" style={{ padding: '14px 24px', fontSize: '1rem' }}>
              🏁 Conclude Match & Save Result
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MatchResultPage;
