// A location is visible on a unit sphere when it is on the camera-side
// of the tangent horizon. The camera still targets the globe's center.
export function isTownFacingCamera(town, camera) {
  const distance = Math.hypot(camera.x, camera.y, camera.z);
  if (distance <= 1) return false;

  const lat = town.latitude * Math.PI / 180;
  const lon = town.longitude * Math.PI / 180;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);

  return x * camera.x + y * camera.y + z * camera.z > 1;
}
