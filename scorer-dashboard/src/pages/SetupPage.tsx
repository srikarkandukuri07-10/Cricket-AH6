import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const SetupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tournaments'|'teams'|'players'>('tournaments');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  
  // Forms
  const [tName, setTName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamShort, setTeamShort] = useState('');
  const [selectedTourney, setSelectedTourney] = useState('');

  useEffect(() => {
    fetchTournaments();
    fetchTeams();
  }, []);

  const fetchTournaments = async () => {
    try { const { data } = await api.get('/api/tournaments'); setTournaments(data); } catch (e) {}
  };
  const fetchTeams = async () => {
    try { const { data } = await api.get('/api/teams'); setTeams(data); } catch (e) {}
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/tournaments', { name: tName });
      toast.success('Tournament created');
      setTName('');
      fetchTournaments();
    } catch (e) { toast.error('Failed to create'); }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/teams', { name: teamName, short_name: teamShort, tournament_id: selectedTourney });
      toast.success('Team created');
      setTeamName(''); setTeamShort('');
      fetchTeams();
    } catch (e) { toast.error('Failed to create team'); }
  };

  return (
    <div className="container">
      <h2>Setup</h2>
      <div className="tabs">
        <button className={activeTab === 'tournaments' ? 'active' : ''} onClick={() => setActiveTab('tournaments')}>Tournaments</button>
        <button className={activeTab === 'teams' ? 'active' : ''} onClick={() => setActiveTab('teams')}>Teams</button>
      </div>

      <div className="tab-content card">
        {activeTab === 'tournaments' && (
          <div>
            <h3>Create Tournament</h3>
            <form onSubmit={createTournament} className="flex-form">
              <input type="text" placeholder="Tournament Name" value={tName} onChange={e => setTName(e.target.value)} required />
              <button type="submit" className="btn btn-primary">Add</button>
            </form>
            <ul>{tournaments.map(t => <li key={t.id}>{t.name}</li>)}</ul>
          </div>
        )}
        {activeTab === 'teams' && (
          <div>
            <h3>Create Team</h3>
            <form onSubmit={createTeam} className="flex-form">
              <select value={selectedTourney} onChange={e => setSelectedTourney(e.target.value)} required>
                <option value="">Select Tournament</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input type="text" placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} required />
              <input type="text" placeholder="Short (e.g. IND)" value={teamShort} onChange={e => setTeamShort(e.target.value)} required />
              <button type="submit" className="btn btn-primary">Add</button>
            </form>
            <ul>{teams.map(t => <li key={t.id}>{t.name} ({t.short_name})</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupPage;
