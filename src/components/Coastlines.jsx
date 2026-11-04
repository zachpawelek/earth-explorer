
import { useEffect, useState } from "react";
import { buildCoastlinePositions } from "../utils/coastlineGeometry.js";

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

        // 3. Convert geographic data into 3D vertex positions.
        // Our utility handles all the mathematical calculations.
        const result = buildCoastlinePositions(data);

        // Each line segment contains two 3D positions.
        // Each position contains X, Y, and Z values.
        console.log("Coastline segments:", result.length / 6);

        // 4. Update React state with the finished geometry.
        setPositions(result);

      } catch (error) {
        // Ignore intentional request cancellations.
        // Log unexpected loading or processing errors.
        if (error.name !== "AbortError") {
          console.error("Failed to load coastlines:", error);
        }
      }
    }

    // Start loading the geographic data.
    loadCoastlines();

    // Cleanup: cancel any pending request.
    return () => controller.abort();
  }, []);

  // Don't render geometry until the data is available.
  if (positions === null) {
    return null;
  }

  // Render all coastlines using one Three.js LineSegments object.
  return (
    <lineSegments>
      <bufferGeometry>
        {/* Each vertex contains three numbers: X, Y, and Z. */}
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
