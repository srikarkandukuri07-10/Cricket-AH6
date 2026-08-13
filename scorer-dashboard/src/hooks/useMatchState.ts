import { useState, useEffect } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import type { MatchState } from '../types';

export const useMatchState = (matchId: string | undefined) => {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    
    let isMounted = true;
    
    const fetchState = async () => {
      try {
        const { data } = await api.get(`/api/matches/${matchId}/state`);
        if (isMounted) {
          setMatchState(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch match state');
          setLoading(false);
        }
      }
    };
    
    fetchState();
    
    const socket = getSocket();
    socket.emit('join_match', matchId);
    
    const handleUpdate = ({ state }: { matchId: string, state: MatchState }) => {
      setMatchState(state);
    };
    
    socket.on('score_update', handleUpdate);
    
    return () => {
      isMounted = false;
      socket.off('score_update', handleUpdate);
    };
  }, [matchId]);

  return { matchState, loading, error, setMatchState };
};
