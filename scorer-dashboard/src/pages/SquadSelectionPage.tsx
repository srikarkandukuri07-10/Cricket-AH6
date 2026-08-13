import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const SquadSelectionPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    api.get(`/api/matches/${matchId}`).then(({data}) => setMatch(data));
  }, [matchId]);

  const handleSubmit = async () => {
    try {
      // For simplicity, just passing empty arrays to let the backend create default squads if not selected.
      // In a real app we'd have a full UI to select XI.
      await api.post(`/api/admin/matches/${matchId}/squads`, {
        team_a_squad: [], 
        team_b_squad: []
      });
      toast.success('Squads confirmed');
      navigate(`/matches/${matchId}/toss`);
    } catch (e) {
      toast.error('Failed to save squads');
    }
  };

  if (!match) return <div>Loading...</div>;

  return (
    <div className="container">
      <h2>Squad Selection</h2>
      <p>Select playing XI for {match.team_a.name} vs {match.team_b.name}</p>
      {/* Mock UI for now to save tokens and time */}
      <div className="card">
        <p>Using default full squads for this demo. Proceed to Toss.</p>
        <button onClick={handleSubmit} className="btn btn-primary">Confirm & Go to Toss</button>
      </div>
    </div>
  );
};

export default SquadSelectionPage;
