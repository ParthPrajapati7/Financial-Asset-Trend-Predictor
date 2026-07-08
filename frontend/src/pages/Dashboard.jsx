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
  const [newSymbol, setNewSymbol] = useState('');
  const [addingAsset, setAddingAsset] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);
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

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    
    const symbol = newSymbol.trim().toUpperCase();
    
    // Client-side duplicate check
    if (assets.some(asset => asset.symbol === symbol)) {
      setAddError(`Asset ${symbol} is already on the dashboard.`);
      setAddSuccess(null);
      return;
    }
    
    try {
      setAddingAsset(true);
      setAddError(null);
      setAddSuccess(null);
      
      const response = await fetch('http://localhost:5000/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add asset');
      }
      
      // Update assets list locally
      const updatedAssets = [...assets, { symbol: data.symbol, name: data.name, color: data.color }];
      setAssets(updatedAssets);
      setNewSymbol('');
      setAddSuccess(data.message || `Successfully added ${data.name} (${data.symbol})!`);
      
      // Now fetch prediction for the new asset
      try {
        const predRes = await fetch(`http://localhost:5000/api/assets/${data.symbol}/prediction`);
        if (predRes.ok) {
          const predData = await predRes.json();
          setPredictions(prev => ({
            ...prev,
            [data.symbol]: predData
          }));
        }
      } catch (predErr) {
        console.error(`Failed to fetch prediction for ${data.symbol}:`, predErr);
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setAddSuccess(null);
      }, 5000);
      
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddingAsset(false);
    }
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

          {/* Add Asset Control Panel */}
          <div className="add-asset-container">
            <h3 className="add-asset-title">Expand Dashboard Coverage</h3>
            <p className="add-asset-subtitle">Query new ticker symbols from Yahoo Finance to ingest real-time OHLCV data & train predictive linear models.</p>
            <form onSubmit={handleAddAsset} className="add-asset-form">
              <div className="search-input-wrapper">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  type="text"
                  placeholder="ENTER TICKER SYMBOL (E.G. NVDA, MSFT, BTC-USD)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  disabled={addingAsset}
                  className="search-input"
                />
              </div>
              <button type="submit" className="add-asset-btn" disabled={addingAsset || !newSymbol.trim()}>
                {addingAsset ? (
                  <span className="btn-loading-content">
                    <span className="spinner-mini"></span>
                    INGESTING...
                  </span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="btn-icon"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    ADD ASSET
                  </>
                )}
              </button>
            </form>
            
            {addError && (
              <div className="add-message error-message">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="message-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>{addError}</span>
              </div>
            )}
            
            {addSuccess && (
              <div className="add-message success-message">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="message-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{addSuccess}</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
