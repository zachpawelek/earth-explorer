
import { Vector3 } from "three";
import { latLonToCartesian } from "./coordinates.js";

// Place coastline vertices slightly above the globe's surface.
// Our globe has a radius of 1.
const RADIUS = 1.01;

// Maximum angular separation between generated line vertices.
// Math.PI / 180 represents 1 degree in radians.
const MAX_SEGMENT_ANGLE = Math.PI / 180;

// Convert one geographic path into connected 3D line segments.
function addPathSegments(coordinates, vertices) {
  // Process each consecutive pair of geographic coordinates.
  for (let i = 0; i < coordinates.length - 1; i++) {
    // GeoJSON stores coordinate pairs as [longitude, latitude].
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];

    // Convert the endpoints into 3D unit vectors.
    // Our conversion function defaults to a radius of 1.
    const start = new Vector3(
      ...latLonToCartesian(lat1, lon1)
    );

    const end = new Vector3(
      ...latLonToCartesian(lat2, lon2)
    );

    // Calculate the angular distance between the two points.
    // angleTo() returns the angle in radians.
    const angle = start.angleTo(end);

    // Determine how many subdivisions this segment needs.
    // Longer segments receive more subdivisions.
    const subdivisions = Math.max(
      1,
      Math.ceil(angle / MAX_SEGMENT_ANGLE)
    );

    // Break the original segment into smaller segments.
    for (let j = 0; j < subdivisions; j++) {
      const t1 = j / subdivisions;
      const t2 = (j + 1) / subdivisions;

      // Interpolate and project onto the sphere's surface.
      // clone() avoids modifying our original start vector.
      const point1 = start
        .clone()
        .lerp(end, t1)
        .normalize()
        .multiplyScalar(RADIUS);

      const point2 = start
        .clone()
        .lerp(end, t2)
        .normalize()
        .multiplyScalar(RADIUS);

      // Store both endpoints of this independent line segment.
      vertices.push(
        point1.x, point1.y, point1.z,
        point2.x, point2.y, point2.z
      );
    }
  }
}

// Convert an entire GeoJSON FeatureCollection
// into a single Float32Array of line-segment positions.
export function buildCoastlinePositions(data) {
  const vertices = [];

  // Process every geographic feature.
  for (const feature of data.features) {
    const geometry = feature.geometry;

    // Skip features that have no geometry.
    if (!geometry) continue;

    let paths = [];

    // A LineString contains one coordinate sequence.
    if (geometry.type === "LineString") {
      paths = [geometry.coordinates];

    // A MultiLineString contains multiple sequences.
    } else if (geometry.type === "MultiLineString") {
      paths = geometry.coordinates;
    }

    // Process each coastline independently.
    for (const coordinates of paths) {
      addPathSegments(coordinates, vertices);
    }
  }

  // Convert the finished coordinates into a typed array.
  return new Float32Array(vertices);
}
