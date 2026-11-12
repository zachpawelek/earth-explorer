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


// The globe's visible hemisphere is much larger than the camera viewport
// at street/town zoom. Compute a conservative viewport cone so we don't
// render or raycast thousands of markers that are outside the screen.
export function visibleAngularRadius(cameraDistance, fovDegrees = 75, aspect = 1.6) {
  if (!Number.isFinite(cameraDistance) || cameraDistance <= 1) return 0;
  const horizon = Math.acos(1 / cameraDistance);
  if (!Number.isFinite(fovDegrees) || fovDegrees <= 0 || fovDegrees >= 180 ||
      !Number.isFinite(aspect) || aspect <= 0) return horizon;

  const halfVerticalFov = fovDegrees * DEG / 2;
  // A diagonal cone encloses the rectangular viewport; add 12% padding.
  const diagonalAngle = Math.atan(
    Math.tan(halfVerticalFov) * Math.hypot(1, aspect) * 1.12
  );
  const demand = cameraDistance * Math.sin(diagonalAngle);
  if (demand >= 1) return horizon;
  const angularRadius = Math.asin(demand) - diagonalAngle;
  // Allow extra room for camera-view quantization and marker hit targets.
  return Math.min(horizon, Math.max(0, angularRadius) + 0.012);
}

// Retain only the strongest N candidates as we scan. The root of this
// bounded heap is the *worst* retained place, so we avoid sorting or storing
// tens of thousands of off-priority candidates on every map movement.
function comparePlaceRank(a, b) {
  return b.priority - a.priority || b.population - a.population ||
    a.id.localeCompare(b.id);
}

function retainTopPlace(heap, candidate, limit) {
  if (heap.length < limit) {
    heap.push(candidate);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (comparePlaceRank(heap[index], heap[parent]) <= 0) break;
      [heap[index], heap[parent]] = [heap[parent], heap[index]];
      index = parent;
    }
    return;
  }
  if (comparePlaceRank(candidate, heap[0]) >= 0) return;
  heap[0] = candidate;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    let worst = index;
    if (left < heap.length && comparePlaceRank(heap[left], heap[worst]) > 0) {
      worst = left;
    }
    if (right < heap.length && comparePlaceRank(heap[right], heap[worst]) > 0) {
      worst = right;
    }
    if (worst === index) break;
    [heap[index], heap[worst]] = [heap[worst], heap[index]];
    index = worst;
  }
}

export function selectGeoNamesPlaces(catalog, view, viewScale, cameraOptions = {}) {
  if (!catalog || viewScale === "Global") return [];

  const [vx, vy, vz] = direction(view.latitude, view.longitude);
  const distance = Math.max(1.01, view.distance);
  const horizon = 1 / distance;
  const angularRadius = visibleAngularRadius(
    distance, cameraOptions.fov ?? 75, cameraOptions.aspect ?? 1.6
  );
  const visibleCosine = Math.cos(angularRadius);
  // Each 8° bucket can extend roughly 6° from its center.
  const margin = Math.cos(Math.min(Math.PI, angularRadius + 0.13));
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
      if (facing <= horizon + 0.003 || facing < visibleCosine) continue;

      const priority = 3 * facing + Math.log10(Math.max(0, population) + 1) / 9 + (important ? 0.05 : 0);
      retainTopPlace(candidates, {
        id: `geonames-${id}`,
        geonameId: String(id),
        name, latitude, longitude, population,
        countryCode, countryName: countryCode, admin1, featureCode,
        wikidataId: null,
        priority,
      }, limit);
    }
  }

  return candidates.sort(comparePlaceRank);
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
