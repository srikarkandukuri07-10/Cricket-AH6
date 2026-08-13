import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SetupPage from './pages/SetupPage';
import CreateMatchPage from './pages/CreateMatchPage';
import SquadSelectionPage from './pages/SquadSelectionPage';
import TossPage from './pages/TossPage';
import InningsSetupPage from './pages/InningsSetupPage';
import LiveScoringPage from './pages/LiveScoringPage';
import MatchResultPage from './pages/MatchResultPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<Layout />}>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
          <Route path="/matches/new" element={<ProtectedRoute><CreateMatchPage /></ProtectedRoute>} />
          <Route path="/matches/:matchId/squads" element={<ProtectedRoute><SquadSelectionPage /></ProtectedRoute>} />
          <Route path="/matches/:matchId/toss" element={<ProtectedRoute><TossPage /></ProtectedRoute>} />
          <Route path="/matches/:matchId/innings-setup" element={<ProtectedRoute><InningsSetupPage /></ProtectedRoute>} />
          <Route path="/matches/:matchId/score" element={<ProtectedRoute><LiveScoringPage /></ProtectedRoute>} />
          <Route path="/matches/:matchId/result" element={<ProtectedRoute><MatchResultPage /></ProtectedRoute>} />
          {/* Add a catch-all router for matches to redirect based on state */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
