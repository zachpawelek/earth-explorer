





// These must match the distance limits on OrbitControls.
export const MIN_CAMERA_DISTANCE = 1.018;
export const MAX_CAMERA_DISTANCE = 6;

// Read geographic direction and zoom from the camera position.
export function getViewMetrics(cameraPosition) {
  const { x, y, z } = cameraPosition;

  // Distance between the camera and Earth's center.
  const distance = Math.hypot(x, y, z);

  // Convert the viewing direction back into latitude/longitude.
  const latitude =
    Math.asin(y / distance) * (180 / Math.PI);

  const longitude =
    Math.atan2(x, z) * (180 / Math.PI);

  // 0% means fully zoomed out.
  // 100% means fully zoomed in.
  const rawZoom =
    ((MAX_CAMERA_DISTANCE - distance) /
      (MAX_CAMERA_DISTANCE - MIN_CAMERA_DISTANCE)) * 100;

  const zoomPercent = Math.max(
    0,
    Math.min(100, rawZoom)
  );

  return { latitude, longitude, distance, zoomPercent };
}
