import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MatchListPage from './pages/MatchListPage';
import LiveMatchPage from './pages/LiveMatchPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MatchListPage />} />
        <Route path="/match/:matchId" element={<LiveMatchPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
