import { useState } from 'react';
import { useMatchList } from '../hooks/useMatchList';
import MatchCard from '../components/MatchCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';

type Tab = 'LIVE' | 'UPCOMING' | 'COMPLETED';

export default function MatchListPage() {
  const { matches, loading, error } = useMatchList();
  const [activeTab, setActiveTab] = useState<Tab>('LIVE');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} />;

  const filteredMatches = matches.filter(m => {
    const isLive = ['innings1_live', 'innings2_live'].includes(m.status);
    const isCompleted = ['completed', 'abandoned'].includes(m.status);
    
    if (activeTab === 'LIVE') return isLive;
    if (activeTab === 'COMPLETED') return isCompleted;
    return !isLive && !isCompleted;
  });

  return (
    <div className="page-container">
      <header className="app-header">
        <h1>AH6 Cricket Scores</h1>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'LIVE' ? 'active' : ''}`}
          onClick={() => setActiveTab('LIVE')}
        >
          LIVE
        </button>
        <button 
          className={`tab-btn ${activeTab === 'UPCOMING' ? 'active' : ''}`}
          onClick={() => setActiveTab('UPCOMING')}
        >
          UPCOMING
        </button>
        <button 
          className={`tab-btn ${activeTab === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveTab('COMPLETED')}
        >
          COMPLETED
        </button>
      </div>

      <div className="matches-list">
        {filteredMatches.length > 0 ? (
          filteredMatches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))
        ) : (
          <div className="empty-state">
            No {activeTab.toLowerCase()} matches found.
          </div>
        )}
      </div>
    </div>
  );
}
