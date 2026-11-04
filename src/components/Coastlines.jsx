
import { useEffect, useState } from "react";
import { buildCoastlinePositions } from "../utils/coastlineGeometry.js";


export default function Coastlines({ coastlineUrl }) {
  // Store geometry and the URL used to create it.
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCoastlines() {
      try {
        // 1. Request the selected coastline dataset.
        const response = await fetch(
          coastlineUrl,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // 2. Parse the GeoJSON.
        const data = await response.json();

        if (controller.signal.aborted) return;

        // 3. Reuse our existing geometry calculation utility.
        const result = buildCoastlinePositions(data);

        if (controller.signal.aborted) return;

        console.log("Loaded coastlines:", coastlineUrl);
        console.log("Coastline segments:", result.length / 6);

        // 4. Store the geometry for rendering.
        setLoaded({
          url: coastlineUrl,
          positions: result,
        });

      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to load coastlines:", error);
        }
      }
    }

    loadCoastlines();

    // Cancel the request if the dataset changes.
    return () => controller.abort();
  }, [coastlineUrl]);

  // Do not display geometry belonging to an old dataset.
  if (loaded?.url !== coastlineUrl) {
    return null;
  }

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[loaded.positions, 3]}
        />
      </bufferGeometry>

      <lineBasicMaterial color="#8fe0c0" />
    </lineSegments>
  );
}

