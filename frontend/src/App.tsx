import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import './styles/index.css';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard initialTab="overview" />} />
        <Route path="/appointments" element={<Dashboard initialTab="appointments" />} />
        <Route path="/patients" element={<Dashboard initialTab="patients" />} />
        <Route path="/doctors" element={<Dashboard initialTab="doctors" />} />
        <Route path="/coordination" element={<Dashboard initialTab="coordination" />} />
        <Route path="/settings" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
