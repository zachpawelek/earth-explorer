
import { useEffect, useState } from "react";

import { loadLandTexture } from "../utils/landTextureCache.js";
import { loadCoastlinePositions } from "../utils/coastlinePositionsCache.js";

/*
 * Coordinates loading both geographic layers.
 *
 * It only updates the displayed assets when BOTH
 * the land texture and coastline positions are ready.
 */
export function useGeographyLayers(source) {
  // Last complete pair of geographic assets.
  const [rendered, setRendered] = useState(null);

  // Information about the last failed request.
  const [failure, setFailure] = useState(null);

  const { landUrl, coastlineUrl, detail } = source;

  useEffect(() => {
    let active = true;

    async function prepareLayers() {
      try {
        console.log("[LOD] Preparing:", detail);

        // Start loading both assets concurrently.
        const [texture, positions] = await Promise.all([
          loadLandTexture(landUrl),
          loadCoastlinePositions(coastlineUrl),
        ]);

        // Ignore an outdated request.
        if (!active) return;

        // Both assets are ready.
        // Update them together in a single state value.
        setRendered({
          detail,
          landUrl,
          coastlineUrl,
          texture,
          positions,
        });

        setFailure(null);

        console.log(
          "[LOD] SWITCHED:",
          detail,
          "Coastline segments:",
          positions.length / 6
        );

      } catch (error) {
        if (!active) return;

        console.error(
          "[LOD] Failed to prepare layers:",
          error
        );

        setFailure({
          landUrl,
          coastlineUrl,
          message: error.message,
        });
      }
    }

    prepareLayers();

    return () => {
      // Do not cancel shared cached requests.
      // Only prevent outdated results from being displayed.
      active = false;
    };

  }, [landUrl, coastlineUrl, detail]);

  // Check whether the displayed pair matches
  // the currently requested geographic resolution.
  const isCurrent =
    rendered?.landUrl === landUrl &&
    rendered?.coastlineUrl === coastlineUrl;

  // Only display an error for the current request.
  const error =
    failure?.landUrl === landUrl &&
    failure?.coastlineUrl === coastlineUrl
      ? failure.message
      : null;

  return {
    rendered,
    isLoading: !isCurrent && !error,
    error,
  };
}
