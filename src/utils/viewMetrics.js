





// These must match the distance limits on OrbitControls.
export const MIN_CAMERA_DISTANCE = 1.018;
export const MAX_CAMERA_DISTANCE = 6;

// OrbitControls rotates the globe around its center rather than panning
// geographically. At town-level zoom a small angular rotation moves the
// camera across a huge real-world distance, so reduce drag sensitivity there.
export function getRotationSpeed(cameraDistance) {
  const minSpeed = 0.06;
  const maxSpeed = 0.5;
  if (!Number.isFinite(cameraDistance)) return minSpeed;

  const t = Math.max(0, Math.min(1,
    (cameraDistance - MIN_CAMERA_DISTANCE) / (3.2 - MIN_CAMERA_DISTANCE)
  ));
  return minSpeed + (maxSpeed - minSpeed) * t;
}

// Match OrbitControls' wheel dolly sensitivity to the current globe scale.
// Both zoom directions become more precise near the surface, where a small
// camera-distance change can otherwise cross many streets at once.
export function getZoomSpeed(cameraDistance) {
  const minSpeed = 0.12;
  const maxSpeed = 0.65;
  if (!Number.isFinite(cameraDistance)) return minSpeed;

  const t = Math.max(0, Math.min(1,
    (cameraDistance - MIN_CAMERA_DISTANCE) / (3.2 - MIN_CAMERA_DISTANCE)
  ));
  return minSpeed + (maxSpeed - minSpeed) * t;
}

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
