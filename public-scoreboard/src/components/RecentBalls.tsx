import type { MatchState } from '../types';

export default function RecentBalls({ recentBalls }: { recentBalls: MatchState['recent_balls'] }) {
  if (!recentBalls || recentBalls.length === 0) return null;

  // Group balls by overNumber
  const oversMap = new Map<number, typeof recentBalls>();
  
  recentBalls.forEach(ball => {
    if (!oversMap.has(ball.overNumber)) {
      oversMap.set(ball.overNumber, []);
    }
    oversMap.get(ball.overNumber)!.push(ball);
  });

  const overs = Array.from(oversMap.entries())
    .sort(([a], [b]) => b - a); // Descending order

  const getChipClass = (ball: typeof recentBalls[0]) => {
    if (ball.isWicket) return 'chip-w';
    if (ball.extraType === 'wd' || ball.extraType === 'nb') return 'chip-extra';
    if (ball.total === 6) return 'chip-6';
    if (ball.total === 4) return 'chip-4';
    if (ball.total === 0) return 'chip-dot';
    return 'chip-run';
  };

  return (
    <div className="recent-balls-section card">
      <div className="card-title">Recent Balls</div>
      <div className="overs-list">
        {overs.map(([overNum, balls]) => (
          <div key={overNum} className="over-row">
            <div className="over-label">Over {overNum}</div>
            <div className="balls-container">
              {balls.map((ball, i) => (
                <div key={`${overNum}-${ball.ballInOver}-${i}`} className={`ball-chip ${getChipClass(ball)}`}>
                  {ball.display}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
