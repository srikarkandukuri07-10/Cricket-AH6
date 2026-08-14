import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode; requireScorer?: boolean }> = ({ children, requireScorer }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="setup-container text-center p-8"><p className="text-muted">Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireScorer && !user.is_scorer) return <Navigate to="/" replace />;

  return <>{children}</>;
};
