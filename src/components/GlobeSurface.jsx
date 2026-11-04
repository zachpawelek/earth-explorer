
import { useEffect, useState } from "react";
import { loadLandTexture } from "../utils/landTextureCache.js";

export default function GlobeSurface({ globeRef, landUrl }) {
  // The most recently prepared texture.
  const [displayed, setDisplayed] = useState(null);

  useEffect(() => {
    let active = true;

    async function updateLandTexture() {
      try {
        // Retrieve a cached texture or generate it.
        const texture = await loadLandTexture(landUrl);

        // Prevent outdated requests from changing the globe.
        if (!active) return;

        console.log(
          "[GlobeSurface] Displaying:",
          landUrl,
          "Texture valid:",
          texture?.isTexture
        );

        setDisplayed({
          url: landUrl,
          texture,
        });

      } catch (error) {
        if (active) {
          console.error(
            "Failed to prepare land texture:",
            error
          );
        }
      }
    }

    updateLandTexture();

    return () => {
      active = false;
    };
  }, [landUrl]);

  return (
    <mesh
      ref={globeRef}
      rotation={[0, -Math.PI / 2, 0]}
    >
      <sphereGeometry args={[1, 64, 48]} />

      {displayed ? (
        <meshStandardMaterial
          key="land"
          map={displayed.texture}
          color="#ffffff"
        />
      ) : (
        <meshStandardMaterial
          key="ocean"
          color="#287e9b"
        />
      )}
    </mesh>
  );
}
