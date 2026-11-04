import { useEffect, useState } from "react";
import { DoubleSide, ShapeUtils, Vector2, Vector3 } from "three";
import { latLonToCartesian } from "../utils/coordinates.js";

/*


goes through all the polygons and picks one that is:
    - simple
    - visible
    - not near the poles
    - and large enough to notice
We are doing this because:
    - the first polygon in the file is near Antarctica
    - tiny islands are hard to find
    - we want an easy first success

*/


// Place the filled polygon slightly above the globe surface.
const RADIUS = 1.02;

  /* Why 2 divisions? to reduce complexity When comparing subdivisons to new triangles (per original)
    Ex. 0 -> 1
        1 -> 4
        2 -> 16
        3 -> 64
  */
const SUBDIVISION_LEVELS = 2;

// Approximate planar area using the shoelace formula.
// This helps us choose a reasonably large polygon for testing.


/*

  Example to help understand the shoelace formula: 
    used to find the area of a polygon given the coordinates of its verticies. 

    Ex. a Triangle with the verticies [(2,4), (3, -8), (1,2)]

      1. Stack the coordinates and repeat the first one (to 'close' the loop)
        2 4
        3 -8
        1 2
        2 4

      2. Downward Diagonals: 2*-8=-16, 3*2=6, 1*4=4     -> Sum = -6
      3. Upward Diagonals: 4*3=12, -8*1=-8, 2*2=4       -> Sum = 8

      Area = 1/2 * | (-6)-8 | = 14/2 = 7






*/


// Calculate the midpoint between two 3D positions.
// Normalize the result so it lies on the sphere's surface.
function midpointOnSphere(a, b) {
  return a
    .clone()
    .add(b)
    .normalize()
    .multiplyScalar(RADIUS);
}


// Recursively divide one triangle into smaller triangles.
function addSubdividedTriangle(a, b, c, levels, vertices) {

  // Base case: stop subdividing and store the triangle.
  if (levels === 0) {
    vertices.push(
      a.x, a.y, a.z,
      b.x, b.y, b.z,
      c.x, c.y, c.z
    );

    return;
  }

  // Calculate the midpoint of each triangle edge.
  const ab = midpointOnSphere(a, b);
  const bc = midpointOnSphere(b, c);
  const ca = midpointOnSphere(c, a);

  // Divide the original triangle into four smaller triangles.
  addSubdividedTriangle(a, ab, ca, levels - 1, vertices);
  addSubdividedTriangle(ab, b, bc, levels - 1, vertices);
  addSubdividedTriangle(ca, bc, c, levels - 1, vertices);
  addSubdividedTriangle(ab, bc, ca, levels - 1, vertices);
}

function ringArea(ring) {
  let area = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];

    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

// Compute a simple average center for the ring.
// We use this to avoid choosing Antarctica or a tiny distant island.
function ringCentroid(ring) {
  const uniquePoints = ring.slice(0, -1);

  let lonSum = 0;
  let latSum = 0;

  for (const [longitude, latitude] of uniquePoints) {
    lonSum += longitude;
    latSum += latitude;
  }

  return [
    lonSum / uniquePoints.length,
    latSum / uniquePoints.length,
  ];
}

// Choose one polygon that is:
// - a simple Polygon
// - has one outer ring only
// - roughly near the front half of the globe
// - fairly large, so it is easy to see
function chooseTestPolygon(features) {
  let bestRing = null;
  let bestArea = -Infinity;

  for (const feature of features) {
    const geometry = feature.geometry;

    if (!geometry || geometry.type !== "Polygon") {
      continue;
    }

    // For this first experiment, only use polygons with one ring.
    if (geometry.coordinates.length !== 1) {
      continue;
    }

    const ring = geometry.coordinates[0];
    const [centroidLon, centroidLat] = ringCentroid(ring);

    // Skip polygons far toward the poles.
    if (Math.abs(centroidLat) > 60) {
      continue;
    }

    // Skip polygons that are far around the globe from the front.
    if (Math.abs(centroidLon) > 120) {
      continue;
    }

    const area = ringArea(ring);

    if (area > bestArea) {
      bestArea = area;
      bestRing = ring;
    }
  }

  return bestRing;
}

export default function ContinentFill() {
  const [positions, setPositions] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPolygon() {
      try {
        const response = await fetch(
          "/data/land.geojson",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const ring = chooseTestPolygon(data.features);

        if (!ring) {
          throw new Error("Could not find a suitable test polygon.");
        }

        // GeoJSON polygon rings repeat the first coordinate at the end.
        // For triangulation, we remove that duplicated final point.
        const uniqueRing = ring.slice(0, -1);

        // Convert the geographic ring into a flat 2D contour
        // for triangulation.
        const contour2D = uniqueRing.map(
          ([longitude, latitude]) =>
            new Vector2(longitude, latitude)
        );

        // Triangulate the polygon.
        // Each face is an array of 3 indices, like [0, 4, 7].
        const faces = ShapeUtils.triangulateShape(
          contour2D,
          []
        );

        
        const vertices = [];

        // Process every triangle produced by ShapeUtils.triangulateShape().
        for (const [a, b, c] of faces) {

          // Convert the three geographic vertices into 3D Vector3 objects.
          const trianglePoints = [a, b, c].map((index) => {
          const [longitude, latitude] = uniqueRing[index];

          return new Vector3(
          ...latLonToCartesian(latitude, longitude, RADIUS)
      );
  });

  // Subdivide the triangle and project the new vertices
  // onto the surface of our sphere.
  addSubdividedTriangle(
    ...trianglePoints,
    SUBDIVISION_LEVELS,
    vertices
  );
}


        const result = new Float32Array(vertices);

        console.log("Triangle count:", result.length / 9);

        setPositions(result);

      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to load land polygon:", error);
        }
      }
    }

    loadPolygon();

    return () => controller.abort();
  }, []);

  if (positions === null) {
    return null;
  }

  return (
    <mesh renderOrder={5}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      <meshBasicMaterial
        color="#49bf75"
        side={DoubleSide}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}