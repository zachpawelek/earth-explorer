
import { useEffect, useState } from "react";
import { Vector3 } from "three";
import { latLonToCartesian } from "../utils/coordinates.js";

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
    // Math.ceil() rounds up, while Math.max() ensures
    // that we always generate at least one segment.
    const subdivisions = Math.max(
      1,
      Math.ceil(angle / MAX_SEGMENT_ANGLE)
    );

    // Break the original segment into smaller segments.
    for (let j = 0; j < subdivisions; j++) {
      // Interpolation factors range from 0 to 1.
      // Each iteration generates two neighboring points.
      const t1 = j / subdivisions;
      const t2 = (j + 1) / subdivisions;

      // Calculate the first endpoint of this smaller segment.
      // clone() avoids modifying the original start vector.
      // lerp() interpolates between start and end.
      // normalize() projects the result onto the unit sphere.
      // multiplyScalar() places it slightly above the surface.
      const point1 = start
        .clone()
        .lerp(end, t1)
        .normalize()
        .multiplyScalar(RADIUS);

      // Calculate the second endpoint using the same process.
      const point2 = start
        .clone()
        .lerp(end, t2)
        .normalize()
        .multiplyScalar(RADIUS);

      // Store the two endpoints as six numeric values.
      // Each pair forms one independent Three.js line segment.
      vertices.push(
        point1.x, point1.y, point1.z,
        point2.x, point2.y, point2.z
      );
    }
  }
}

export default function Coastlines() {
  // Store the calculated vertex positions in React state.
  // Initially null because the geographic data hasn't loaded yet.
  const [positions, setPositions] = useState(null);

  useEffect(() => {
    // Allows us to cancel the request if the component unmounts.
    const controller = new AbortController();

    async function loadCoastlines() {
      try {
        // 1. Load our locally stored GeoJSON file.
        const response = await fetch(
          "/data/coastlines.geojson",
          { signal: controller.signal }
        );

        // Throw an error if the HTTP response was unsuccessful.
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // 2. Parse the JSON response into a JavaScript object.
        const data = await response.json();

        // This array will collect all of our 3D line-segment vertices.
        const vertices = [];

        // 3. Process every geographic feature in the dataset.
        for (const feature of data.features) {
          const geometry = feature.geometry;

          // Skip features without geometry.
          if (!geometry) continue;

          let paths = [];

          // A LineString contains one sequence of coordinates.
          // Wrap it in an array so paths always contains sequences.
          if (geometry.type === "LineString") {
            paths = [geometry.coordinates];

          // A MultiLineString already contains multiple sequences.
          } else if (geometry.type === "MultiLineString") {
            paths = geometry.coordinates;
          }

          // 4. Process each distinct coastline path.
          // This prevents unrelated coastlines from being connected.
          for (const coordinates of paths) {
            addPathSegments(coordinates, vertices);
          }
        }

        // 5. Convert our JavaScript array to a typed array.
        // Float32Array stores 32-bit floating-point values,
        // which Three.js can use for its geometry buffers.
        const result = new Float32Array(vertices);

        // Each line segment uses two 3D vertices.
        // Each vertex has X, Y, and Z coordinates.
        // Therefore, each segment requires six numeric values.
        console.log("Coastline segments:", result.length / 6);

        // 6. Update React state with the finished geometry data.
        // This causes the component to render again with the lines.
        setPositions(result);

      } catch (error) {
        // Ignore intentional request cancellations.
        // Log any unexpected loading or processing errors.
        if (error.name !== "AbortError") {
          console.error("Failed to load coastlines:", error);
        }
      }
    }

    // Start loading the geographic data.
    loadCoastlines();

    // Cleanup: cancel any pending request when the effect ends.
    return () => controller.abort();
  }, []);

  // Don't render coastline geometry until the data is ready.
  if (positions === null) {
    return null;
  }

  // Render all coastlines using one Three.js LineSegments object.
  return (
    <lineSegments>
      <bufferGeometry>
        {/* Supply the calculated X, Y, Z positions to Three.js.
            The value 3 means each vertex contains three numbers. */}
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      {/* Set the color of our coastline lines. */}
      <lineBasicMaterial color="#8fe0c0" />
    </lineSegments>
  );
}
