import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useMatchState } from '../hooks/useMatchState';
import toast from 'react-hot-toast';

const LiveScoringPage: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { matchState, loading } = useMatchState(matchId);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showExtrasModal, setShowExtrasModal] = useState<{ type: string } | null>(null);

  const [availableBowlers, setAvailableBowlers] = useState<any[]>([]);
  const [availableBatters, setAvailableBatters] = useState<any[]>([]);

  // Wicket form state
  const [wType, setWType] = useState('bowled');
  const [wFielder] = useState('');
  const [wDismissed, setWDismissed] = useState('');
  const [wNewBatter, setWNewBatter] = useState('');
  const [wNewBatterStriker, setWNewBatterStriker] = useState(true);

  useEffect(() => {
    if (!matchState) return;
    const socket = getSocket();

    const handleOverComplete = () => {
      loadBowlers();
      setShowBowlerModal(true);
    };

    const handleStatusChange = ({ status }: any) => {
      if (status === 'innings_break' || status === 'completed') {
        navigate('/');
      }
    };

    socket.on('over_complete', handleOverComplete);
    socket.on('match_status_change', handleStatusChange);

    return () => {
      socket.off('over_complete', handleOverComplete);
      socket.off('match_status_change', handleStatusChange);
    };
  }, [matchState, navigate]);

  const loadBowlers = async () => {
    try {
      const { data } = await api.get(`/api/admin/matches/${matchId}/available-bowlers`);
      setAvailableBowlers(data);
    } catch (e) {
      toast.error('Failed to load bowlers');
    }
  };

  const loadBatters = async () => {
    try {
      const { data } = await api.get(`/api/admin/matches/${matchId}/available-batters`);
      setAvailableBatters(data);
    } catch (e) {
      toast.error('Failed to load batters');
    }
  };

  const recordBall = async (ballPayload: any) => {
    if (!matchState?.current_innings?.id) return;
    setSubmitting(true);
    try {
      await api.post(`/api/admin/innings/${matchState.current_innings.id}/balls`, ballPayload);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to record ball';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const undoLastBall = async () => {
    if (!matchState?.current_innings?.id) return;
    if (!window.confirm('Are you sure you want to undo the last ball?')) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/admin/innings/${matchState.current_innings.id}/balls/last`);
      toast.success('Last ball undone');
    } catch (err: any) {
      toast.error('Failed to undo ball');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await recordBall({
      bat_runs: 0,
      extra_runs: 0,
      extra_type: 'none',
      is_wicket: true,
      dismissal_type: wType,
      dismissed_batter_id: wDismissed || matchState?.current_striker?.player_id,
      fielder_id: wFielder || null,
      bowler_gets_wicket: ['bowled', 'caught', 'lbw', 'stumped', 'hitwicket'].includes(wType),
      new_batter_id: wNewBatter || null,
      new_batter_is_striker: wNewBatterStriker
    });
    setShowWicketModal(false);
  };

  if (loading || !matchState) {
    return (
      <div className="setup-container text-center p-8">
        <p className="text-muted">Loading live scoring engine...</p>
      </div>
    );
  }

  const { current_innings, current_striker, current_non_striker, current_bowler } = matchState;

  return (
    <div className="setup-container max-width-600">
      {/* Top Action Header */}
      <div className="page-header-row mb-4">
        <div>
          <h1 className="page-title" style={{ fontSize: '1.6rem' }}>
            {matchState.team_a.short_name} <span style={{ color: 'var(--primary-indigo)' }}>VS</span> {matchState.team_b.short_name}
          </h1>
          <p className="page-description">{matchState.name || 'AH6 Tournament Match'}</p>
        </div>
        <button
          className="btn-stitch-secondary btn-compact"
          onClick={undoLastBall}
          disabled={submitting}
        >
          ↩️ Undo Ball
        </button>
      </div>

      {/* Hero Score Banner */}
      <div className="hero-stat-card mb-4">
        <div className="flex-between">
          <span className="hero-stat-header">
            {current_innings?.batting_team_name || 'BATTING'} INNINGS
          </span>
          <span className="live-badge">
            <span className="pulse-dot"></span> LIVE
          </span>
        </div>

        <div className="score-digits-row my-3">
          <h1 className="main-score-digits">
            {current_innings?.total_runs || 0} / {current_innings?.total_wickets || 0}
          </h1>
          <span className="overs-text">
            ({current_innings?.overs_display || '0.0'} Overs)
          </span>
        </div>

        <div className="flex-between border-top-subtle pt-3" style={{ opacity: 0.9, fontSize: '0.9rem' }}>
          <span>CRR: {current_innings?.crr ? current_innings.crr.toFixed(2) : '0.00'}</span>
          {current_innings?.target && (
            <span className="text-gold font-bold">
              Target: {current_innings.target} ({current_innings.runs_needed} runs from {current_innings.balls_remaining} balls)
            </span>
          )}
        </div>
      </div>

      {/* Recent Balls Strip */}
      <div className="stitch-card mb-4 p-4">
        <div className="flex-between mb-2">
          <span className="section-tag">RECENT DELIVERIES</span>
        </div>
        <div className="recent-balls-container">
          {matchState.recent_balls.length === 0 ? (
            <span className="text-muted text-sm">No balls bowled in this innings yet</span>
          ) : (
            matchState.recent_balls.slice(-8).map((b, i) => (
              <span
                key={i}
                className={`ball-chip ${
                  b.isWicket
                    ? 'chip-w'
                    : b.display.includes('6')
                    ? 'chip-6'
                    : b.display.includes('4')
                    ? 'chip-4'
                    : b.extraType !== 'none'
                    ? 'chip-extra'
                    : b.display === '0' || b.display === '•'
                    ? 'chip-dot'
                    : 'chip-run'
                }`}
              >
                {b.display === '0' ? '•' : b.display}
              </span>
            ))
          )}
        </div>
      </div>

      {matchState.is_free_hit && (
        <div className="free-hit-banner-box mb-4">
          🔥 FREE HIT! Next delivery cannot be dismissed (except Run Out)
        </div>
      )}

      {/* Active Batters & Bowler Card */}
      <div className="stitch-card mb-4">
        <h3 className="section-tag mb-3">CURRENT BATSMEN</h3>
        <div className="active-batsman-row mb-2 flex-between">
          <div>
            <span className="font-bold text-dark">🏏 {current_striker?.name || 'Striker'} *</span>
          </div>
          <div className="font-bold">
            {current_striker?.runs || 0} <span className="text-muted font-normal">({current_striker?.balls || 0}b)</span>
          </div>
        </div>

        {current_non_striker && current_non_striker.player_id !== current_striker?.player_id && (
          <div className="active-batsman-row mb-4 flex-between">
            <div>
              <span className="text-body">{current_non_striker.name}</span>
            </div>
            <div className="font-bold text-body">
              {current_non_striker.runs} <span className="text-muted font-normal">({current_non_striker.balls}b)</span>
            </div>
          </div>
        )}

        <div className="border-top-subtle pt-3 flex-between">
          <span className="section-tag">BOWLER</span>
          <span className="font-bold text-dark">
            🎳 {current_bowler ? `${current_bowler.name} (${current_bowler.overs_display} ov - ${current_bowler.wickets}w - ${current_bowler.runs_conceded}r)` : 'No Bowler Selected'}
          </span>
        </div>
      </div>

      {/* Main Scoring Pad Grid */}
      <div className="stitch-card p-6">
        <h3 className="section-tag mb-4 text-center">SCORING PAD</h3>

        <div className="scoring-pad-grid">
          <button
            className="score-btn score-6"
            disabled={submitting}
            onClick={() => recordBall({ bat_runs: 6, extra_runs: 0, extra_type: 'none', is_wicket: false })}
          >
            6
          </button>
          <button
            className="score-btn score-4"
            disabled={submitting}
            onClick={() => recordBall({ bat_runs: 4, extra_runs: 0, extra_type: 'none', is_wicket: false })}
          >
            4
          </button>
          <button
            className="score-btn score-run"
            disabled={submitting}
            onClick={() => recordBall({ bat_runs: 3, extra_runs: 0, extra_type: 'none', is_wicket: false })}
          >
            3
          </button>

          <button
            className="score-btn score-run"
            disabled={submitting}
            onClick={() => recordBall({ bat_runs: 2, extra_runs: 0, extra_type: 'none', is_wicket: false })}
          >
            2
          </button>
          <button
            className="score-btn score-run"
            disabled={submitting}
            onClick={() => recordBall({ bat_runs: 1, extra_runs: 0, extra_type: 'none', is_wicket: false })}
          >
            1
          </button>
          <button
            className="score-btn score-dot"
            disabled={submitting}
            onClick={() => recordBall({ bat_runs: 0, extra_runs: 0, extra_type: 'none', is_wicket: false })}
          >
            •
          </button>

          <button
            className="score-btn score-wicket span-3"
            disabled={submitting}
            onClick={() => {
              setWDismissed(current_striker?.player_id || '');
              loadBatters();
              setShowWicketModal(true);
            }}
          >
            🚨 WICKET OUT
          </button>

          <button
            className="score-btn score-extra"
            disabled={submitting}
            onClick={() => setShowExtrasModal({ type: 'NB' })}
          >
            NO BALL
          </button>
          <button
            className="score-btn score-extra"
            disabled={submitting}
            onClick={() => setShowExtrasModal({ type: 'WIDE' })}
          >
            WIDE
          </button>
          <button
            className="score-btn score-extra"
            disabled={submitting}
            onClick={() => setShowExtrasModal({ type: 'BYE' })}
          >
            BYE / LB
          </button>
        </div>
      </div>

      {/* WICKET MODAL */}
      {showWicketModal && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <h2>🚨 Record Wicket</h2>
            <form onSubmit={handleWicketSubmit} className="stitch-form-stack mt-4">
              <div className="input-group">
                <label>Dismissal Type</label>
                <select value={wType} onChange={e => setWType(e.target.value)}>
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="runout">Run Out</option>
                  <option value="stumped">Stumped</option>
                </select>
              </div>

              <div className="input-group">
                <label>Dismissed Batter</label>
                <select value={wDismissed} onChange={e => setWDismissed(e.target.value)}>
                  {current_striker && <option value={current_striker.player_id}>{current_striker.name} (Striker)</option>}
                  {current_non_striker && <option value={current_non_striker.player_id}>{current_non_striker.name} (Non-Striker)</option>}
                </select>
              </div>

              <div className="input-group">
                <label>New Batter Entering</label>
                <select value={wNewBatter} onChange={e => setWNewBatter(e.target.value)}>
                  <option value="">-- Select New Batter --</option>
                  {availableBatters
                    .filter(b => b.player_id !== current_striker?.player_id && b.player_id !== current_non_striker?.player_id)
                    .map(b => (
                      <option key={b.player_id} value={b.player_id}>{b.name}</option>
                    ))}
                </select>
              </div>

              <div className="checkbox-group-row">
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={wNewBatterStriker}
                    onChange={e => setWNewBatterStriker(e.target.checked)}
                  />
                  <span>New batter takes strike</span>
                </label>
              </div>

              <div className="form-action-buttons mt-4">
                <button type="submit" className="btn-stitch-primary width-100" style={{ background: '#dc2626' }}>
                  Confirm Wicket
                </button>
                <button
                  type="button"
                  className="btn-stitch-secondary width-100 mt-2"
                  onClick={() => setShowWicketModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTRAS MODAL */}
      {showExtrasModal && (
        <div className="modal-overlay">
          <div className="modal-content-card text-center">
            <h2>➕ {showExtrasModal.type} Extras</h2>
            <p className="text-muted mb-4">Select runs scored on this extra delivery</p>
            <div className="extras-choice-grid">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  className="btn-stitch-secondary"
                  onClick={() => {
                    let xt = 'none';
                    if (showExtrasModal.type === 'WIDE') xt = 'wide';
                    if (showExtrasModal.type === 'NB') xt = 'noball';
                    if (showExtrasModal.type === 'BYE') xt = 'bye';
                    if (showExtrasModal.type === 'LB') xt = 'legbye';
                    recordBall({
                      bat_runs: 0,
                      extra_runs: (xt === 'wide' || xt === 'noball' ? 1 : 0) + r,
                      extra_type: xt,
                      is_wicket: false
                    });
                    setShowExtrasModal(null);
                  }}
                >
                  {showExtrasModal.type} + {r}
                </button>
              ))}
            </div>
            <button
              className="btn-stitch-secondary width-100 mt-4"
              onClick={() => setShowExtrasModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* BOWLER SELECTION MODAL (OVER COMPLETE) */}
      {showBowlerModal && (
        <div className="modal-overlay">
          <div className="modal-content-card text-center">
            <h2>🎳 Over Completed!</h2>
            <p className="text-muted mb-4">Select the bowler for the next over</p>
            <div className="bowlers-choice-stack">
              {availableBowlers.map(b => (
                <button
                  key={b.player_id}
                  className={`btn-stitch-secondary width-100 ${!b.can_bowl ? 'disabled' : ''}`}
                  disabled={!b.can_bowl}
                  onClick={() => {
                    setShowBowlerModal(false);
                  }}
                >
                  {b.name} ({b.overs_bowled} ov bowled) {b.can_bowl ? '' : '- Max Overs Limit'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage;
