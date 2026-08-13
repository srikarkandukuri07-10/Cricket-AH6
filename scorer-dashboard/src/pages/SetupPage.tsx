import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Player {
  id: string;
  name: string;
  jersey_number?: number;
  role: string;
  is_captain: boolean;
  is_wicketkeeper: boolean;
}

interface Team {
  id: string;
  name: string;
  short_name: string;
  primary_color?: string;
  tournament_id?: string;
  players?: Player[];
}

const SetupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teams' | 'players' | 'tournaments'>('teams');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Tournament Form
  const [tName, setTName] = useState('');

  // Team Form
  const [teamName, setTeamName] = useState('');
  const [teamShort, setTeamShort] = useState('');
  const [teamColor, setTeamColor] = useState('#ff5722');
  const [selectedTourney, setSelectedTourney] = useState('');

  // Player Form
  const [playerName, setPlayerName] = useState('');
  const [jerseyNum, setJerseyNum] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper'>('allrounder');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isWicketkeeper, setIsWicketkeeper] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    fetchTournaments();
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamDetails(selectedTeamId);
    } else {
      setSelectedTeam(null);
    }
  }, [selectedTeamId]);

  const fetchTournaments = async () => {
    try {
      const { data } = await api.get('/api/tournaments');
      setTournaments(data);
      if (data.length > 0 && !selectedTourney) {
        setSelectedTourney(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data } = await api.get('/api/teams');
      setTeams(data);
      if (data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeamDetails = async (teamId: string) => {
    try {
      const { data } = await api.get(`/api/teams/${teamId}`);
      setSelectedTeam(data);
    } catch (e) {
      console.error(e);
    }
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim()) return;
    try {
      await api.post('/api/admin/tournaments', { name: tName });
      toast.success('Tournament created successfully');
      setTName('');
      fetchTournaments();
    } catch (e) {
      toast.error('Failed to create tournament');
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    try {
      const shortCode = teamShort.trim() || teamName.slice(0, 4).toUpperCase();
      const { data } = await api.post('/api/admin/teams', {
        name: teamName,
        short_name: shortCode,
        primary_color: teamColor,
        tournament_id: selectedTourney || null,
      });
      toast.success(`Team "${data.name}" added!`);
      setTeamName('');
      setTeamShort('');
      fetchTeams();
      setSelectedTeamId(data.id);
      setActiveTab('players');
    } catch (e) {
      toast.error('Failed to create team');
    }
  };

  const savePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      toast.error('Please select a team first');
      return;
    }
    if (!playerName.trim()) {
      toast.error('Player name is required');
      return;
    }

    try {
      if (editingPlayerId) {
        // Edit player
        await api.put(`/api/admin/players/${editingPlayerId}`, {
          name: playerName.trim(),
          jersey_number: jerseyNum ? parseInt(jerseyNum) : null,
          role: playerRole,
          is_captain: isCaptain,
          is_wicketkeeper: isWicketkeeper,
        });
        toast.success('Player updated!');
        setEditingPlayerId(null);
      } else {
        // Create player
        await api.post(`/api/admin/teams/${selectedTeamId}/players`, {
          name: playerName.trim(),
          jersey_number: jerseyNum ? parseInt(jerseyNum) : null,
          role: playerRole,
          is_captain: isCaptain,
          is_wicketkeeper: isWicketkeeper,
        });
        toast.success(`Player "${playerName}" added to squad!`);
      }

      // Reset form
      setPlayerName('');
      setJerseyNum('');
      setPlayerRole('allrounder');
      setIsCaptain(false);
      setIsWicketkeeper(false);

      // Refresh squad
      fetchTeamDetails(selectedTeamId);
    } catch (e) {
      toast.error('Failed to save player');
    }
  };

  const startEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setPlayerName(player.name);
    setJerseyNum(player.jersey_number ? String(player.jersey_number) : '');
    setPlayerRole((player.role as any) || 'allrounder');
    setIsCaptain(player.is_captain);
    setIsWicketkeeper(player.is_wicketkeeper);
  };

  const cancelEdit = () => {
    setEditingPlayerId(null);
    setPlayerName('');
    setJerseyNum('');
    setPlayerRole('allrounder');
    setIsCaptain(false);
    setIsWicketkeeper(false);
  };

  const deletePlayer = async (playerId: string, name: string) => {
    if (!window.confirm(`Delete ${name} from squad?`)) return;
    try {
      await api.delete(`/api/admin/players/${playerId}`);
      toast.success(`Removed ${name}`);
      fetchTeamDetails(selectedTeamId);
    } catch (e) {
      toast.error('Failed to remove player');
    }
  };

  const autoGenerate10Players = async () => {
    if (!selectedTeamId || !selectedTeam) return;
    if (selectedTeam.players && selectedTeam.players.length >= 10) {
      if (!window.confirm('Team already has players. Add 10 generic players anyway?')) return;
    }

    try {
      const defaultRoles = ['batsman', 'batsman', 'batsman', 'allrounder', 'allrounder', 'allrounder', 'wicketkeeper', 'bowler', 'bowler', 'bowler'];
      for (let i = 1; i <= 10; i++) {
        await api.post(`/api/admin/teams/${selectedTeamId}/players`, {
          name: `${selectedTeam.short_name} Player ${i}`,
          jersey_number: i,
          role: defaultRoles[i - 1],
          is_captain: i === 1,
          is_wicketkeeper: i === 7,
        });
      }
      toast.success('Generated 10 default squad members! You can edit their names below.');
      fetchTeamDetails(selectedTeamId);
    } catch (e) {
      toast.error('Failed to auto-generate squad');
    }
  };

  return (
    <div className="container py-4">
      <div className="header-badge mb-3">
        <h1>⚙️ Tournament Setup</h1>
        <p className="text-muted">Manage teams, squads, and tournament settings</p>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          🛡️ Teams ({teams.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          🏏 Player Rosters
        </button>
        <button
          className={`tab-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          🏆 Tournaments ({tournaments.length})
        </button>
      </div>

      {/* TAB 1: TEAMS */}
      {activeTab === 'teams' && (
        <div className="tab-pane">
          <div className="card shadow-lg mb-4">
            <div className="card-header">
              <h3>➕ Add New Team</h3>
            </div>
            <form onSubmit={createTeam} className="form-grid">
              <div className="form-group">
                <label>Tournament</label>
                <select value={selectedTourney} onChange={e => setSelectedTourney(e.target.value)}>
                  <option value="">-- Optional: Select Tournament --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Team Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Akshita Warriors"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Short Code (3-4 chars) *</label>
                <input
                  type="text"
                  placeholder="e.g. AKW"
                  maxLength={5}
                  value={teamShort}
                  onChange={e => setTeamShort(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Team Theme Color</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={teamColor}
                    onChange={e => setTeamColor(e.target.value)}
                  />
                  <span>{teamColor}</span>
                </div>
              </div>

              <div className="form-actions full-width">
                <button type="submit" className="btn btn-primary full-width">
                  ✨ Create Team
                </button>
              </div>
            </form>
          </div>

          {/* List of Teams */}
          <h3>Current Teams</h3>
          <div className="teams-grid">
            {teams.length === 0 ? (
              <p className="text-muted">No teams added yet. Create one above!</p>
            ) : (
              teams.map(t => (
                <div key={t.id} className="team-card card">
                  <div className="team-badge" style={{ backgroundColor: t.primary_color || '#ff5722' }}>
                    {t.short_name}
                  </div>
                  <div className="team-info">
                    <h4>{t.name}</h4>
                    <span className="code-pill">{t.short_name}</span>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedTeamId(t.id);
                      setActiveTab('players');
                    }}
                  >
                    👥 Manage Roster
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PLAYER ROSTERS */}
      {activeTab === 'players' && (
        <div className="tab-pane">
          {/* Select Team */}
          <div className="card mb-4">
            <label className="bold mb-2 display-block">Select Team to Edit Roster:</label>
            <div className="team-selector-pills">
              {teams.map(t => (
                <button
                  key={t.id}
                  className={`pill-btn ${selectedTeamId === t.id ? 'active' : ''}`}
                  style={{ borderColor: t.primary_color || '#ff5722' }}
                  onClick={() => setSelectedTeamId(t.id)}
                >
                  <span className="dot" style={{ backgroundColor: t.primary_color || '#ff5722' }}></span>
                  {t.name} ({t.short_name})
                </button>
              ))}
            </div>
          </div>

          {selectedTeam ? (
            <div>
              <div className="roster-header flex-between mb-3">
                <h2>
                  👥 {selectedTeam.name} Roster ({selectedTeam.players?.length || 0} Players)
                </h2>
                <button className="btn btn-secondary btn-sm" onClick={autoGenerate10Players}>
                  ⚡ Auto-Add 10 Players
                </button>
              </div>

              {/* Add / Edit Player Form */}
              <div className="card shadow-md mb-4 accent-border">
                <h4>{editingPlayerId ? '✏️ Edit Player' : '➕ Add Player to Squad'}</h4>
                <form onSubmit={savePlayer} className="form-grid">
                  <div className="form-group">
                    <label>Player Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Virat Kohli"
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Jersey Number</label>
                    <input
                      type="number"
                      placeholder="e.g. 18"
                      value={jerseyNum}
                      onChange={e => setJerseyNum(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Player Role</label>
                    <select
                      value={playerRole}
                      onChange={e => setPlayerRole(e.target.value as any)}
                    >
                      <option value="allrounder">⚡ All-Rounder</option>
                      <option value="batsman">🏏 Batter</option>
                      <option value="bowler">🎳 Bowler</option>
                      <option value="wicketkeeper">🧤 Wicketkeeper</option>
                    </select>
                  </div>

                  <div className="form-group checkboxes-inline">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isCaptain}
                        onChange={e => setIsCaptain(e.target.checked)}
                      />
                      👑 Captain (C)
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isWicketkeeper}
                        onChange={e => setIsWicketkeeper(e.target.checked)}
                      />
                      🧤 Wicketkeeper (WK)
                    </label>
                  </div>

                  <div className="form-actions full-width">
                    <button type="submit" className="btn btn-primary">
                      {editingPlayerId ? 'Update Player' : 'Add Player'}
                    </button>
                    {editingPlayerId && (
                      <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Roster Table */}
              <div className="card padding-0">
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player Name</th>
                      <th>Role</th>
                      <th>Captain / WK</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedTeam.players || selectedTeam.players.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted p-4">
                          No players added to this team yet. Add players above or click "⚡ Auto-Add 10 Players"!
                        </td>
                      </tr>
                    ) : (
                      selectedTeam.players.map((p, idx) => (
                        <tr key={p.id}>
                          <td><strong>#{p.jersey_number || idx + 1}</strong></td>
                          <td>
                            <span className="player-name-text">
                              {p.name}
                              {p.is_captain && <span className="badge badge-gold ml-2">👑 (C)</span>}
                              {p.is_wicketkeeper && <span className="badge badge-blue ml-1">🧤 (WK)</span>}
                            </span>
                          </td>
                          <td>
                            <span className={`role-tag role-${p.role}`}>
                              {p.role === 'batsman' && '🏏 Batter'}
                              {p.role === 'bowler' && '🎳 Bowler'}
                              {p.role === 'allrounder' && '⚡ All-Rounder'}
                              {p.role === 'wicketkeeper' && '🧤 Wicketkeeper'}
                            </span>
                          </td>
                          <td>
                            {p.is_captain ? 'Captain' : ''} {p.is_wicketkeeper ? 'WK' : ''}
                          </td>
                          <td className="text-right">
                            <button
                              className="btn-icon mr-2"
                              title="Edit"
                              onClick={() => startEditPlayer(p)}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-icon danger"
                              title="Delete"
                              onClick={() => deletePlayer(p.id, p.name)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-muted">No team selected.</p>
          )}
        </div>
      )}

      {/* TAB 3: TOURNAMENTS */}
      {activeTab === 'tournaments' && (
        <div className="tab-pane">
          <div className="card shadow-lg mb-4">
            <h3>🏆 Add Tournament</h3>
            <form onSubmit={createTournament} className="flex-form mt-3">
              <input
                type="text"
                placeholder="Tournament Name (e.g. AH6 Premier League 2026)"
                value={tName}
                onChange={e => setTName(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                Add Tournament
              </button>
            </form>
          </div>

          <h3>Active Tournaments</h3>
          <div className="tournaments-list mt-3">
            {tournaments.length === 0 ? (
              <p className="text-muted">No tournaments created yet.</p>
            ) : (
              tournaments.map(t => (
                <div key={t.id} className="card mb-2 flex-between">
                  <div>
                    <h4>🏆 {t.name}</h4>
                    <span className="text-muted text-sm">Created: {new Date(t.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <span className="badge badge-green">Active</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupPage;
