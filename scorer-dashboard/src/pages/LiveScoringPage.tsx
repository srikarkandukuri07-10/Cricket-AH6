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
  const [pendingBowlerId, setPendingBowlerId] = useState<string | null>(null);

  // Modals
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showExtrasModal, setShowExtrasModal] = useState<{type: string} | null>(null);
  
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
    const { data } = await api.get(`/api/admin/matches/${matchId}/available-bowlers`);
    setAvailableBowlers(data);
  };
  
  const loadBatters = async () => {
    const { data } = await api.get(`/api/admin/matches/${matchId}/available-batters`);
    setAvailableBatters(data);
  };

  const recordBall = async (payload: any) => {
    if (submitting || !matchState?.current_innings) return;
    setSubmitting(true);
    try {
      const body = { ...payload };
      if (pendingBowlerId) {
        body.bowler_id = pendingBowlerId;
      }
      await api.post(`/api/admin/innings/${matchState.current_innings.id}/balls`, body);
      setPendingBowlerId(null);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to record ball');
    } finally {
      setSubmitting(false);
    }
  };

  const undoLastBall = async () => {
    if (!matchState?.current_innings || submitting) return;
    if (!window.confirm('Undo last ball?')) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/admin/innings/${matchState.current_innings.id}/balls/last`);
      toast.success('Undo successful');
    } catch (e) { toast.error('Undo failed'); }
    finally { setSubmitting(false); }
  };

  // Modals handlers
  const handleWicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wDismissed || !wNewBatter) return toast.error('Select batters');
    
    recordBall({
      bat_runs: 0, extra_runs: 0, extra_type: 'none',
      is_wicket: true, dismissal_type: wType,
      dismissed_batter_id: wDismissed,
      fielder_id: wFielder || null,
      bowler_gets_wicket: ['bowled','caught','lbw','stumped','hitwicket'].includes(wType),
      new_batter_id: wNewBatter,
      new_batter_is_striker: wNewBatterStriker
    });
    setShowWicketModal(false);
  };

  if (loading || !matchState) return <div className="loading">Loading...</div>;

  const { current_innings, current_striker, current_non_striker, current_bowler } = matchState;

  return (
    <div className="scoring-page">
      <div className="scoring-header">
        <div className="match-title">{matchState.team_a.short_name} vs {matchState.team_b.short_name}</div>
        <div className="header-actions">
          <button className="btn btn-small" onClick={undoLastBall} disabled={submitting}>UNDO</button>
        </div>
      </div>

      <div className="score-card">
        <div className="score-main">
          <h1>{current_innings?.total_runs}/{current_innings?.total_wickets}</h1>
          <span className="overs">{current_innings?.overs_display}</span>
        </div>
        <div className="score-sub">
          CRR: {current_innings?.crr.toFixed(2)} {current_innings?.target ? ` | Target: ${current_innings.target}` : ''}
        </div>
      </div>

      <div className="recent-balls card">
        <span>Recent: </span>
        <div className="balls-list">
          {matchState.recent_balls.slice(-6).map((b, i) => (
            <span key={i} className={`ball-chip ${b.isWicket ? 'wicket' : b.display.includes('4') ? 'four' : b.display.includes('6') ? 'six' : b.extraType !== 'none' ? 'extra' : 'dot'}`}>
              {b.display}
            </span>
          ))}
        </div>
      </div>

      {matchState.is_free_hit && <div className="free-hit-banner">FREE HIT 🔥 next ball</div>}

      <div className="players-card card">
        <div className="batters-list">
          {current_striker && <div>🏏 {current_striker.name}* {current_striker.runs}({current_striker.balls})</div>}
          {current_non_striker && <div>   {current_non_striker.name} {current_non_striker.runs}({current_non_striker.balls})</div>}
        </div>
        <hr className="divider" />
        <div className="current-bowler">
          {current_bowler ? `🎳 ${current_bowler.name} ${current_bowler.overs_display}-X-${current_bowler.runs_conceded}-${current_bowler.wickets}` : 'No Bowler Selected'}
        </div>
      </div>

      <div className="scoring-grid">
        {[6,4,3,2,1,0].map(r => (
          <button key={r} className={`btn btn-score btn-${r}`} disabled={submitting} 
            onClick={() => recordBall({ bat_runs: r, extra_runs: 0, extra_type: 'none', is_wicket: false })}>
            {r === 0 ? '•' : r}
          </button>
        ))}
        
        <button className="btn btn-score btn-w" disabled={submitting} onClick={() => {
          setWDismissed(current_striker?.player_id || '');
          loadBatters();
          setShowWicketModal(true);
        }}>WICKET</button>
        
        {['NB', 'WIDE', 'BY', 'LB'].map(xt => (
          <button key={xt} className="btn btn-score btn-extra" disabled={submitting}
            onClick={() => setShowExtrasModal({ type: xt })}>
            {xt}
          </button>
        ))}
      </div>

      {/* Modals */}
      {showWicketModal && (
        <div className="modal">
          <div className="modal-content card">
            <h3>Wicket</h3>
            <form onSubmit={handleWicketSubmit}>
              <select value={wType} onChange={e=>setWType(e.target.value)}>
                <option value="bowled">Bowled</option>
                <option value="caught">Caught</option>
                <option value="lbw">LBW</option>
                <option value="runout">Run Out</option>
                <option value="stumped">Stumped</option>
              </select>
              <select value={wDismissed} onChange={e=>setWDismissed(e.target.value)}>
                <option value="">Dismissed Batter</option>
                {current_striker && <option value={current_striker.player_id}>{current_striker.name}</option>}
                {current_non_striker && <option value={current_non_striker.player_id}>{current_non_striker.name}</option>}
              </select>
              <select value={wNewBatter} onChange={e=>setWNewBatter(e.target.value)}>
                <option value="">New Batter</option>
                {availableBatters.map(b => <option key={b.player_id} value={b.player_id}>{b.name}</option>)}
              </select>
              <div>
                <label><input type="checkbox" checked={wNewBatterStriker} onChange={e=>setWNewBatterStriker(e.target.checked)} /> New batter on strike</label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowWicketModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-w">OUT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExtrasModal && (
        <div className="modal">
          <div className="modal-content card">
            <h3>{showExtrasModal.type} Extras</h3>
            <div className="extras-grid">
              {[0,1,2,3,4,6].map(r => (
                <button key={r} className="btn" onClick={() => {
                  let xt = 'none';
                  if (showExtrasModal.type === 'WIDE') xt = 'wide';
                  if (showExtrasModal.type === 'NB') xt = 'noball';
                  if (showExtrasModal.type === 'BY') xt = 'bye';
                  if (showExtrasModal.type === 'LB') xt = 'legbye';
                  recordBall({ bat_runs: 0, extra_runs: (xt==='wide'||xt==='noball'?1:0) + r, extra_type: xt, is_wicket: false });
                  setShowExtrasModal(null);
                }}>
                  {showExtrasModal.type} + {r}
                </button>
              ))}
            </div>
            <button className="btn mt-4 full-width" onClick={() => setShowExtrasModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {showBowlerModal && (
        <div className="modal">
          <div className="modal-content card">
            <h3>Select New Bowler</h3>
            <div className="bowlers-list">
              {availableBowlers.map(b => (
                <button key={b.player_id} className="btn" disabled={!b.can_bowl} onClick={() => {
                  setPendingBowlerId(b.player_id);
                  setShowBowlerModal(false);
                }}>
                  {b.name} ({b.overs_bowled} ov) {b.can_bowl ? '' : '- Max Overs'}
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
