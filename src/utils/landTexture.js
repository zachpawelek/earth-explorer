
import { CanvasTexture, SRGBColorSpace } from "three";

// Dimensions of our geographic texture.
const WIDTH = 1024;
const HEIGHT = 512;

// Convert longitude/latitude into a pixel location.
function geographicToPixel(latitude, longitude) {
  const x = ((longitude + 180) / 360) * WIDTH;
  const y = ((90 - latitude) / 180) * HEIGHT;

  return [x, y];
}

// Draw a single geographic polygon ring.
function drawRing(ctx, ring) {
  ring.forEach(([longitude, latitude], index) => {
    const [x, y] = geographicToPixel(
      latitude,
      longitude
    );

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.closePath();
}

// Draw land polygons from GeoJSON.
function drawLand(ctx, data) {
  ctx.fillStyle = "#49bf75";

  for (const feature of data.features) {
    const geometry = feature.geometry;

    if (!geometry) continue;

    let polygons = [];

    if (geometry.type === "Polygon") {
      polygons = [geometry.coordinates];
    } else if (geometry.type === "MultiPolygon") {
      polygons = geometry.coordinates;
    }

    for (const rings of polygons) {
      ctx.beginPath();

      for (const ring of rings) {
        drawRing(ctx, ring);
      }

      // Preserve holes inside geographic polygons.
      ctx.fill("evenodd");
    }
  }
}

// Convert GeoJSON into a finished Three.js texture.
//
// Exporting this function allows our caching utility
// to generate textures without depending on React.
export function createLandTexture(data) {
  const canvas = document.createElement("canvas");

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create a 2D canvas context.");
  }

  // Fill the image with ocean color.
  ctx.fillStyle = "#287e9b";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw green land over the ocean.
  drawLand(ctx, data);

  // Convert the completed image into a Three.js texture.
  const texture = new CanvasTexture(canvas);

  texture.colorSpace = SRGBColorSpace;

  return texture;
}
