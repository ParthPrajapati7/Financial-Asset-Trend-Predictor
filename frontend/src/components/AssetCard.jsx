import '../styles/AssetCard.css';

function AssetCard({ asset, prediction, onClick }) {
  const brandColor = asset.color || '#3b82f6';
  
  const currentPrice = prediction?.current_price;
  const predictedClose = prediction?.predicted_next_close;
  
  let isBullish = false;
  let percentChange = 0;
  
  if (currentPrice && predictedClose) {
    isBullish = predictedClose > currentPrice;
    percentChange = ((predictedClose - currentPrice) / currentPrice) * 100;
  }
  
  const formattedPercent = percentChange !== 0 
    ? `${isBullish ? '+' : ''}${percentChange.toFixed(2)}%`
    : '0.00%';

  return (
    <div 
      className="asset-card" 
      onClick={onClick} 
      style={{ '--brand-color': brandColor }}
    >
      <div className="card-top">
        <div className="asset-info">
          <span className="asset-symbol">{asset.symbol}</span>
          <span className="asset-name">{asset.name}</span>
        </div>
        <div className={`trend-badge ${isBullish ? 'bullish' : 'bearish'}`}>
          {isBullish ? (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className="badge-arrow"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              <span>BULLISH</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className="badge-arrow"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
              <span>BEARISH</span>
            </>
          )}
        </div>
      </div>

      <div className="card-middle">
        <div className="price-item">
          <span className="price-label">CURRENT</span>
          <span className="price-val">
            {currentPrice ? `$${currentPrice.toFixed(2)}` : '--'}
          </span>
        </div>
        
        <div className="price-divider">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="arrow-divider"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>

        <div className="price-item">
          <span className="price-label">PREDICTED NEXT CLOSE</span>
          <span className="price-val predicted-val">
            {predictedClose ? `$${predictedClose.toFixed(2)}` : '--'}
          </span>
        </div>
      </div>

      <div className="card-metrics">
        <div className="card-metric-pill">
          <span className="metric-tag">ACCURACY</span>
          <span className="metric-num">
            {prediction?.metrics?.r2 ? `${(prediction.metrics.r2 * 100).toFixed(1)}%` : '--'}
          </span>
        </div>
        <div className={`card-metric-pill ${isBullish ? 'txt-bullish' : 'txt-bearish'}`}>
          <span className="metric-tag">EXPECTED</span>
          <span className="metric-num">{formattedPercent}</span>
        </div>
      </div>

      <div className="card-action">
        <span className="action-text">Analyze Model Details</span>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="action-arrow"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </div>
    </div>
  );
}

export default AssetCard;
