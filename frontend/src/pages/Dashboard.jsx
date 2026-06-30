import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AssetCard from '../components/AssetCard';
import '../styles/Dashboard.css';

function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const assetsData = await response.json();
      setAssets(assetsData);

      // Fetch predictions for all assets concurrently
      const predictionPromises = assetsData.map(async (asset) => {
        try {
          const res = await fetch(`http://localhost:5000/api/assets/${asset.symbol}/prediction`);
          if (res.ok) {
            const data = await res.json();
            return { symbol: asset.symbol, prediction: data };
          }
        } catch (err) {
          console.error(`Failed to fetch prediction for ${asset.symbol}:`, err);
        }
        return { symbol: asset.symbol, prediction: null };
      });

      const results = await Promise.all(predictionPromises);
      const predictionMap = {};
      results.forEach((item) => {
        if (item.prediction) {
          predictionMap[item.symbol] = item.prediction;
        }
      });
      setPredictions(predictionMap);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetClick = (symbol) => {
    navigate(`/asset/${symbol}`);
  };

  // Compute stats
  const totalAssets = assets.length;
  const predictionKeys = Object.keys(predictions);
  
  let avgR2 = 0;
  let bullishCount = 0;
  let bearishCount = 0;

  if (predictionKeys.length > 0) {
    let r2Sum = 0;
    predictionKeys.forEach((key) => {
      const pred = predictions[key];
      if (pred && pred.metrics) {
        r2Sum += pred.metrics.r2 || 0;
      }
      if (pred) {
        const isBullish = pred.predicted_next_close > pred.current_price;
        if (isBullish) bullishCount++;
        else bearishCount++;
      }
    });
    avgR2 = r2Sum / predictionKeys.length;
  }

  return (
    <div className="dashboard-container">
      {/* Top Banner / Ticker Info */}
      <header className="terminal-header">
        <div className="terminal-brand">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="terminal-logo"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          <span className="brand-name">QUANTUM_PREDICT</span>
          <span className="live-pill">
            <span className="pulse-dot"></span>
            LIVE FEED
          </span>
        </div>
        <div className="terminal-meta">
          <span className="meta-item">SYSTEM: <span className="text-success">NOMINAL</span></span>
          <span className="meta-item time-display">{currentTime}</span>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-hero">
          <h1>Predictive Asset Analytics</h1>
          <p>Next-day closing price forecasting utilizing real-time linear regression modeling and standard scaling pipelines.</p>
        </div>

        {error && (
          <div className="error-banner">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="error-icon"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span>System Error: {error}</span>
            <button onClick={fetchData} className="retry-button">Retry Connection</button>
          </div>
        )}

        {/* Financial Terminal Stats Grid */}
        <section className="terminal-stats-grid">
          <div className="stat-panel">
            <div className="stat-header">
              <span className="stat-label">MONITORED SYMBOLS</span>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" class="stat-icon"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div className="stat-value">{loading ? '...' : totalAssets}</div>
            <div className="stat-footer">Assets updating in real-time</div>
          </div>
          <div className="stat-panel">
            <div className="stat-header">
              <span className="stat-label">AVG MODEL ACCURACY (R²)</span>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" class="stat-icon"><path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z"></path></svg>
            </div>
            <div className="stat-value">{loading ? '...' : `${(avgR2 * 100).toFixed(2)}%`}</div>
            <div className="stat-footer">Linear regression determination</div>
          </div>
          <div className="stat-panel highlight-bullish">
            <div className="stat-header">
              <span className="stat-label">BULLISH SENTIMENT</span>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#10b981" strokeWidth="2.5" fill="none" class="stat-icon"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
            <div className="stat-value text-success">{loading ? '...' : bullishCount}</div>
            <div className="stat-footer">Assets predicted to close higher</div>
          </div>
          <div className="stat-panel highlight-bearish">
            <div className="stat-header">
              <span className="stat-label">BEARISH SENTIMENT</span>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" class="stat-icon"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            </div>
            <div className="stat-value text-error">{loading ? '...' : bearishCount}</div>
            <div className="stat-footer">Assets predicted to close lower</div>
          </div>
        </section>

        {/* Grid Container */}
        <section className="assets-section">
          <div className="section-title-bar">
            <h2>Select Asset to Predict</h2>
            <div className="live-pulse-container">
              <span className="pulse-circle"></span>
              <span className="pulse-text">Pipeline Ready</span>
            </div>
          </div>
          
          <div className="assets-grid">
            {loading ? (
              // Skeleton screens
              [1, 2, 3].map((idx) => (
                <div key={idx} className="asset-card-skeleton">
                  <div className="skeleton-line skeleton-header"></div>
                  <div className="skeleton-line skeleton-body-1"></div>
                  <div className="skeleton-line skeleton-body-2"></div>
                  <div className="skeleton-button"></div>
                </div>
              ))
            ) : (
              assets.map((asset) => (
                <AssetCard
                  key={asset.symbol}
                  asset={asset}
                  prediction={predictions[asset.symbol]}
                  onClick={() => handleAssetClick(asset.symbol)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
