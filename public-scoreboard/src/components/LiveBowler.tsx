import type { MatchState } from '../types';

export default function LiveBowler({ match }: { match: MatchState }) {
  const { current_bowler } = match;

  if (!current_bowler) return null;

  return (
    <div className="live-widget card mt-3">
      <div className="widget-header text-muted">BOWLER</div>
      <table className="widget-table">
        <thead>
          <tr>
            <th className="text-left">Name</th>
            <th>O</th>
            <th>M</th>
            <th>R</th>
            <th>W</th>
            <th>ECO</th>
          </tr>
        </thead>
        <tbody>
          <tr className="current-player">
            <td className="text-left">{current_bowler.name}</td>
            <td>{current_bowler.overs_display}</td>
            <td>{current_bowler.maidens}</td>
            <td>{current_bowler.runs_conceded}</td>
            <td className="bold">{current_bowler.wickets}</td>
            <td>{current_bowler.economy.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
