import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveMatch } from '../hooks/useLiveMatch';
import ScoreBanner from '../components/ScoreBanner';
import RecentBalls from '../components/RecentBalls';
import WinProbabilityBar from '../components/WinProbabilityBar';
import LiveBatsmen from '../components/LiveBatsmen';
import LiveBowler from '../components/LiveBowler';
import BattingTable from '../components/BattingTable';
import BowlingTable from '../components/BowlingTable';
import SquadsView from '../components/SquadsView';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { Fireworks } from '../components/Fireworks';

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { matchState, loading, error, isConnected, flash } = useLiveMatch(matchId);
  const [activeTab, setActiveTab] = useState<'BATTING' | 'BOWLING' | 'INFO' | 'SQUADS'>('BATTING');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} />;
  if (!matchState) return <ErrorState message="Match not found" />;

  const isLive = ['innings1_live', 'innings2_live'].includes(matchState.status);
  const isCompleted = ['completed', 'abandoned'].includes(matchState.status);

  return (
    <div className="page-container match-page">
      {isCompleted && <Fireworks />}

      <div className="nav-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Matches</button>
        <div className="connection-status">
          {isConnected ? (
             <span className="status-connected">● Connected</span>
          ) : (
             <span className="status-disconnected">○ Connecting...</span>
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="card text-center p-6 my-3" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde047 100%)', color: '#78350f', border: '2px solid #f59e0b', borderRadius: '18px' }}>
          <div style={{ fontSize: '3rem' }}>🏆</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>MATCH COMPLETED!</h2>
          <p className="mt-2" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#92400e' }}>
            {matchState.result_text || 'Official match result finalized'}
          </p>
        </div>
      )}

      {matchState.is_free_hit && (
        <div className="free-hit-banner">🔥 FREE HIT!</div>
      )}

      <ScoreBanner match={matchState} flash={flash} />

      {matchState.status === 'innings_break' && (
        <div className="innings-break-banner card text-center p-4 my-3">
          <h2>Innings Break</h2>
          <p className="mt-2 text-muted">First innings complete. Waiting for second innings to start...</p>
        </div>
      )}

      {isLive && (
        <>
          <WinProbabilityBar match={matchState} />
          
          <div className="live-widgets-grid">
            <LiveBatsmen match={matchState} />
            <LiveBowler match={matchState} />
          </div>

          <RecentBalls recentBalls={matchState.recent_balls} />
        </>
      )}

      <div className="tabs-container mt-4">
        <button className={`tab-btn ${activeTab === 'BATTING' ? 'active' : ''}`} onClick={() => setActiveTab('BATTING')}>Batting</button>
        <button className={`tab-btn ${activeTab === 'BOWLING' ? 'active' : ''}`} onClick={() => setActiveTab('BOWLING')}>Bowling</button>
        <button className={`tab-btn ${activeTab === 'INFO' ? 'active' : ''}`} onClick={() => setActiveTab('INFO')}>Info</button>
        <button className={`tab-btn ${activeTab === 'SQUADS' ? 'active' : ''}`} onClick={() => setActiveTab('SQUADS')}>Squads</button>
      </div>

      <div className="tab-content">
        {activeTab === 'BATTING' && <BattingTable match={matchState} />}
        {activeTab === 'BOWLING' && <BowlingTable match={matchState} />}
        {activeTab === 'SQUADS' && matchId && <SquadsView matchId={matchId} />}
        {activeTab === 'INFO' && (
          <div className="info-card card p-4">
            <div className="info-row">
              <span className="info-label">Toss:</span>
              <span>{matchState.toss_summary || 'Toss not completed'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Venue:</span>
              <span>{matchState.venue}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Format:</span>
              <span>{matchState.overs_per_innings} Overs</span>
            </div>
            {matchState.current_innings && (
              <div className="info-row">
                <span className="info-label">Extras:</span>
                <span>
                  {matchState.current_innings.extras.total} 
                  (wd {matchState.current_innings.extras.wides}, nb {matchState.current_innings.extras.noballs}, 
                  b {matchState.current_innings.extras.byes}, lb {matchState.current_innings.extras.legbyes})
                </span>
              </div>
            )}
            
            {matchState.fall_of_wickets && matchState.fall_of_wickets.length > 0 && (
              <div className="fow-section mt-4">
                <h4 className="mb-2 text-muted">Fall of Wickets</h4>
                <div className="fow-text">
                  {matchState.fall_of_wickets.map(fow => (
                    `${fow.wicket_number}-${fow.score_at_fall} (${fow.player_name}, ${fow.over_at_fall})`
                  )).join(', ')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
