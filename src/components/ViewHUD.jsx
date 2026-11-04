
function formatCoordinate(value, positive, negative) {
    const direction = value >= 0 ? positive : negative;
  
    return `${Math.abs(value).toFixed(2)}° ${direction}`;
  }
  
  export default function ViewHUD({ view }) {
    return (
      <aside className="view-hud">
        <div className="view-hud-title">VIEW CENTER</div>
  
        <div className="view-hud-coordinates">
          {formatCoordinate(view.latitude, "N", "S")}
          {" · "}
          {formatCoordinate(view.longitude, "E", "W")}
        </div>
  
        <div className="view-hud-zoom">
          <span>Zoom within current range</span>
          <strong>{Math.round(view.zoomPercent)}%</strong>
        </div>
  
        <div className="view-hud-track">
          <div
            className="view-hud-fill"
            style={{ width: `${view.zoomPercent}%` }}
          />
        </div>
      </aside>
    );
  }
  