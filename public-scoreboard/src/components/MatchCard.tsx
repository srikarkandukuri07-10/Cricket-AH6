import { useNavigate } from 'react-router-dom';
import type { MatchSummary } from '../types';

export default function MatchCard({ match }: { match: MatchSummary }) {
  const navigate = useNavigate();
  const isLive = ['innings1_live', 'innings2_live'].includes(match.status);
  const isCompleted = ['completed', 'abandoned'].includes(match.status);

  return (
    <div className="match-card card" onClick={() => navigate(`/match/${match.id}`)}>
      <div className="mc-header">
        <span className="mc-tournament">{match.tournament_name}</span>
        {isLive && <span className="mc-status-live"><span className="pulse-small"></span>LIVE</span>}
        {isCompleted && <span className="mc-status-completed">COMPLETED</span>}
        {!isLive && !isCompleted && <span className="mc-status-upcoming">UPCOMING</span>}
      </div>

      <div className="mc-teams">
        <div className="mc-team">
          <span className="mc-team-name" style={{ color: match.team_a.primary_color }}>
            {match.team_a.name}
          </span>
          {match.innings.find(i => i.batting_team_short === match.team_a.short_name) && (
            <span className="mc-team-score">
              {match.innings.find(i => i.batting_team_short === match.team_a.short_name)?.total_runs}/
              {match.innings.find(i => i.batting_team_short === match.team_a.short_name)?.total_wickets}
              <span className="mc-overs"> ({match.innings.find(i => i.batting_team_short === match.team_a.short_name)?.overs_display})</span>
            </span>
          )}
        </div>
        
        <div className="mc-team">
          <span className="mc-team-name" style={{ color: match.team_b.primary_color }}>
            {match.team_b.name}
          </span>
          {match.innings.find(i => i.batting_team_short === match.team_b.short_name) && (
            <span className="mc-team-score">
              {match.innings.find(i => i.batting_team_short === match.team_b.short_name)?.total_runs}/
              {match.innings.find(i => i.batting_team_short === match.team_b.short_name)?.total_wickets}
              <span className="mc-overs"> ({match.innings.find(i => i.batting_team_short === match.team_b.short_name)?.overs_display})</span>
            </span>
          )}
        </div>
      </div>

      <div className="mc-footer text-muted">
        {match.result_text ? (
          <span className="mc-result">{match.result_text}</span>
        ) : match.toss_summary ? (
          <span>{match.toss_summary}</span>
        ) : (
          <span>Match yet to begin</span>
        )}
      </div>
    </div>
  );
}
