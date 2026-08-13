import type { MatchState } from '../types';

export default function ScoreBanner({ match, flash }: { match: MatchState, flash: boolean }) {
  const isLive = ['innings1_live', 'innings2_live'].includes(match.status);
  const isCompleted = ['completed', 'abandoned'].includes(match.status);

  return (
    <div className={`score-banner ${flash ? 'flash' : ''}`}>
      <div className="sb-header">
        {isLive && <div className="live-badge"><span className="pulse"></span>LIVE</div>}
        {isCompleted && <div className="completed-badge">COMPLETED</div>}
        <div className="tournament-name">{match.tournament_name}</div>
      </div>

      <div className="sb-main">
        {match.current_innings ? (
          <div className="innings-info">
            <div className="batting-team-info">
              <span className="team-name" style={{ color: match.current_innings.batting_team_color }}>
                {match.current_innings.batting_team_name}
              </span>
              <div className="score-main">
                {match.current_innings.total_runs}/{match.current_innings.total_wickets}
              </div>
              <div className="overs-main">
                {match.current_innings.overs_display} Overs
              </div>
            </div>
          </div>
        ) : (
          <div className="match-title">{match.name}</div>
        )}

        {match.current_innings && (
          <div className="target-info">
            {match.current_innings.target ? (
              <>
                <div className="target-text">
                  TARGET: {match.current_innings.target} vs {match.current_innings.bowling_team_name}
                </div>
                <div className="equation-text">
                  Need {match.current_innings.runs_needed} runs from {match.current_innings.balls_remaining} balls
                </div>
              </>
            ) : (
              <div className="target-text">
                1st Innings vs {match.current_innings.bowling_team_name}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sb-footer">
        {match.current_innings && (
          <div className="run-rates">
            <span>CRR: {match.current_innings.crr.toFixed(2)}</span>
            {match.current_innings.rrr !== null && (
              <span>RRR: {match.current_innings.rrr.toFixed(2)}</span>
            )}
          </div>
        )}
        
        {isCompleted && match.result_text && (
          <div className="result-text">{match.result_text}</div>
        )}
      </div>
    </div>
  );
}
