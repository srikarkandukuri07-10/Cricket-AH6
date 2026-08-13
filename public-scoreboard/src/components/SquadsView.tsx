import { useState, useEffect } from 'react';
import type { MatchDetails, SquadPlayer } from '../types';
import api from '../lib/api';

export default function SquadsView({ matchId }: { matchId: string }) {
  const [details, setDetails] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/api/matches/${matchId}`);
        setDetails(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [matchId]);

  if (loading) return <div className="p-4 text-center">Loading squads...</div>;
  if (!details) return <div className="p-4 text-center">Failed to load squads</div>;

  const renderSquad = (squad: SquadPlayer[], teamName: string) => (
    <div className="squad-column">
      <h3 className="squad-team-name">{teamName}</h3>
      <div className="squad-list">
        {squad.map(p => (
          <div key={p.id} className="squad-player">
            <span className="squad-player-name">{p.name}</span>
            <span className="squad-player-tags">
              {p.is_captain && <span className="tag-c">C</span>}
              {p.is_wicket_keeper && <span className="tag-wk">WK</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="squads-container card p-4">
      <div className="squads-grid">
        {renderSquad(details.team_a_squad, details.team_a.name)}
        {renderSquad(details.team_b_squad, details.team_b.name)}
      </div>
    </div>
  );
}
