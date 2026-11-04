
import { useEffect, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";


/*

TEXTURE MAPPING: 

Geographic coordinate   Image position
                                                    North 
                                                        -180    -90   0    90    180
Longitude −180°           Left edge                              |    |    |
Longitude 0°              Horizontal center             ---------x----x----x------
Longitude +180°           Right edge                             |    |    | 
Latitude +90°             Top edge
Latitude 0°               Vertical center           South
Latitude −90°             Bottom edge


*/



/*
 drawRing()
     This takes a sequence of geographic coordinates and converts them into a canvas path.  
     
  


*/



// Our texture uses a 2:1 aspect ratio.
// This corresponds to 360 degrees of longitude
// and 180 degrees of latitude.
const WIDTH = 1024;
const HEIGHT = 512;

// Convert a geographic location into a pixel
// position on our flat geographic texture.
function geographicToPixel(latitude, longitude) {
  const x = ((longitude + 180) / 360) * WIDTH;
  const y = ((90 - latitude) / 180) * HEIGHT;

  return [x, y];
}

// Draw one geographic polygon ring onto the canvas.
// A ring is an ordered sequence of longitude/latitude pairs.
function drawRing(ctx, ring) {
  ring.forEach(([longitude, latitude], index) => {
    const [x, y] = geographicToPixel(
      latitude,
      longitude
    );

    // Start the path at the first geographic coordinate.
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      // Connect subsequent points with straight lines.
      ctx.lineTo(x, y);
    }
  });

  // Close the shape by connecting its last point
  // back to its starting position.
  ctx.closePath();
}

// Draw every land polygon from our GeoJSON dataset.
function drawLand(ctx, data) {
  ctx.fillStyle = "#49bf75";

  // Process every geographic feature.
  for (const feature of data.features) {
    const geometry = feature.geometry;

    if (!geometry) continue;

    let polygons = [];

    // A Polygon contains an array of rings.
    if (geometry.type === "Polygon") {
      polygons = [geometry.coordinates];

    // A MultiPolygon contains an array of polygons.
    } else if (geometry.type === "MultiPolygon") {
      polygons = geometry.coordinates;
    }

    // Draw each polygon separately.
    for (const rings of polygons) {
      ctx.beginPath();

      // Draw the outer boundary and any inner rings.
      for (const ring of rings) {
        drawRing(ctx, ring);
      }

      // Fill the polygon, leaving inner holes unfilled.
      ctx.fill("evenodd");
    }
  }
}

// Create the completed geographic texture.
function createLandTexture(data) {
  const canvas = document.createElement("canvas");

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create a 2D canvas context.");
  }

  // First paint the entire texture blue.
  // Any area not covered by land remains ocean.
  ctx.fillStyle = "#287e9b";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw the land polygons over the ocean.
  drawLand(ctx, data);

  // Convert the completed canvas into a Three.js texture.
  const texture = new CanvasTexture(canvas);

  // Tell Three.js our texture contains sRGB colors.
  texture.colorSpace = SRGBColorSpace;

  return texture;
}

export default function GlobeSurface({ globeRef }) {
  // The texture isn't available until GeoJSON has loaded.
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let createdTexture = null;

    async function loadLand() {
      try {
        // 1. Load our locally stored land polygons.
        const response = await fetch(
          "/data/land.geojson",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // 2. Parse GeoJSON into a JavaScript object.
        const data = await response.json();

        // Ignore results from a cancelled request.
        if (controller.signal.aborted) return;

        // 3. Draw the polygons and create a texture.
        const result = createLandTexture(data);
        createdTexture = result;

        console.log("Land features:", data.features.length);

        // 4. Update React state so the globe displays it.
        setTexture(result);

      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to load land:", error);
        }
      }
    }

    loadLand();

    // Cancel pending requests and release texture resources
    // when this effect is cleaned up.
    return () => {
      controller.abort();
      createdTexture?.dispose();
    };
  }, []);

  return (
    <mesh
      ref={globeRef}
      rotation={[0, -Math.PI / 2, 0]}
    >
      {/* Our existing spherical globe geometry. */}
      <sphereGeometry args={[1, 64, 48]} />

      {/* While loading, show a plain blue globe.
          Once ready, render the geographic texture. */}
      {texture ? (
        <meshStandardMaterial
          key="land"
          map={texture}
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
