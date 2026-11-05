
function isInsideRing(ring, longitude, latitude) {
    if (ring.length < 4) return false;
  
    // Keep longitudes continuous across the international date line.
    let previous = longitude;
  
    const points = ring.map(([rawLongitude, lat]) => {
      const unwrapped =
        rawLongitude + 360 * Math.round((previous - rawLongitude) / 360);
  
      previous = unwrapped;
      return [unwrapped, lat];
    });
  
    const x =
      longitude + 360 * Math.round((points[0][0] - longitude) / 360);
  
    let inside = false;
  
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
  
      if (
        (yi > latitude) !== (yj > latitude) &&
        x < xi + ((latitude - yi) * (xj - xi)) / (yj - yi)
      ) {
        inside = !inside;
      }
    }
  
    return inside;
  }
  
  export function findCountryName(features, longitude, latitude) {
    for (const feature of features) {
      const geometry = feature.geometry;
  
      const polygons = geometry?.type === "Polygon"
        ? [geometry.coordinates]
        : geometry?.type === "MultiPolygon"
          ? geometry.coordinates
          : [];
  
      for (const rings of polygons) {
        const [outer, ...holes] = rings;
  
        if (
          outer &&
          isInsideRing(outer, longitude, latitude) &&
          !holes.some((hole) => isInsideRing(hole, longitude, latitude))
        ) {
          return feature.properties?.ADMIN ?? feature.properties?.NAME ?? null;
        }
      }
    }
  
    return null;
  }
  