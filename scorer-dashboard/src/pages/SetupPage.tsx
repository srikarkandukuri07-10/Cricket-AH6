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
  category?: 'adults' | 'kids';
  tournament_id?: string;
  players?: Player[];
}

const SetupPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loadingSquad, setLoadingSquad] = useState<boolean>(false);

  // Category Section State ('adults' | 'kids')
  const [activeCategory, setActiveCategory] = useState<'adults' | 'kids'>('adults');

  // New Team Modal / Form state
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShort, setNewTeamShort] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#ff5722');
  const [newTeamCategory, setNewTeamCategory] = useState<'adults' | 'kids'>('adults');

  // Edit Team Modal state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamShort, setEditTeamShort] = useState('');
  const [editTeamColor, setEditTeamColor] = useState('#6366f1');
  const [editTeamCategory, setEditTeamCategory] = useState<'adults' | 'kids'>('adults');

  // Player Form state
  const [playerName, setPlayerName] = useState('');
  const [jerseyNum, setJerseyNum] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper'>('allrounder');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isWicketkeeper, setIsWicketkeeper] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data } = await api.get('/api/teams');
      setTeams(data);
      if (data.length > 0) {
        const defaultId = selectedTeamId || data[0].id;
        setSelectedTeamId(defaultId);
        loadSquad(defaultId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSquad = async (teamId: string) => {
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

  const selectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setEditingPlayerId(null);
    setPlayerName('');
    setJerseyNum('');
    loadSquad(teamId);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      const shortCode = newTeamShort.trim() || newTeamName.slice(0, 4).toUpperCase();
      const { data } = await api.post('/api/admin/teams', {
        name: newTeamName.trim(),
        short_name: shortCode,
        primary_color: newTeamColor,
        category: newTeamCategory,
      });
      toast.success(`Team "${data.name}" added to ${data.category === 'kids' ? 'Kids' : 'Adults'}!`);
      setNewTeamName('');
      setNewTeamShort('');
      setShowCreateTeam(false);

      // Refresh teams list and select the new team
      const { data: updatedTeams } = await api.get('/api/teams');
      setTeams(updatedTeams);
      setActiveCategory(data.category || 'adults');
      setSelectedTeamId(data.id);
      loadSquad(data.id);
    } catch (e) {
      toast.error('Failed to create team');
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      toast.error('Please create or select a team first!');
      return;
    }
    if (!playerName.trim()) {
      toast.error('Please enter a player name!');
      return;
    }

    try {
      if (editingPlayerId) {
        // Edit existing player
        await api.put(`/api/admin/players/${editingPlayerId}`, {
          name: playerName.trim(),
          jersey_number: jerseyNum ? parseInt(jerseyNum) : null,
          role: playerRole,
          is_captain: isCaptain,
          is_wicketkeeper: isWicketkeeper,
        });
        toast.success(`Updated ${playerName}!`);
        setEditingPlayerId(null);
      } else {
        // Create new player
        await api.post(`/api/admin/teams/${selectedTeamId}/players`, {
          name: playerName.trim(),
          jersey_number: jerseyNum ? parseInt(jerseyNum) : null,
          role: playerRole,
          is_captain: isCaptain,
          is_wicketkeeper: isWicketkeeper,
        });
        toast.success(`Added "${playerName}" to team squad!`);
      }

      // Clear input fields
      setPlayerName('');
      setJerseyNum('');
      setPlayerRole('allrounder');
      setIsCaptain(false);
      setIsWicketkeeper(false);

      // Reload squad
      loadSquad(selectedTeamId);
    } catch (e) {
      toast.error('Failed to save player');
    }
  };

  const handleEditPlayerClick = (p: Player) => {
    setEditingPlayerId(p.id);
    setPlayerName(p.name);
    setJerseyNum(p.jersey_number ? String(p.jersey_number) : '');
    setPlayerRole((p.role as any) || 'allrounder');
    setIsCaptain(p.is_captain);
    setIsWicketkeeper(p.is_wicketkeeper);
  };

  const handleCancelEdit = () => {
    setEditingPlayerId(null);
    setPlayerName('');
    setJerseyNum('');
    setPlayerRole('allrounder');
    setIsCaptain(false);
    setIsWicketkeeper(false);
  };

  const handleDeletePlayer = async (playerId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from this team?`)) return;
    try {
      await api.delete(`/api/admin/players/${playerId}`);
      toast.success(`Removed ${name}`);
      loadSquad(selectedTeamId);
    } catch (e) {
      toast.error('Failed to delete player');
    }
  };

  const handleStartEditTeam = (e: React.MouseEvent, team: Team) => {
    e.stopPropagation();
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamShort(team.short_name);
    setEditTeamColor(team.primary_color || '#6366f1');
    setEditTeamCategory(team.category || 'adults');
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    if (!editTeamName.trim() || !editTeamShort.trim()) {
      return toast.error('Team name and short code are required');
    }
    try {
      const { data: updated } = await api.put(`/api/admin/teams/${editingTeam.id}`, {
        name: editTeamName.trim(),
        short_name: editTeamShort.trim().toUpperCase(),
        primary_color: editTeamColor,
        category: editTeamCategory,
      });
      toast.success(`Updated team "${updated.name}"!`);
      setEditingTeam(null);

      // Refresh teams list
      const { data: updatedTeams } = await api.get('/api/teams');
      setTeams(updatedTeams);
      if (selectedTeamId === editingTeam.id) {
        setSelectedTeam(prev => prev ? { ...prev, name: updated.name, short_name: updated.short_name, primary_color: updated.primary_color, category: updated.category } : null);
      }
    } catch (e) {
      toast.error('Failed to update team');
    }
  };

  const handleDeleteTeam = async (e: React.MouseEvent, teamId: string, teamName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete team "${teamName}" and all its players?`)) return;
    try {
      await api.delete(`/api/admin/teams/${teamId}`);
      toast.success(`Deleted team "${teamName}"`);
      const { data: updatedTeams } = await api.get('/api/teams');
      setTeams(updatedTeams);
      if (updatedTeams.length > 0) {
        setSelectedTeamId(updatedTeams[0].id);
        loadSquad(updatedTeams[0].id);
      } else {
        setSelectedTeamId('');
        setSelectedTeam(null);
      }
    } catch (e) {
      toast.error('Failed to delete team');
    }
  };

  const handleClearSquad = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete all squad players for team "${teamName}"?`)) return;
    try {
      await api.delete(`/api/admin/teams/${teamId}/players`);
      toast.success(`Cleared all squad members for ${teamName}`);
      loadSquad(teamId);
    } catch (e) {
      toast.error('Failed to clear squad');
    }
  };

  return (
    <div className="setup-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">🛡️ Team & Player Roster Manager</h1>
          <p className="page-description">Create your tournament teams and add player members with their names, roles & numbers</p>
        </div>
        <button
          className="btn-stitch-primary"
          onClick={() => setShowCreateTeam(!showCreateTeam)}
        >
          {showCreateTeam ? '✕ Close Team Form' : '➕ Create New Team'}
        </button>
      </div>

      {/* TOURNAMENT SECTIONS: ADULTS vs KIDS CARDS */}
      <div className="stitch-card mb-6 p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <label className="section-tag mb-2" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800 }}>
          TOURNAMENT SECTIONS (SELECT TO VIEW TEAMS)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div
            className={`card p-4 text-center ${activeCategory === 'adults' ? 'active-section-card' : ''}`}
            style={{
              cursor: 'pointer',
              borderRadius: '14px',
              border: activeCategory === 'adults' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
              background: activeCategory === 'adults' ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' : '#ffffff',
              boxShadow: activeCategory === 'adults' ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              setActiveCategory('adults');
              const adultTeams = teams.filter(t => (t.category || 'adults') === 'adults');
              if (adultTeams.length > 0) selectTeam(adultTeams[0].id);
            }}
          >
            <div style={{ fontSize: '2rem' }}>👨‍💼</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', marginTop: '4px' }}>ADULTS CARD</h3>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>
              {teams.filter(t => (t.category || 'adults') === 'adults').length} Registered Teams
            </span>
          </div>

          <div
            className={`card p-4 text-center ${activeCategory === 'kids' ? 'active-section-card' : ''}`}
            style={{
              cursor: 'pointer',
              borderRadius: '14px',
              border: activeCategory === 'kids' ? '2px solid #059669' : '1px solid #cbd5e1',
              background: activeCategory === 'kids' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : '#ffffff',
              boxShadow: activeCategory === 'kids' ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              setActiveCategory('kids');
              const kidsTeams = teams.filter(t => t.category === 'kids');
              if (kidsTeams.length > 0) selectTeam(kidsTeams[0].id);
            }}
          >
            <div style={{ fontSize: '2rem' }}>👶</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#064e3b', marginTop: '4px' }}>KIDS CARD</h3>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
              {teams.filter(t => t.category === 'kids').length} Registered Teams
            </span>
          </div>
        </div>
      </div>

      {/* CREATE NEW TEAM FORM CARD */}
      {showCreateTeam && (
        <div className="stitch-card mb-6 border-glow">
          <div className="card-heading flex-between">
            <h2>➕ Add New Team</h2>
          </div>
          <form onSubmit={handleCreateTeam} className="stitch-form-grid">
            <div className="input-group">
              <label>Tournament Section *</label>
              <select
                value={newTeamCategory}
                onChange={e => setNewTeamCategory(e.target.value as 'adults' | 'kids')}
              >
                <option value="adults">👨‍💼 Adults Section</option>
                <option value="kids">👶 Kids Section</option>
              </select>
            </div>

            <div className="input-group">
              <label>Team Name *</label>
              <input
                type="text"
                placeholder="e.g. Akshita Warriors / Junior Superstars"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Short Code (3-4 Chars) *</label>
              <input
                type="text"
                placeholder="e.g. AKW"
                maxLength={5}
                value={newTeamShort}
                onChange={e => setNewTeamShort(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Team Theme Color</label>
              <div className="color-picker-box">
                <input
                  type="color"
                  value={newTeamColor}
                  onChange={e => setNewTeamColor(e.target.value)}
                />
                <span>{newTeamColor}</span>
              </div>
            </div>

            <div className="input-group span-full">
              <button type="submit" className="btn-stitch-primary width-100">
                ✨ Save & Create Team
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 1: TEAM SELECTOR BAR */}
      <div className="stitch-card mb-6">
        <div className="flex-between mb-3">
          <label className="section-tag">
            MANAGING {activeCategory === 'adults' ? '👨‍💼 ADULTS' : '👶 KIDS'} TEAMS
          </label>
          <span className="count-pill">
            {teams.filter(t => (t.category || 'adults') === activeCategory).length} Teams in {activeCategory.toUpperCase()}
          </span>
        </div>

        {teams.filter(t => (t.category || 'adults') === activeCategory).length === 0 ? (
          <div className="empty-state-card text-center p-6">
            <p style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              No {activeCategory === 'adults' ? 'Adults' : 'Kids'} teams created yet!
            </p>
            <button
              className="btn-stitch-primary mt-3"
              onClick={() => {
                setNewTeamCategory(activeCategory);
                setShowCreateTeam(true);
              }}
            >
              ➕ Add First {activeCategory === 'adults' ? 'Adults' : 'Kids'} Team
            </button>
          </div>
        ) : (
          <div className="team-pill-grid">
            {teams
              .filter(t => (t.category || 'adults') === activeCategory)
              .map(t => (
                <div
                  key={t.id}
                  className={`team-pill-card ${selectedTeamId === t.id ? 'active' : ''}`}
                  style={{ '--accent-color': t.primary_color || '#6366f1' } as any}
                  onClick={() => selectTeam(t.id)}
                >
                  <span className="team-badge-circle" style={{ backgroundColor: t.primary_color || '#6366f1' }}>
                    {t.short_name}
                  </span>
                  <div className="team-text-wrap">
                    <span className="team-name-str">{t.name}</span>
                    <span className="team-code-str">Code: {t.short_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn-table-action edit"
                      title={`Edit team ${t.name}`}
                      onClick={(e) => handleStartEditTeam(e, t)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-table-action delete"
                      title={`Delete team ${t.name}`}
                      onClick={(e) => handleDeleteTeam(e, t.id, t.name)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* STEP 2 & 3: ADD PLAYER & SQUAD ROSTER LIST */}
      {selectedTeamId && selectedTeam && (
        <div className="two-column-layout">
          {/* LEFT COLUMN: ADD / EDIT PLAYER FORM */}
          <div className="stitch-card highlight-border">
            <div className="card-heading">
              <h2>{editingPlayerId ? '✏️ Edit Player Info' : `👤 Add Player to "${selectedTeam.name}"`}</h2>
              <p className="card-subtext">Fill in the player details below and click Add Player</p>
            </div>

            <form onSubmit={handleSavePlayer} className="stitch-form-stack mt-4">
              <div className="input-group">
                <label>Player Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Jersey Number (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 18"
                  value={jerseyNum}
                  onChange={e => setJerseyNum(e.target.value)}
                />
              </div>

              <div className="checkbox-group-row">
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={isCaptain}
                    onChange={e => setIsCaptain(e.target.checked)}
                  />
                  <span>👑 Team Captain (C)</span>
                </label>

                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={isWicketkeeper}
                    onChange={e => setIsWicketkeeper(e.target.checked)}
                  />
                  <span>🧤 Wicketkeeper (WK)</span>
                </label>
              </div>

              <div className="form-action-buttons mt-4">
                <button type="submit" className="btn-stitch-primary width-100">
                  {editingPlayerId ? '💾 Save Player Changes' : '➕ Add Player to Team'}
                </button>

                {editingPlayerId && (
                  <button
                    type="button"
                    className="btn-stitch-secondary width-100 mt-2"
                    onClick={handleCancelEdit}
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: TEAM SQUAD ROSTER TABLE */}
          <div className="stitch-card padding-zero">
            <div className="table-header-box flex-between">
              <div>
                <h2>👥 {selectedTeam.name} Roster</h2>
                <span className="subtext-pill">{selectedTeam.players?.length || 0} Players Registered</span>
              </div>
              {selectedTeam.players && selectedTeam.players.length > 0 && (
                <button
                  type="button"
                  className="btn-table-action delete"
                  onClick={() => handleClearSquad(selectedTeam.id, selectedTeam.name)}
                >
                  🗑️ Clear All Squad Players
                </button>
              )}
            </div>

            {loadingSquad ? (
              <div className="loading-state-box">Loading player squad...</div>
            ) : !selectedTeam.players || selectedTeam.players.length === 0 ? (
              <div className="empty-squad-box p-6">
                <span className="empty-icon">🏏</span>
                <h3>No players added yet</h3>
                <p>Use the form on the left to add your real team members with their names, roles & jersey numbers!</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="stitch-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player Name</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTeam.players.map((p, idx) => (
                      <tr key={p.id}>
                        <td className="num-col">#{p.jersey_number || idx + 1}</td>
                        <td className="name-col">
                          <span className="player-fullname">{p.name}</span>
                          {p.is_captain && <span className="tag-badge gold ml-2">👑 Captain</span>}
                          {p.is_wicketkeeper && <span className="tag-badge blue ml-1">🧤 WK</span>}
                        </td>
                        <td className="actions-col text-right">
                          <button
                            className="btn-table-action edit"
                            onClick={() => handleEditPlayerClick(p)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn-table-action delete"
                            onClick={() => handleDeletePlayer(p.id, p.name)}
                          >
                            🗑️
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
      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <div className="flex-between mb-4">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>✏️ Edit Team Details</h2>
              <button
                type="button"
                className="btn-stitch-secondary btn-compact"
                onClick={() => setEditingTeam(null)}
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleUpdateTeam} className="stitch-form-stack">
              <div className="input-group">
                <label>Tournament Section *</label>
                <select
                  value={editTeamCategory}
                  onChange={e => setEditTeamCategory(e.target.value as 'adults' | 'kids')}
                >
                  <option value="adults">👨‍💼 Adults Section</option>
                  <option value="kids">👶 Kids Section</option>
                </select>
              </div>

              <div className="input-group">
                <label>Team Name *</label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={e => setEditTeamName(e.target.value)}
                  placeholder="e.g. Akshita Warriors"
                  required
                />
              </div>

              <div className="input-group">
                <label>Short Code (3-5 Chars) *</label>
                <input
                  type="text"
                  value={editTeamShort}
                  onChange={e => setEditTeamShort(e.target.value)}
                  maxLength={5}
                  placeholder="e.g. AKW"
                  required
                />
              </div>

              <div className="input-group">
                <label>Team Theme Color</label>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={editTeamColor}
                    onChange={e => setEditTeamColor(e.target.value)}
                  />
                  <span>{editTeamColor}</span>
                </div>
              </div>

              <div className="form-action-buttons mt-4">
                <button type="submit" className="btn-stitch-primary width-100">
                  💾 Save Team Changes
                </button>
                <button
                  type="button"
                  className="btn-stitch-secondary width-100 mt-2"
                  onClick={() => setEditingTeam(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupPage;
