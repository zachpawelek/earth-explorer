
import { loadGeoJSON } from "./geographyCache.js";
import { createLandTexture } from "./landTexture.js";


/*

Previous Sequence: 

Global → Generate 110m texture
Regional → Generate 50m texture
Global → Generate 110m texture again
Regional → Generate 50m texture again

-------------------

Current Sequence: 

Global → Generate and cache 110m texture
Regional → Generate and cache 50m texture
Global → Reuse cached 110m texture
Regional → Reuse cached 50m texture

*/

/*
 * Cache for completed Three.js land textures.
 *
 * Key:   Dataset URL
 * Value: Promise resolving to a CanvasTexture
 *
 * Textures are retained for reuse during this page session.
 */
const landTextureCache = new Map();

export function loadLandTexture(url) {

  // STEP 1:
  // Reuse an existing texture or pending request.
  if (landTextureCache.has(url)) {
    console.log("[Texture cache] HIT:", url);

    return landTextureCache.get(url);
  }

  // STEP 2:
  // No cached texture exists yet.
  console.log("[Texture cache] MISS:", url);

  const request = loadGeoJSON(url)
    .then((data) => {

      // Generate the geographic texture.
      const texture = createLandTexture(data);

      console.log(
        "[Texture cache] BUILT:",
        url,
        "Features:",
        data.features.length
      );

      return texture;
    })
    .catch((error) => {

      // Remove failed work so a future request
      // can try again.
      landTextureCache.delete(url);

      throw error;
    });

  // STEP 3:
  // Store the Promise immediately.
  landTextureCache.set(url, request);

  return request;
}
