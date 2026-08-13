import type { MatchState } from '../types';

export default function BattingTable({ match }: { match: MatchState }) {
  const { batting } = match;
  
  if (!batting || batting.length === 0) {
    return <div className="card text-center p-4">No batting data available</div>;
  }

  const sortedBatting = [...batting].sort((a, b) => a.batting_position - b.batting_position);

  return (
    <div className="table-container card">
      <table className="scorecard-table">
        <thead>
          <tr>
            <th className="text-left">Batter</th>
            <th>R</th>
            <th>B</th>
            <th>4s</th>
            <th>6s</th>
            <th>SR</th>
          </tr>
        </thead>
        <tbody>
          {sortedBatting.map(batter => {
            const isCurrent = batter.is_striker || batter.is_non_striker;
            return (
              <tr key={batter.player_id} className={isCurrent ? 'current-player' : ''}>
                <td className="text-left">
                  <div className="player-name">
                    {batter.name} {batter.is_striker ? '*' : ''}
                  </div>
                  <div className="dismissal-text">
                    {batter.is_not_out ? 'not out' : batter.dismissal}
                  </div>
                </td>
                <td className="bold">{batter.runs}</td>
                <td>{batter.balls}</td>
                <td>{batter.fours}</td>
                <td>{batter.sixes}</td>
                <td>{batter.sr.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
