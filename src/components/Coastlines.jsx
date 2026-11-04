
import { useEffect, useState } from "react";
import { loadCoastlinePositions } from "../utils/coastlinePositionsCache.js";


/*

AS IT STANDS 11/4 : 
Dataset Land features         Coastline segments
Natural Earth 110m 127            5,670
Natural Earth 50m 1,420           58,993



*/


export default function Coastlines({ coastlineUrl }) {

  // Store the processed geometry together with the
  // URL of the dataset it belongs to.
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {

    // Prevent an outdated request from updating state
    // after the user has switched to another dataset.
    let active = true;

    async function updateCoastlines() {
      try {

        // Request the processed coastline positions.
        //
        // On a cache MISS:
        //   Load GeoJSON and calculate positions.
        //
        // On a cache HIT:
        //   Reuse the previously calculated positions.
        const positions = await loadCoastlinePositions(
          coastlineUrl
        );

        // Ignore results from an outdated effect.
        if (!active) return;

        console.log(
          "[Coastlines] Displaying:",
          coastlineUrl,
          "Segments:",
          positions.length / 6
        );

        // Store the selected dataset and its positions.
        setLoaded({
          url: coastlineUrl,
          positions,
        });

      } catch (error) {

        // Only report errors for the active request.
        if (active) {
          console.error(
            "Failed to prepare coastlines:",
            error
          );
        }
      }
    }

    updateCoastlines();

    // Cleanup runs whenever coastlineUrl changes
    // or the component unmounts.
    return () => {
      active = false;
    };

  }, [coastlineUrl]);

 // Keep the previously prepared coastlines visible
// while the next dataset is loading.
    if (!loaded) {
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
