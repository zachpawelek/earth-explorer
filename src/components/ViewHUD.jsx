
import { getViewScale } from "../utils/viewScale.js";

// Format geographic coordinates with their compass direction.
function formatCoordinate(value, positive, negative) {
  const direction = value >= 0 ? positive : negative;

  return `${Math.abs(value).toFixed(2)}° ${direction}`;
}

export default function ViewHUD({ view }) {

  // Determine the current viewing scale.
  // This is calculated from the camera distance
  // already provided by our viewMetrics utility.
  const viewScale = getViewScale(view.distance);

  return (
    <aside className="view-hud">

      {/* Geographic location at the center of the view */}
      <div className="view-hud-title">
        VIEW CENTER
      </div>

      <div className="view-hud-coordinates">
        {formatCoordinate(view.latitude, "N", "S")}
        {" · "}
        {formatCoordinate(view.longitude, "E", "W")}
      </div>

      {/* Current viewing scale */}
      <div className="view-hud-scale">
        <span>Viewing scale</span>
        <strong>{viewScale}</strong>
      </div>

      {/* Zoom percentage */}
      <div className="view-hud-zoom">
        <span>Zoom within current range</span>
        <strong>{Math.round(view.zoomPercent)}%</strong>
      </div>

      {/* Visual zoom indicator */}
      <div className="view-hud-track">
        <div
          className="view-hud-fill"
          style={{ width: `${view.zoomPercent}%` }}
        />
      </div>

    </aside>
  );
}
