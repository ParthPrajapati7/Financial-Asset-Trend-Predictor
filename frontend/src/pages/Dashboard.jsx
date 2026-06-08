import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AssetCard from '../components/AssetCard';
import '../styles/Dashboard.css';

function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      setAssets(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetClick = (symbol) => {
    navigate(`/asset/${symbol}`);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Asset Trend Predictor</h1>
        <p>Click on an asset to view detailed price history and predictions</p>
      </header>

      {error && <div className="error-message">Error: {error}</div>}

      <div className="assets-container">
        {loading ? (
          <p className="loading">Loading assets...</p>
        ) : (
          assets.map((asset) => (
            <AssetCard
              key={asset.symbol}
              asset={asset}
              onClick={() => handleAssetClick(asset.symbol)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Dashboard;
