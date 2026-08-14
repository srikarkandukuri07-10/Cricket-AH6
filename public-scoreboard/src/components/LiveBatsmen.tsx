import type { MatchState } from '../types';

export default function LiveBatsmen({ match }: { match: MatchState }) {
  const { current_striker, current_non_striker, partnership } = match;

  if (!current_striker && !current_non_striker) return null;

  return (
    <div className="live-widget card">
      <div className="widget-header text-muted">BATSMEN</div>
      <table className="widget-table">
        <thead>
          <tr>
            <th className="text-left">Name</th>
            <th>R</th>
            <th>B</th>
            <th>4s</th>
            <th>6s</th>
            <th>SR</th>
          </tr>
        </thead>
        <tbody>
          {current_striker && (
            <tr className="current-player">
              <td className="text-left">{current_striker.name}*</td>
              <td className="bold">{current_striker.runs}</td>
              <td>{current_striker.balls}</td>
              <td>{current_striker.fours}</td>
              <td>{current_striker.sixes}</td>
              <td>{current_striker.sr.toFixed(1)}</td>
            </tr>
          )}
          {current_non_striker && current_non_striker.player_id !== current_striker?.player_id && (
            <tr>
              <td className="text-left">{current_non_striker.name}</td>
              <td className="bold">{current_non_striker.runs}</td>
              <td>{current_non_striker.balls}</td>
              <td>{current_non_striker.fours}</td>
              <td>{current_non_striker.sixes}</td>
              <td>{current_non_striker.sr.toFixed(1)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {partnership && (
        <div className="partnership-text">
          Partnership: {partnership.runs} runs from {partnership.balls} balls
        </div>
      )}
    </div>
  );
}
