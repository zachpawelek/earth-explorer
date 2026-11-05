
// Radius of the sphere in our Three.js scene.
const GLOBE_RADIUS = 1;

// Earth's approximate mean radius in kilometers.
// Used to translate spherical angles into real distances.
const EARTH_RADIUS_KM = 6371;

const RADIANS_TO_DEGREES = 180 / Math.PI;

/*
 * Calculate the geographic horizon for a camera
 * looking toward the center of a spherical Earth.
 *
 * cameraDistance is measured from Earth's center,
 * in the same units as our Three.js globe.
 */
export function getHorizonMetrics(cameraDistance) {

  // The camera must be outside our globe.
  if (
    !Number.isFinite(cameraDistance) ||
    cameraDistance <= GLOBE_RADIUS
  ) {
    throw new RangeError(
      "Camera distance must be greater than globe radius."
    );
  }

  // Angular radius of the visible spherical cap.
  //
  // cos(theta) = globeRadius / cameraDistance
  const angleRadians = Math.acos(
    GLOBE_RADIUS / cameraDistance
  );

  // Convert to degrees for readability.
  const angleDegrees =
    angleRadians * RADIANS_TO_DEGREES;

  // Arc length along Earth's surface from the
  // camera-facing point to the geometric horizon.
  //
  // Arc length = radius * angle (in radians).
  const surfaceDistanceKm =
    EARTH_RADIUS_KM * angleRadians;

  return {
    angleDegrees,
    surfaceDistanceKm,
  };
}
