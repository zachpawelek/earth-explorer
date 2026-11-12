// Compact GeoNames rows: [id, name, lat, lon, population, country, admin1, feature].
// Organize them into 8-degree geographic buckets to avoid scanning the entire
// worldwide catalog on every OrbitControls change.
const TILE = 8;
const DEG = Math.PI / 180;
const REGIONAL_LIMIT = 3000;
const CLOSE_LIMIT = 7500;

function direction(latitude, longitude) {
  const lat = latitude * DEG;
  const lon = longitude * DEG;
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
}

export function buildGeoNamesCatalog(rows) {
  const buckets = new Map();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 8) continue;
    const [id, name, latitude, longitude, population] = row;
    if (!Number.isSafeInteger(id) || id <= 0 || typeof name !== "string" ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
        !Number.isFinite(population)) continue;
    const latBucket = Math.min(22, Math.floor((latitude + 90) / TILE));
    const lonBucket = Math.min(44, Math.floor((longitude + 180) / TILE));
    const key = `${latBucket}:${lonBucket}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      const centerLat = -90 + (latBucket + 0.5) * TILE;
      const centerLon = -180 + (lonBucket + 0.5) * TILE;
      bucket = { normal: direction(centerLat, centerLon), rows: [] };
      buckets.set(key, bucket);
    }
    bucket.rows.push(row);
  }
  return { buckets: [...buckets.values()], count: rows.length };
}

// Quantize view movements so tiny pointer changes do not re-sort thousands of
// places every render. The exact camera still controls click/horizon checks.
export function geoViewKey(view) {
  // Finer angular movement and *logarithmic surface altitude* buckets at close zoom.
  // Quantizing distance from the Earth's center to 0.1 units was too coarse when
  // the camera could be only 0.018 units above the surface.
  const step = view.distance < 1.08 ? 0.08 :
    view.distance < 1.3 ? 0.2 : view.distance < 2 ? 0.75 : 2;
  const lat = Math.round(view.latitude / step) * step;
  const lon = Math.round(view.longitude / step) * step;
  const altitude = Math.max(0.018, view.distance - 1);
  const altitudeBucket = Math.round(Math.log(altitude) * 12);
  return `${lat}:${lon}:${altitudeBucket}`;
}

export function selectGeoNamesPlaces(catalog, view, viewScale) {
  if (!catalog || viewScale === "Global") return [];

  const [vx, vy, vz] = direction(view.latitude, view.longitude);
  const distance = Math.max(1.01, view.distance);
  const horizon = 1 / distance;
  const margin = Math.cos(Math.acos(horizon) + 0.16); // bucket corners
  const regional = viewScale === "Regional";
  const limit = regional ? REGIONAL_LIMIT : CLOSE_LIMIT;
  const candidates = [];

  for (const bucket of catalog.buckets) {
    const [bx, by, bz] = bucket.normal;
    if (bx * vx + by * vy + bz * vz < margin) continue;

    for (const row of bucket.rows) {
      const [id, name, latitude, longitude, population, countryCode, admin1, featureCode] = row;
      const important = featureCode?.startsWith("PPLA") || featureCode === "PPLC";
      if (regional && population < 10000 && !important) continue;

      const [x, y, z] = direction(latitude, longitude);
      const facing = x * vx + y * vy + z * vz;
      if (facing <= horizon + 0.003) continue;

      const priority = 3 * facing + Math.log10(Math.max(0, population) + 1) / 9 + (important ? 0.05 : 0);
      candidates.push({
        id: `geonames-${id}`,
        geonameId: String(id),
        name, latitude, longitude, population,
        countryCode, countryName: countryCode, admin1, featureCode,
        wikidataId: null,
        priority,
      });
    }
  }

  candidates.sort((a, b) => b.priority - a.priority || b.population - a.population || a.id.localeCompare(b.id));
  return candidates.slice(0, limit);
}

// Share one parsed GeoNames download between map markers and the search box.
// Do not cancel the shared fetch when one consumer unmounts.
let rowsPromise;
export function loadGeoNamesRows() {
  if (!rowsPromise) {
    rowsPromise = fetch("/data/geonames-cities500.json")
      .then((response) => {
        if (!response.ok) throw new Error(`GeoNames HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!Array.isArray(payload.places)) {
          throw new Error("GeoNames catalog has no places array");
        }
        return payload.places;
      })
      .catch((error) => {
        rowsPromise = undefined;
        throw error;
      });
  }
  return rowsPromise;
}
