import '../styles/AssetCard.css';

function AssetCard({ asset, onClick }) {
  return (
    <div className="asset-card" onClick={onClick} style={{ borderColor: asset.color }}>
      <div className="card-header" style={{ backgroundColor: asset.color }}>
        <h2>{asset.symbol}</h2>
      </div>
      <div className="card-body">
        <p className="card-name">{asset.name}</p>
        <button className="view-button">View Details</button>
      </div>
    </div>
  );
}

export default AssetCard;
