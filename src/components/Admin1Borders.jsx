import { useEffect, useState } from "react";
import { loadCoastlinePositions } from "../utils/coastlinePositionsCache.js";
import { getAdmin1Opacity } from "../utils/adminBoundaryVisibility.js";

const BORDERS_URL = "/data/admin1-boundaries-10m.geojson";
// Globe radius = 1. International borders use 1.01; town markers
// sit near 1.005. Admin-1 boundaries stay beneath both layers.
const BORDERS_RADIUS = 1.002;

export default function Admin1Borders({ cameraDistance }) {
  const [positions, setPositions] = useState(null);
  const opacity = getAdmin1Opacity(cameraDistance);
  const visible = opacity > 0;

  useEffect(() => {
    if (!visible) return;
    let active = true;

    loadCoastlinePositions(BORDERS_URL, BORDERS_RADIUS)
      .then((result) => {
        if (active) setPositions(result);
      })
      .catch((error) => {
        if (active) console.error("Could not load state/province boundaries:", error);
      });

    return () => { active = false; };
  }, [visible]);

  if (!visible || !positions) return null;

  return (
    <lineSegments raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#a9c4d9"
        transparent
        opacity={opacity}
        depthTest
        depthWrite={false}
      />
    </lineSegments>
  );
}
