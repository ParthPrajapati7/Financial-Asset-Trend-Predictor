import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AssetDetail from './pages/AssetDetail';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/asset/:symbol" element={<AssetDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
