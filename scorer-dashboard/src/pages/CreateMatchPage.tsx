import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const CreateMatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [matchCategory, setMatchCategory] = useState<'adults' | 'kids'>('adults');
  const [teams, setTeams] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    team_a_id: '',
    team_b_id: '',
    tournament_id: '',
    category: 'adults',
    overs_per_innings: 10,
    max_wickets: 9,
    free_hit_on_no_ball: true
  });

  useEffect(() => {
    api.get('/api/teams').then(({ data }) => setTeams(data));
  }, []);

  const filteredTeams = teams.filter(t => (t.category || 'adults') === matchCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.team_a_id === formData.team_b_id) {
      toast.error('Team A and Team B must be different teams!');
      return;
    }
    try {
      const { data } = await api.post('/api/admin/matches', { ...formData, category: matchCategory });
      toast.success('Match created successfully!');
      navigate(`/matches/${data.id}/squads`);
    } catch (err) {
      toast.error('Failed to create match');
    }
  };

  return (
    <div className="setup-container max-width-600">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">✨ Create New Match</h1>
          <p className="page-description">Configure teams, overs, and match settings for your live match</p>
        </div>
      </div>

      <div className="stitch-card border-glow">
        <form onSubmit={handleSubmit} className="stitch-form-stack">
          <div className="input-group">
            <label>Match Section / Category *</label>
            <select
              value={matchCategory}
              onChange={e => {
                const cat = e.target.value as 'adults' | 'kids';
                setMatchCategory(cat);
                setFormData({ ...formData, team_a_id: '', team_b_id: '' });
              }}
            >
              <option value="adults">👨‍💼 Adults Section Match</option>
              <option value="kids">👶 Kids Section Match</option>
            </select>
          </div>

          <div className="input-group">
            <label>Match Title / Description *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. League Match 1 / Grand Finale"
            />
          </div>

          <div className="stitch-form-grid">
            <div className="input-group">
              <label>Team A ({matchCategory === 'adults' ? 'Adults' : 'Kids'}) *</label>
              <select
                value={formData.team_a_id}
                onChange={e => setFormData({ ...formData, team_a_id: e.target.value })}
                required
              >
                <option value="">-- Select Team A --</option>
                {filteredTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.short_name})</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Team B ({matchCategory === 'adults' ? 'Adults' : 'Kids'}) *</label>
              <select
                value={formData.team_b_id}
                onChange={e => setFormData({ ...formData, team_b_id: e.target.value })}
                required
              >
                <option value="">-- Select Team B --</option>
                {filteredTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.short_name})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="stitch-form-grid">
            <div className="input-group">
              <label>Overs Per Innings</label>
              <input
                type="number"
                value={formData.overs_per_innings}
                onChange={e => setFormData({ ...formData, overs_per_innings: Number(e.target.value) })}
                required
                min={1}
                max={50}
              />
            </div>

            <div className="input-group">
              <label>Max Wickets Per Innings</label>
              <input
                type="number"
                value={formData.max_wickets}
                onChange={e => setFormData({ ...formData, max_wickets: Number(e.target.value) })}
                required
                min={1}
                max={10}
              />
            </div>
          </div>

          <div className="checkbox-group-row">
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.free_hit_on_no_ball}
                onChange={e => setFormData({ ...formData, free_hit_on_no_ball: e.target.checked })}
              />
              <span>🔥 Enable Free Hit on No-Balls</span>
            </label>
          </div>

          <div className="form-action-buttons mt-4">
            <button type="submit" className="btn-stitch-primary width-100">
              🚀 Create Match & Select Squads
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMatchPage;
