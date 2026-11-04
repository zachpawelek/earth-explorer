
/*
 * Stores previously requested GeoJSON datasets.
 *
 * Key:   Dataset URL
 * Value: Promise resolving to the parsed GeoJSON
 */



/*

    new Map() creates a collection where each URL can be associated with a previously requested dataset.

*/




const geojsonCache = new Map();

// Retrieve GeoJSON from the cache or load it if necessary.
export function loadGeoJSON(url) {

  // 1. Check whether this dataset has already been requested.
  if (geojsonCache.has(url)) {
    console.log("[GeoJSON cache] HIT:", url);

    return geojsonCache.get(url);
  }

  // 2. If the dataset isn't cached, fetch it.
  console.log("[GeoJSON cache] MISS:", url);

  const request = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
      }

      return response.json();
    })
    .catch((error) => {
      // Remove failed requests so they can be retried.
      geojsonCache.delete(url);

      throw error;
    });

  // 3. Store the pending Promise immediately.
  geojsonCache.set(url, request);

  // 4. Return the Promise to the caller.
  return request;
}
