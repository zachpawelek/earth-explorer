
import { getViewScale } from "../utils/viewScale.js";
import { getHorizonMetrics } from "../utils/horizonGeometry.js";
import { TILE_ROWS, TILE_COLUMNS } from "../utils/geographicTiles.js";

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
    const coverage = view.geographicCoverage;
    const selectedTileIds = new Set(
        view.selectedTiles?.map((tile) => tile.id) ?? []
      );

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


    {/* SAFE coverage bounds, ready for later geographic tile selection. */}
    <div className="view-hud-title">GEOGRAPHIC COVERAGE</div>

    <div className="view-hud-title">
        TILE SELECTION PREVIEW
    </div>

    <div className="view-hud-scale">
        <span>Candidate 30° tiles</span>
        <strong>
            {view.selectedTiles?.length ?? "—"} / {TILE_ROWS * TILE_COLUMNS}
        </strong>
    </div>

    <div className="tile-preview-grid" aria-label="Selected geographic tiles">
        {Array.from({ length: TILE_ROWS * TILE_COLUMNS }, (_, index) => {
            const row = TILE_ROWS - 1 - Math.floor(index / TILE_COLUMNS);
            const col = index % TILE_COLUMNS;
            const id = `r${row}-c${col}`;

    return (
      <span
        key={id}
        className={`tile-preview-cell${selectedTileIds.has(id) ? " tile-preview-cell--selected" : ""}`}
        title={id}
      />
    );
  })}
</div>

        <div className="view-hud-note">
        Green cells are candidates, not downloaded map tiles.
        </div>

    <div className="view-hud-scale">
    <span>Bound source</span>
    <strong>{coverage?.boundType ?? "—"}</strong>
    </div>

    <div className="view-hud-scale">
        <span>Latitude</span>
        <strong>
            {coverage
            ? `${coverage.south.toFixed(1)}° to ${coverage.north.toFixed(1)}°`
            : "—"}
        </strong>
    </div>

    <div className="view-hud-scale">
        <span>Longitude</span>
        <strong>
            {!coverage
                ? "—"
                : coverage.allLongitudes
                ? "All longitudes"
                : coverage.crossesAntimeridian
                ? "Split at ±180°"
                : `${coverage.longitudeRanges[0].west.toFixed(1)}° to ${coverage.longitudeRanges[0].east.toFixed(1)}°`}
        </strong>
    </div>

    {coverage?.crossesAntimeridian && (
        <div className="view-hud-note">
    
    {coverage.longitudeRanges.map((range) =>
      `${range.west.toFixed(1)}° to ${range.east.toFixed(1)}°`
        ).join("  |  ")}
    </div>
    )}

    <div className="view-hud-note">
    Conservative bounds: may include off-screen geography.
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
