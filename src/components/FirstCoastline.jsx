
import { useEffect, useState } from "react";
import { Vector3 } from "three";
import { latLonToCartesian } from "../utils/coordinates.js";

/*

THREE JS VECTOR3 API

.lerp() -> Interpolate between two vectors
.normalize() -> Scale a vector so the length becomes 1
.multiplyScalar() -> Multiply the vector's components by a value

Example used:

    var start = new Vector3 (1, 0, 0)    ] -> Both are on the surface of the sphere with radius of 1
    var end = new Vector3 (0, 0, 1)

    var midpoint = start.clone().lerp(end, 0.5); 

        -  .clone() = This creates an exact copy of the start vector. 
                    This is done so that the original start vector isn't altered or overwritten by the next operation.
       -   .lerp() =  the 0.5 finds midpoint, halfway giving the geometric midpoint

       result = [0.5, 0, 0.5]
       distance from origin: sqrt((0.5)^2) + ((0.5)^2)) = ~0.707
       
       But the midpoint would be INSIDE the sphere
       so using .normalize() = [0.707, 0, 0.707]
       Now the distance from the center is 1

       now using midpoint.multiplyScalar(1.01) -> the point is now above the globe's surface


What each section does:
Section	           Responsibility

Imports      	   Provides React hooks, Three.js vector mathematics, and our coordinate conversion function
useState(null)	   Stores the calculated vertices once they're available
useEffect()	       Loads and processes the dataset after the component mounts
fetch()	           Retrieves our locally hosted GeoJSON file
data.features[0]   Selects the first coastline from the dataset
Outer for loop	   Processes each consecutive pair of geographic coordinates
Inner for loop	   Adds eight intermediate points per segment
lerp().normalize() Creates intermediate directions and projects them back onto the sphere
Float32Array	   Stores the 3D coordinates in a GPU-friendly format
<bufferGeometry>   Creates the geometry used by Three.js
<line>	           Draws the connected coastline segments



*/


export default function FirstCoastline() {
  const [positions, setPositions] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCoastline() {
      try {
        // 1. Load our locally stored geographic data.
        const response = await fetch(
          "/data/coastlines.geojson",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // 2. Select the first geographic feature.
        const feature = data.features[0];

        if (feature.geometry.type !== "LineString") {
          throw new Error("Expected a LineString");
        }

        // 3. Get the coordinates for this coastline.
        const coordinates = feature.geometry.coordinates;
        const vertices = [];

        const radius = 1.01;
        const subdivisions = 8;

        // 4. Process each pair of consecutive coordinates.
        for (let i = 0; i < coordinates.length - 1; i++) {
          const [lon1, lat1] = coordinates[i];
          const [lon2, lat2] = coordinates[i + 1];

          // Convert the endpoints to 3D unit vectors.
          const start = new Vector3(
            ...latLonToCartesian(lat1, lon1)
          );

          const end = new Vector3(
            ...latLonToCartesian(lat2, lon2)
          );

          // 5. Interpolate points along the sphere's surface.
          for (let j = 0; j < subdivisions; j++) {
            const t = j / subdivisions;

            const point = start
              .clone()
              .lerp(end, t)
              .normalize()
              .multiplyScalar(radius);

            vertices.push(point.x, point.y, point.z);
          }
        }

        // 6. Include the final coordinate once.
        const [lastLon, lastLat] = coordinates.at(-1);

        vertices.push(
          ...latLonToCartesian(lastLat, lastLon, radius)
        );

        // 7. Convert the result into a typed array for Three.js.
        const interpolatedPositions = new Float32Array(vertices);

        console.log("Original points:", coordinates.length);
        console.log(
          "Interpolated points:",
          interpolatedPositions.length / 3
        );

        // 8. Update state so React renders our coastline.
        setPositions(interpolatedPositions);

      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to load coastline:", error);
        }
      }
    }

    loadCoastline();

    return () => controller.abort();
  }, []);

  // Don't render the line until the data has loaded.
  if (positions === null) {
    return null;
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      <lineBasicMaterial color="#8fe0c0" />
    </line>
  );
}
