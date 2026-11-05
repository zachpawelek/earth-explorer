
import { getViewScale } from "../utils/viewScale.js";

function formatCoordinate(value, positive, negative) {
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)}° ${direction}`;
}

export default function ViewHUD({
  view,
  datasetResolution,
  isLoading,
  loadError,
  selectedCountry,
  countryDataReady,
  countryLoadError,
  selectedCity,
}) {
  const viewScale = getViewScale(view.distance);

  let countryLabel = "Click a country";

  if (countryLoadError) {
    countryLabel = "Country data unavailable";
  } else if (!countryDataReady) {
    countryLabel = "Loading country names...";
  } else if (selectedCountry === null) {
    countryLabel = "Ocean / unmapped area";
  } else if (selectedCountry !== undefined) {
    countryLabel = selectedCountry;
  }

  return (
    <aside className="view-hud">
      <div className="view-hud-title">SELECTED CITY</div>

      <div className="view-hud-coordinates">
        {selectedCity?.name ?? "Click an orange city marker"}
      </div>
      <div className="view-hud-title">SELECTED COUNTRY</div>
      <div className="view-hud-coordinates">{countryLabel}</div>

      <div className="view-hud-title">VIEW CENTER</div>
      <div className="view-hud-coordinates">
        {formatCoordinate(view.latitude, "N", "S")}
        {" · "}
        {formatCoordinate(view.longitude, "E", "W")}
      </div>

      <div className="view-hud-scale">
        <span>Viewing scale</span>
        <strong>{viewScale}</strong>
      </div>

      <div className="view-hud-scale">
        <span>Geographic dataset</span>
        <strong>{datasetResolution}</strong>
      </div>

      {isLoading && (
        <div className="view-hud-status" role="status">
          Preparing map detail...
        </div>
      )}

      {loadError && (
        <div className="view-hud-status view-hud-error" role="alert">
          Could not load the requested map detail.
        </div>
      )}

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
