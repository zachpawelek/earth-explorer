import { visibleAngularRadius } from './geonamesCatalog.js';

const DEG = Math.PI / 180;
const manifestUrl = '/data/admin1-tiles/manifest.json';
const geometryCache = new Map();
let manifestRequest;

export function selectAdminTiles(manifest, view, fov = 75, aspect = 1.6) {
  if (!manifest?.tiles || !view || view.distance >= 2.45) return [];
  const lat = view.latitude * DEG;
  const lon = view.longitude * DEG;
  const cameraNormal = [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  const viewportAngle = visibleAngularRadius(view.distance, fov, aspect);
  // A 20° tile's corner may be ~15° beyond its center. Pad another 3°
  // for long lines assigned by segment midpoint and for camera quantization.
  const tilePadding = (Math.SQRT2 * manifest.tileDegrees / 2 + 3) * DEG;
  const minDot = Math.cos(Math.min(Math.PI, viewportAngle + tilePadding));

  return manifest.tiles.filter((tile) => {
    const tlat = tile.lat * DEG;
    const tlon = tile.lon * DEG;
    const dot = Math.cos(tlat) * Math.cos(tlon) * cameraNormal[2] +
      Math.sin(tlat) * cameraNormal[1] +
      Math.cos(tlat) * Math.sin(tlon) * cameraNormal[0];
    return dot >= minDot;
  });
}

export function loadAdminTileManifest(fetcher = fetch) {
  if (!manifestRequest) {
    manifestRequest = fetcher(manifestUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Admin-1 tile manifest HTTP ${response.status}`);
        return response.json();
      })
      .then(value => {
        if (!Array.isArray(value.tiles) || !Number.isFinite(value.tileDegrees)) {
          throw new Error('Malformed Admin-1 tile manifest');
        }
        return value;
      })
      .catch(error => { manifestRequest = undefined; throw error; });
  }
  return manifestRequest;
}

// Cache typed arrays (not WebGL resources) once per tile. Tile geometries are
// created only while visible, so GPU memory doesn't grow for every visited area.
export function loadAdminTilePositions(url, fetcher = fetch) {
  if (!geometryCache.has(url)) {
    const request = fetcher(url)
      .then(response => {
        if (!response.ok) throw new Error(`Admin-1 tile HTTP ${response.status}: ${url}`);
        return response.arrayBuffer();
      })
      .then(buffer => {
        const floats = new Float32Array(buffer);
        if (floats.length % 6 !== 0) throw new Error(`Invalid line positions: ${url}`);
        return floats;
      })
      .catch(error => { geometryCache.delete(url); throw error; });
    geometryCache.set(url, request);
  }
  return geometryCache.get(url);
}
