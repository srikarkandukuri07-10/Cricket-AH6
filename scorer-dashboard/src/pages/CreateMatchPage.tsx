import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const CreateMatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '', team_a_id: '', team_b_id: '', tournament_id: '',
    overs_per_innings: 20, max_wickets: 10, free_hit_on_no_ball: true
  });

  useEffect(() => {
    api.get('/api/teams').then(({data}) => setTeams(data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/api/admin/matches', formData);
      toast.success('Match created!');
      navigate(`/matches/${data.id}/squads`);
    } catch (err) {
      toast.error('Failed to create match');
    }
  };

  return (
    <div className="container max-w-md">
      <h2>Create New Match</h2>
      <form onSubmit={handleSubmit} className="card form-col">
        <div className="form-group">
          <label>Match Name</label>
          <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Final / Match 1" />
        </div>
        <div className="form-group">
          <label>Team A</label>
          <select value={formData.team_a_id} onChange={e => setFormData({...formData, team_a_id: e.target.value})} required>
            <option value="">Select Team A</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Team B</label>
          <select value={formData.team_b_id} onChange={e => setFormData({...formData, team_b_id: e.target.value})} required>
            <option value="">Select Team B</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group row">
          <div>
            <label>Overs</label>
            <input type="number" value={formData.overs_per_innings} onChange={e => setFormData({...formData, overs_per_innings: Number(e.target.value)})} />
          </div>
          <div>
            <label>Wickets</label>
            <input type="number" value={formData.max_wickets} onChange={e => setFormData({...formData, max_wickets: Number(e.target.value)})} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Create Match</button>
      </form>
    </div>
  );
};

export default CreateMatchPage;
