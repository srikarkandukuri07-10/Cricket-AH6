import type { MatchState } from '../types';

export default function BowlingTable({ match }: { match: MatchState }) {
  const { bowling } = match;
  
  if (!bowling || bowling.length === 0) {
    return <div className="card text-center p-4">No bowling data available</div>;
  }

  return (
    <div className="table-container card">
      <table className="scorecard-table">
        <thead>
          <tr>
            <th className="text-left">Bowler</th>
            <th>O</th>
            <th>M</th>
            <th>R</th>
            <th>W</th>
            <th>ECO</th>
          </tr>
        </thead>
        <tbody>
          {bowling.map((bowler, i) => (
            <tr key={bowler.player_id || i} className={bowler.is_current ? 'current-player' : ''}>
              <td className="text-left">
                <div className="player-name">{bowler.name}</div>
              </td>
              <td>{bowler.overs_display}</td>
              <td>{bowler.maidens}</td>
              <td>{bowler.runs_conceded}</td>
              <td className="bold">{bowler.wickets}</td>
              <td>{bowler.economy.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
