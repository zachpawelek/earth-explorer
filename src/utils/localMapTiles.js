// Local OSM-based raster map tiles: select only the currently viewed area.
// Cartographic imagery is provided by CARTO, not by OSM's community tile server.
export const MAX_MERCATOR_LATITUDE = 85.05112878;
export const MAX_LOCAL_TILES = 48;
const DEG = 180 / Math.PI;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function wrapLongitude(longitude) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

export function tileLongitude(x, zoom) {
  return (x / 2 ** zoom) * 360 - 180;
}

export function tileLatitude(y, zoom) {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** zoom))) * DEG;
}

export function mercatorTileX(longitude, zoom) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

export function mercatorTileY(latitude, zoom) {
  const safe = clamp(latitude, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);
  const radians = safe / DEG;
  return ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * 2 ** zoom;
}

// Match the detail level to the existing globe camera. At global distances,
// no third-party tiles are loaded at all. All thresholds can be tuned later.
export function getLocalMapZoom(distance) {
  if (!Number.isFinite(distance) || distance >= 1.20) return null;
  if (distance >= 1.13) return 5;
  if (distance >= 1.065) return 6;
  if (distance >= 1.035) return 7;
  if (distance >= 1.026) return 8;
  if (distance >= 1.022) return 9;
  return 10;
}

export function getLocalMapOpacity(distance) {
  if (!Number.isFinite(distance) || distance >= 1.20) return 0;
  // Loading completion, not distance, drives the brief smooth crossfade.
  // A settled basemap is fully opaque so the green/blue globe does not wash it out.
  return 1;
}

function tileRange(view, zoom, fov, aspect) {
  const n = 2 ** zoom;
  const altitude = Math.max(0, view.distance - 1);
  const halfAngle = Math.atan(altitude * Math.tan(fov * Math.PI / 360));
  // Conservative viewport bound, leaving a small margin around the edges.
  const halfLat = Math.max(0.06, halfAngle * DEG * 1.35);
  const halfLon = clamp(
    halfLat * Math.max(1, aspect) / Math.max(0.12, Math.cos(view.latitude / DEG)),
    0.06, 180
  );
  const north = clamp(view.latitude + halfLat, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);
  const south = clamp(view.latitude - halfLat, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);
  const minX = Math.floor(mercatorTileX(view.longitude - halfLon, zoom));
  const maxX = Math.floor(mercatorTileX(view.longitude + halfLon, zoom));
  const minY = clamp(Math.floor(mercatorTileY(north, zoom)), 0, n - 1);
  const maxY = clamp(Math.floor(mercatorTileY(south, zoom)), 0, n - 1);
  return { minX, maxX, minY, maxY, n };
}

export function selectLocalMapTiles(view, { fov = 75, aspect = 1.5, maxTiles = MAX_LOCAL_TILES } = {}) {
  if (!view || !Number.isFinite(view.latitude) || !Number.isFinite(view.longitude)) return [];
  if (!Number.isFinite(view.distance) || Math.abs(view.latitude) >= 84) return [];
  let zoom = getLocalMapZoom(view.distance);
  if (zoom === null) return [];

  // Keep request costs predictable. A larger viewport uses coarser tiles,
  // never more requests than the per-view limit.
  // If a huge or polar viewport would require too many images, choose a lower
  // resolution level instead of requesting hundreds of tiles.
  let bounds;
  for (; zoom >= 2; zoom--) {
    bounds = tileRange(view, zoom, fov, aspect);
    const count = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
    if (count <= maxTiles) break;
  }
  if (zoom < 2) return [];

  const tiles = [];
  const { minX, maxX, minY, maxY, n } = bounds;
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const wrappedX = ((x % n) + n) % n;
      tiles.push({ zoom, x: wrappedX, y, key: `${zoom}/${wrappedX}/${y}` });
    }
  }
  return tiles;
}

// Three.js positions are x=cos(lat)sin(lon), y=sin(lat), z=cos(lat)cos(lon).
// uv is assigned in Web Mercator space so PNG roads align with the globe.
export function createLocalMapTileMeshData({ zoom, x, y }, segments = 16, radius = 1.001) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= segments; row++) {
    const v = row / segments;
    const lat = tileLatitude(y + v, zoom) / DEG;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    for (let column = 0; column <= segments; column++) {
      const u = column / segments;
      const lon = tileLongitude(x + u, zoom) / DEG;
      positions.push(radius * cosLat * Math.sin(lon), radius * sinLat,
        radius * cosLat * Math.cos(lon));
      uvs.push(u, 1 - v);
    }
  }
  for (let row = 0; row < segments; row++) {
    for (let column = 0; column < segments; column++) {
      const a = row * (segments + 1) + column;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      // Winding faces outwards (toward the camera), not into the globe.
      indices.push(a, c, b, b, c, d);
    }
  }
  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

export function localMapTileUrl(tile, apiKey) {
  const key = encodeURIComponent(apiKey);
  return `https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/${tile.zoom}/${tile.x}/${tile.y}.png?key=${key}`;
}
