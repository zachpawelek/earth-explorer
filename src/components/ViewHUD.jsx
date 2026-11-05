
import { getViewScale } from "../utils/viewScale.js";
import { getHorizonMetrics } from "../utils/horizonGeometry.js";

// Display coordinates using compass directions.
function formatCoordinate(value, positive, negative) {
  const direction = value >= 0 ? positive : negative;

  return `${Math.abs(value).toFixed(2)}° ${direction}`;
}

export default function ViewHUD({
  view,
  datasetResolution,
  isLoading,
  loadError,
}) {

  // Classify the camera's current viewing scale.
  const viewScale = getViewScale(view.distance);

  // Calculate the geometric horizon using the
  // same distance already provided by viewMetrics.js.
  const horizon = getHorizonMetrics(view.distance);
  // Geographic area found by screen-space raycasting.
    const footprint = view.footprint;

  return (
    <aside className="view-hud">

      {/* Current geographic center of the view */}
      <div className="view-hud-title">
        VIEW CENTER
      </div>

      <div className="view-hud-coordinates">
        {formatCoordinate(view.latitude, "N", "S")}
        {" · "}
        {formatCoordinate(view.longitude, "E", "W")}
      </div>

      {/* Existing viewing scale */}
      <div className="view-hud-scale">
        <span>Viewing scale</span>
        <strong>{viewScale}</strong>
      </div>

      {/* Dataset actually displayed on the globe */}
      <div className="view-hud-scale">
        <span>Geographic dataset</span>
        <strong>{datasetResolution}</strong>
      </div>

      {/* NEW: Geometric horizon measurements */}
      <div className="view-hud-scale">
        <span>Max horizon reach</span>
        <strong>
          {Math.round(
            horizon.surfaceDistanceKm
          ).toLocaleString()} km
        </strong>
      </div>

      <div className="view-hud-scale">
        <span>Horizon angle</span>
        <strong>
          {horizon.angleDegrees.toFixed(1)}°
        </strong>
      </div>

      {/* Clarify what this measurement represents. */}
      <div className="view-hud-note">
        Geometric limit, not the exact screen area.
      </div>


    {/* Geographic viewport diagnostics */}
        <div className="view-hud-title">
        SCREEN VIEWPORT
        </div>

        <div className="view-hud-scale">
         <span>Viewport framing</span>
        <strong>{footprint?.framing ?? "Calculating..."}</strong>
        </div>

        <div className="view-hud-scale">
        <span>Boundary samples</span>
        <strong>{footprint?.boundary.length ?? "—"}</strong>
        </div>

        <div className="view-hud-scale">
        <span>Screen center</span>
            <strong>
                {footprint?.center
                ? `${footprint.center.latitude.toFixed(2)}°, ${footprint.center.longitude.toFixed(2)}°`
                    : "—"}
                </strong>
    </div>


      {/* Loading state from our LOD controller */}
      {isLoading && (
        <div className="view-hud-status" role="status">
          Preparing map detail...
        </div>
      )}

      {/* Display errors without hiding existing geography */}
      {loadError && (
        <div
          className="view-hud-status view-hud-error"
          role="alert"
        >
          Could not load the requested map detail.
        </div>
      )}

      {/* Existing zoom percentage */}
      <div className="view-hud-zoom">
        <span>Zoom within current range</span>
        <strong>
          {Math.round(view.zoomPercent)}%
        </strong>
      </div>

      {/* Existing zoom progress bar */}
      <div className="view-hud-track">
        <div
          className="view-hud-fill"
          style={{ width: `${view.zoomPercent}%` }}
        />
      </div>

    </aside>
  );
}
