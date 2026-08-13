import { useState, useEffect } from 'react';
import type { MatchState } from '../types';
import api from '../lib/api';
import { socketService } from '../lib/socket';

export function useLiveMatch(matchId: string | undefined) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    let isMounted = true;

    const fetchInitialState = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/matches/${matchId}/state`);
        if (isMounted) {
          setMatchState(response.data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch match state');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialState();

    const socket = socketService.connect();
    
    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join_match', matchId);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onScoreUpdate = (data: { matchId: string; state: MatchState }) => {
      if (data.matchId === matchId) {
        setMatchState(data.state);
        setFlash(true);
        setTimeout(() => setFlash(false), 1000);
      }
    };
    
    const onMatchStatusChange = (data: { matchId: string; status: string }) => {
        if (data.matchId === matchId) {
            fetchInitialState();
        }
    }

    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('score_update', onScoreUpdate);
    socket.on('match_status_change', onMatchStatusChange);

    return () => {
      isMounted = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('score_update', onScoreUpdate);
      socket.off('match_status_change', onMatchStatusChange);
      // Wait, don't disconnect the entire socket service if used elsewhere, 
      // but here we just leave the room.
      socket.emit('leave_match', matchId);
    };
  }, [matchId]);

  return { matchState, loading, error, isConnected, flash };
}
