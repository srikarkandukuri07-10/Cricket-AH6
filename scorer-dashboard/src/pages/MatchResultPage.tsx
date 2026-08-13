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
    <div className="container max-w-md">
      <h2>Match Result</h2>
      <form onSubmit={handleSubmit} className="card form-col">
        <div className="form-group">
          <label>Result Summary</label>
          <input type="text" value={resultText} onChange={e=>setResultText(e.target.value)} required placeholder="Team A won by 10 runs" />
        </div>
        <button type="submit" className="btn btn-primary">End Match</button>
      </form>
    </div>
  );
};

export default MatchResultPage;
