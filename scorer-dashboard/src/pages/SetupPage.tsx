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
  const [activeTab, setActiveTab] = useState<'squads' | 'tournaments'>('squads');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loadingSquad, setLoadingSquad] = useState<boolean>(false);

  // Tournament Form
  const [tName, setTName] = useState('');

  // Team Form
  const [showTeamForm, setShowTeamForm] = useState(false);
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
      if (data.length > 0) {
        // Auto-select first team if none selected
        const firstId = selectedTeamId || data[0].id;
        setSelectedTeamId(firstId);
        loadTeamSquad(firstId);
      } else {
        setSelectedTeam(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTeamSquad = async (teamId: string) => {
    if (!teamId) return;
    setLoadingSquad(true);
    try {
      const { data } = await api.get(`/api/teams/${teamId}`);
      setSelectedTeam(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load team squad');
    } finally {
      setLoadingSquad(false);
    }
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setEditingPlayerId(null);
    setPlayerName('');
    setJerseyNum('');
    loadTeamSquad(teamId);
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim()) return;
    try {
      await api.post('/api/admin/tournaments', { name: tName.trim() });
      toast.success('Tournament created!');
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
        name: teamName.trim(),
        short_name: shortCode,
        primary_color: teamColor,
        tournament_id: selectedTourney || null,
      });
      toast.success(`Team "${data.name}" created!`);
      setTeamName('');
      setTeamShort('');
      setShowTeamForm(false);
      
      // Refresh teams and auto-select new team
      const { data: allTeams } = await api.get('/api/teams');
      setTeams(allTeams);
      setSelectedTeamId(data.id);
      loadTeamSquad(data.id);
    } catch (e) {
      toast.error('Failed to create team');
    }
  };

  const savePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      toast.error('Please select or create a team first!');
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
        toast.success(`Added ${playerName} to squad!`);
      }

      // Reset input form
      setPlayerName('');
      setJerseyNum('');
      setPlayerRole('allrounder');
      setIsCaptain(false);
      setIsWicketkeeper(false);

      // Refresh current squad
      loadTeamSquad(selectedTeamId);
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
    if (!window.confirm(`Delete "${name}" from squad?`)) return;
    try {
      await api.delete(`/api/admin/players/${playerId}`);
      toast.success(`Removed ${name}`);
      loadTeamSquad(selectedTeamId);
    } catch (e) {
      toast.error('Failed to remove player');
    }
  };

  const autoGenerate10Players = async () => {
    if (!selectedTeamId || !selectedTeam) return;

    try {
      const defaultRoles = ['batsman', 'batsman', 'batsman', 'allrounder', 'allrounder', 'allrounder', 'wicketkeeper', 'bowler', 'bowler', 'bowler'];
      const prefix = selectedTeam.short_name || 'Player';
      for (let i = 1; i <= 10; i++) {
        await api.post(`/api/admin/teams/${selectedTeamId}/players`, {
          name: `${prefix} Player ${i}`,
          jersey_number: i,
          role: defaultRoles[i - 1],
          is_captain: i === 1,
          is_wicketkeeper: i === 7,
        });
      }
      toast.success('Generated 10 default squad members! You can edit their names below.');
      loadTeamSquad(selectedTeamId);
    } catch (e) {
      toast.error('Failed to auto-generate squad');
    }
  };

  return (
    <div className="container page-setup">
      <div className="page-header">
        <div>
          <h1>⚙️ Teams & Player Squads</h1>
          <p className="subtext">Create teams and add player members with their names, roles & jersey numbers</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowTeamForm(!showTeamForm)}
        >
          {showTeamForm ? '❌ Close Form' : '➕ Create New Team'}
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="tab-switcher">
        <button
          className={`tab-item ${activeTab === 'squads' ? 'active' : ''}`}
          onClick={() => setActiveTab('squads')}
        >
          🛡️ Teams & Player Rosters ({teams.length})
        </button>
        <button
          className={`tab-item ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          🏆 Tournaments ({tournaments.length})
        </button>
      </div>

      {/* TAB: TEAMS & SQUADS */}
      {activeTab === 'squads' && (
        <div className="setup-content">
          {/* Create Team Form (Collapsible / Top Card) */}
          {showTeamForm && (
            <div className="panel-card highlight-card mb-4">
              <div className="panel-header">
                <h3>🛡️ Add New Team</h3>
              </div>
              <form onSubmit={createTeam} className="grid-form">
                <div className="field-group">
                  <label>Team Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Akshita Warriors"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>Short Code (3-4 Letters) *</label>
                  <input
                    type="text"
                    placeholder="e.g. AKW"
                    maxLength={5}
                    value={teamShort}
                    onChange={e => setTeamShort(e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>Team Color</label>
                  <div className="color-input-box">
                    <input
                      type="color"
                      value={teamColor}
                      onChange={e => setTeamColor(e.target.value)}
                    />
                    <span>{teamColor}</span>
                  </div>
                </div>

                <div className="field-group full-row">
                  <button type="submit" className="btn btn-primary full-width">
                    Save New Team
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Team Selection Bar */}
          <div className="panel-card mb-4">
            <div className="flex-between mb-2">
              <label className="section-label">SELECT A TEAM TO ADD / EDIT PLAYERS:</label>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowTeamForm(true)}
              >
                + Add Another Team
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="empty-box">
                <p>No teams created yet! Click <strong>"➕ Create New Team"</strong> above to get started.</p>
              </div>
            ) : (
              <div className="team-buttons-grid">
                {teams.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`team-select-card ${selectedTeamId === t.id ? 'active' : ''}`}
                    style={{ '--team-color': t.primary_color || '#ff5722' } as any}
                    onClick={() => handleSelectTeam(t.id)}
                  >
                    <div className="team-initials" style={{ backgroundColor: t.primary_color || '#ff5722' }}>
                      {t.short_name}
                    </div>
                    <div className="team-title-wrap">
                      <span className="team-title">{t.name}</span>
                      <span className="team-code">{t.short_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Squad Details & Add Player Panel */}
          {selectedTeamId && selectedTeam && (
            <div className="squad-management-layout">
              {/* Form to Add Player */}
              <div className="panel-card mb-4 border-left-accent">
                <div className="panel-header flex-between">
                  <h3>
                    {editingPlayerId ? '✏️ Edit Player' : `➕ Add Player to ${selectedTeam.name}`}
                  </h3>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={autoGenerate10Players}
                  >
                    ⚡ Auto-Add 10 Players
                  </button>
                </div>

                <form onSubmit={savePlayer} className="grid-form">
                  <div className="field-group">
                    <label>Player Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label>Jersey Number</label>
                    <input
                      type="number"
                      placeholder="e.g. 7"
                      value={jerseyNum}
                      onChange={e => setJerseyNum(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label>Role</label>
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

                  <div className="field-group checkbox-row">
                    <label className="custom-check">
                      <input
                        type="checkbox"
                        checked={isCaptain}
                        onChange={e => setIsCaptain(e.target.checked)}
                      />
                      <span>👑 Captain (C)</span>
                    </label>

                    <label className="custom-check">
                      <input
                        type="checkbox"
                        checked={isWicketkeeper}
                        onChange={e => setIsWicketkeeper(e.target.checked)}
                      />
                      <span>🧤 Wicketkeeper (WK)</span>
                    </label>
                  </div>

                  <div className="field-group full-row form-buttons">
                    <button type="submit" className="btn btn-primary">
                      {editingPlayerId ? '💾 Save Player Changes' : '➕ Add Player to Squad'}
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
              <div className="panel-card no-padding">
                <div className="panel-header-bar">
                  <h3>
                    👥 {selectedTeam.name} Roster ({selectedTeam.players?.length || 0} Members)
                  </h3>
                </div>

                {loadingSquad ? (
                  <div className="loading-area">Loading squad...</div>
                ) : !selectedTeam.players || selectedTeam.players.length === 0 ? (
                  <div className="empty-box p-4">
                    <p>No players added to <strong>{selectedTeam.name}</strong> yet!</p>
                    <p className="subtext">Use the form above to add players by name, or click <strong>"⚡ Auto-Add 10 Players"</strong> to generate a 10-player squad immediately.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="roster-table">
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
                        {selectedTeam.players.map((p, idx) => (
                          <tr key={p.id}>
                            <td className="col-num">#{p.jersey_number || idx + 1}</td>
                            <td className="col-name">
                              <span className="player-title">{p.name}</span>
                              {p.is_captain && <span className="pill-badge gold ml-2">👑 Captain</span>}
                              {p.is_wicketkeeper && <span className="pill-badge blue ml-1">🧤 WK</span>}
                            </td>
                            <td>
                              <span className={`role-pill role-${p.role}`}>
                                {p.role === 'batsman' && '🏏 Batter'}
                                {p.role === 'bowler' && '🎳 Bowler'}
                                {p.role === 'allrounder' && '⚡ All-Rounder'}
                                {p.role === 'wicketkeeper' && '🧤 Wicketkeeper'}
                              </span>
                            </td>
                            <td>
                              {p.is_captain ? 'Captain' : ''} {p.is_wicketkeeper ? 'Wicketkeeper' : ''}
                              {!p.is_captain && !p.is_wicketkeeper && '-'}
                            </td>
                            <td className="col-actions text-right">
                              <button
                                className="action-btn edit"
                                title="Edit Player Name & Role"
                                onClick={() => startEditPlayer(p)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="action-btn delete"
                                title="Remove Player"
                                onClick={() => deletePlayer(p.id, p.name)}
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: TOURNAMENTS */}
      {activeTab === 'tournaments' && (
        <div className="setup-content">
          <div className="panel-card mb-4">
            <h3>🏆 Create Tournament</h3>
            <form onSubmit={createTournament} className="grid-form mt-3">
              <div className="field-group full-row">
                <label>Tournament Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Akshita Heights 6 Premier League 2026"
                  value={tName}
                  onChange={e => setTName(e.target.value)}
                  required
                />
              </div>
              <div className="field-group full-row">
                <button type="submit" className="btn btn-primary">
                  Save Tournament
                </button>
              </div>
            </form>
          </div>

          <div className="panel-card">
            <h3>Active Tournaments</h3>
            <div className="tournaments-grid mt-3">
              {tournaments.length === 0 ? (
                <p className="subtext">No tournaments created yet.</p>
              ) : (
                tournaments.map(t => (
                  <div key={t.id} className="tournament-item">
                    <div>
                      <h4>🏆 {t.name}</h4>
                    </div>
                    <span className="pill-badge green">Active</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupPage;
