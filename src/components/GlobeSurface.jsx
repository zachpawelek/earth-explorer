
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

export default function GlobeSurface({ globeRef, landUrl }) {
    // Store the texture together with the dataset URL
    // that was used to create it.
    const [loaded, setLoaded] = useState(null);
  
    useEffect(() => {
      const controller = new AbortController();
      let createdTexture = null;
  
      async function loadLand() {
        try {
          // 1. Request the dataset selected by App.jsx.
          const response = await fetch(
            landUrl,
            { signal: controller.signal }
          );
  
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
  
          // 2. Parse the geographic data.
          const data = await response.json();
  
          if (controller.signal.aborted) return;
  
          // 3. Convert the selected dataset into a texture.
          const result = createLandTexture(data);
          createdTexture = result;
  
          console.log("Loaded land dataset:", landUrl);
          console.log("Land features:", data.features.length);
  
          // 4. Store the finished texture and its source.
          setLoaded({
            url: landUrl,
            texture: result,
          });
  
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Failed to load land:", error);
          }
        }
      }
  
      loadLand();
  
      // Cancel outdated requests and release the
      // previous texture when the source changes.
      return () => {
        controller.abort();
        createdTexture?.dispose();
      };
    }, [landUrl]);
  
    // Only display the texture if it belongs to
    // the dataset currently selected by the camera.
    const activeTexture =
      loaded?.url === landUrl ? loaded.texture : null;
  
    return (
      <mesh
        ref={globeRef}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <sphereGeometry args={[1, 64, 48]} />
  
        {activeTexture ? (
          <meshStandardMaterial
            key="land"
            map={activeTexture}
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
  