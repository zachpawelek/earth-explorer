
import { loadGeoJSON } from "./geographyCache.js";
import { buildCoastlinePositions } from "./coastlineGeometry.js";

/*
 * Cache for processed coastline vertex positions.
 *
 * Key:   GeoJSON dataset URL
 * Value: Promise resolving to a Float32Array
 *
 * This is separate from the cache containing raw GeoJSON.
 */
const coastlinePositionsCache = new Map();

export function loadCoastlinePositions(url, radius = 1.01) {
  const key = `${url}|${radius}`;

  // STEP 1:
  // Check whether we've already requested or built
  // the coastline geometry for this dataset.
  if (coastlinePositionsCache.has(key)) {
    console.log("[Geometry cache] HIT:", url);

    return coastlinePositionsCache.get(key);
  }

  // STEP 2:
  // No cached geometry exists yet.
  console.log("[Geometry cache] MISS:", url);

  const request = loadGeoJSON(url)
    .then((data) => {

      // Generate coastline vertex positions using
      // our existing geometry utility.
      const positions = buildCoastlinePositions(data, radius);

      console.log(
        "[Geometry cache] BUILT:",
        url,
        "Segments:",
        positions.length / 6
      );

      // Return the calculated positions.
      return positions;
    })
    .catch((error) => {

      // If processing fails, remove the failed entry
      // so a subsequent request can try again.
      coastlinePositionsCache.delete(key);

      throw error;
    });

  // STEP 3:
  // Store the Promise immediately.
  // Multiple callers can share the same calculation.
  coastlinePositionsCache.set(key, request);

  return request;
}
