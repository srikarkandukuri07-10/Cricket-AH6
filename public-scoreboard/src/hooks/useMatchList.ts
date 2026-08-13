import { useState, useEffect } from 'react';
import type { MatchSummary } from '../types';
import api from '../lib/api';

export function useMatchList() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchMatches = async () => {
      try {
        const response = await api.get('/api/matches?status=all');
        if (isMounted) {
          setMatches(response.data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch matches');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { matches, loading, error };
}
