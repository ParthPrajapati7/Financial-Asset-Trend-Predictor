import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/AssetDetail.css';

const ASSET_COLORS = {
  AAPL: '#f8fafc', // Apple silver/white for dark mode
  TSLA: '#ef4444', // Tesla vibrant red
  META: '#3b82f6', // Meta vibrant blue
};

// Custom premium dark tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-date">{label}</p>
        <div className="tooltip-divider"></div>
        {payload.map((item, idx) => (
          <div key={idx} className="tooltip-item">
            <span className="tooltip-dot" style={{ backgroundColor: item.stroke }}></span>
            <span className="tooltip-name">{item.name}:</span>
            <span className="tooltip-val">${item.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function AssetDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAssetData();
    fetchPrediction();
  }, [symbol]);

  const fetchAssetData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/assets/${symbol}/history`);
      if (!response.ok) throw new Error('Failed to fetch asset data');
      const data = await response.json();
      setAsset(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching asset:', err);
    }
  };

  const fetchPrediction = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/assets/${symbol}/prediction`);
      if (!response.ok) throw new Error('Failed to fetch prediction');
      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      console.error('Error fetching prediction:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="detail-loading-container">
      <div className="pulse-spinner"></div>
      <span>Querying Quant Pipeline...</span>
    </div>
  );
  
  if (error) return (
    <div className="detail-error-container">
      <div className="error-card">
        <h3>Model Fetch Error</h3>
        <p>{error}</p>
        <button className="back-button-error" onClick={() => navigate('/')}>← Return to Terminal</button>
      </div>
    </div>
  );
  
  if (!asset) return <div className="error-message">Asset not found</div>;

  const brandColor = ASSET_COLORS[symbol.toUpperCase()] || '#3b82f6';

  const chartData = asset.data.slice(-180).map((item) => ({
    date: item.Date,
    close: parseFloat(item.Close?.toFixed(2)),
    open: parseFloat(item.Open?.toFixed(2)),
    high: parseFloat(item.High?.toFixed(2)),
    low: parseFloat(item.Low?.toFixed(2)),
  }));

  // Trend determination for prediction header
  const currentPrice = prediction?.current_price;
  const predictedClose = prediction?.predicted_next_close;
  const isBullish = predictedClose > currentPrice;
  const percentChange = currentPrice ? ((predictedClose - currentPrice) / currentPrice) * 100 : 0;

  return (
    <div className="asset-detail-container" style={{ '--brand-color': brandColor }}>
      <header className="detail-header-bar">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="back-icon"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          <span>Terminal</span>
        </button>
        <div className="header-title-area">
          <h1>{asset.name}</h1>
          <span className="symbol-tag">{asset.symbol}</span>
        </div>
        <div className={`detail-trend-indicator ${isBullish ? 'bullish' : 'bearish'}`}>
          <span className="indicator-dot"></span>
          <span>{isBullish ? 'BULLISH TREND DETECTED' : 'BEARISH TREND DETECTED'}</span>
        </div>
      </header>

      <div className="detail-content-grid">
        {/* Main Chart Section */}
        <section className="detail-panel chart-panel">
          <div className="panel-header">
            <h2>180-Day Price Movement & Range</h2>
            <div className="chart-legend-custom">
              <span className="legend-item"><span className="legend-line" style={{ backgroundColor: brandColor }}></span>Close</span>
              <span className="legend-item"><span className="legend-line" style={{ backgroundColor: '#10b981' }}></span>High</span>
              <span className="legend-item"><span className="legend-line" style={{ backgroundColor: '#ef4444' }}></span>Low</span>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255, 255, 255, 0.3)" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}
                />
                <YAxis 
                  stroke="rgba(255, 255, 255, 0.3)" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke={brandColor} 
                  strokeWidth={2.5}
                  dot={false} 
                  name="Close Price" 
                />
                <Line 
                  type="monotone" 
                  dataKey="high" 
                  stroke="#10b981" 
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false} 
                  name="Daily High" 
                />
                <Line 
                  type="monotone" 
                  dataKey="low" 
                  stroke="#ef4444" 
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false} 
                  name="Daily Low" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Prediction Results & Stats Section */}
        {prediction && (
          <section className="detail-panel predictions-panel">
            <div className="panel-header">
              <h2>Model Execution Results</h2>
            </div>
            
            {/* Primary Prediction Big Card */}
            <div className="prediction-hero-block">
              <div className="hero-main">
                <span className="hero-label">NEXT CLOSE FORECAST</span>
                <span className="hero-val">${prediction.predicted_next_close?.toFixed(2)}</span>
              </div>
              <div className={`hero-sub ${isBullish ? 'up' : 'down'}`}>
                <span className="change-pct">
                  {isBullish ? '▲' : '▼'} {Math.abs(percentChange).toFixed(2)}%
                </span>
                <span className="change-lbl">vs current price</span>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="metrics-grid">
              <div className="metric-box border-brand">
                <span className="box-lbl">CURRENT PRICE</span>
                <span className="box-val">${prediction.current_price?.toFixed(2)}</span>
              </div>
              <div className="metric-box">
                <span className="box-lbl">MODEL R² SCORE</span>
                <span className="box-val">
                  {prediction.metrics?.r2 ? prediction.metrics.r2.toFixed(4) : 'N/A'}
                </span>
              </div>
              <div className="metric-box">
                <span className="box-lbl">MEAN ABSOLUTE ERROR</span>
                <span className="box-val">${prediction.metrics?.mae?.toFixed(2)}</span>
              </div>
              <div className="metric-box">
                <span className="box-lbl">RMSE METRIC</span>
                <span className="box-val">${prediction.metrics?.rmse?.toFixed(2)}</span>
              </div>
            </div>

            {/* Platform training details */}
            <div className="dataset-details-footer">
              <div className="dataset-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <div className="dataset-text">
                Model constructed on <strong>{prediction.model_trained_on_rows}</strong> records. 
                Validation tested on <strong>{prediction.test_rows}</strong> intervals. 
                Naive baseline error offset is <strong>${prediction.metrics?.naive_mae?.toFixed(2)}</strong>.
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AssetDetail;
