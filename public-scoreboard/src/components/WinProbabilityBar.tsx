import type { MatchState } from '../types';

export default function WinProbabilityBar({ match }: { match: MatchState }) {
  if (!match.win_probability || match.status !== 'innings2_live') return null;

  const { batting, bowling } = match.win_probability;
  const battingTeam = match.current_innings?.batting_team_short || 'BAT';
  const bowlingTeam = match.current_innings?.bowling_team_name || 'BOWL'; // wait, short name not always available

  return (
    <div className="win-prob-section card">
      <div className="card-title">Live Win Estimate</div>
      <div className="prob-bar-container">
        <div className="prob-bar">
          <div 
            className="prob-fill-batting" 
            style={{ width: `${batting}%`, backgroundColor: match.current_innings?.batting_team_color || '#e8461a' }}
          >
            <span className="prob-text">{battingTeam} {batting.toFixed(0)}%</span>
          </div>
          <div 
            className="prob-fill-bowling" 
            style={{ width: `${bowling}%` }}
          >
            <span className="prob-text">{bowling.toFixed(0)}% {bowlingTeam}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
