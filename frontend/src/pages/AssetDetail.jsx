import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/AssetDetail.css';

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

  if (loading) return <div className="loading-container">Loading asset data...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!asset) return <div className="error-message">Asset not found</div>;

  const chartData = asset.data.slice(-252).map((item) => ({
    date: item.Date,
    close: parseFloat(item.Close?.toFixed(2)),
    open: parseFloat(item.Open?.toFixed(2)),
    high: parseFloat(item.High?.toFixed(2)),
    low: parseFloat(item.Low?.toFixed(2)),
  }));

  return (
    <div className="asset-detail">
      <header className="detail-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h1>{asset.name}</h1>
        <p className="symbol-badge">{asset.symbol}</p>
      </header>

      <div className="chart-container">
        <h2>1-Year Price History</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="#8884d8" dot={false} name="Close Price" />
            <Line type="monotone" dataKey="high" stroke="#82ca9d" dot={false} name="High" />
            <Line type="monotone" dataKey="low" stroke="#ffc658" dot={false} name="Low" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {prediction && (
        <div className="prediction-container">
          <div className="prediction-card">
            <h3>📊 Predictions & Metrics</h3>
            <div className="prediction-grid">
              <div className="metric">
                <p className="metric-label">Current Price</p>
                <p className="metric-value">${prediction.current_price?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="metric">
                <p className="metric-label">Predicted Next Close</p>
                <p className="metric-value">${prediction.predicted_next_close?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="metric">
                <p className="metric-label">Model R² Score</p>
                <p className="metric-value">{prediction.metrics?.r2?.toFixed(4) || 'N/A'}</p>
              </div>
              <div className="metric">
                <p className="metric-label">Mean Absolute Error</p>
                <p className="metric-value">${prediction.metrics?.mae?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="metric">
                <p className="metric-label">RMSE</p>
                <p className="metric-value">${prediction.metrics?.rmse?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="metric">
                <p className="metric-label">Naive Baseline MAE</p>
                <p className="metric-value">${prediction.metrics?.naive_mae?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
            <div className="model-info">
              <p>
                Model trained on <strong>{prediction.model_trained_on_rows}</strong> rows of historical data
                | Test set size: <strong>{prediction.test_rows}</strong> rows
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetDetail;
