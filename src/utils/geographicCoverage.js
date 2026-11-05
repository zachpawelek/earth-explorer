

// A conservative geographic envelope for the current perspective camera.
//
// Unlike min/max of 24 sampled boundary points, this calculation cannot
// skip an unseen extremum between samples. It may include extra geography.
//
// Assumptions: a radius-1 sphere, a centered perspective camera looking
// directly at the globe's center, and no off-axis projection/view offset.

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLongitude(longitude) {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

/**
 * Bound all visible surface points in latitude and longitude.
 *
 * `center` comes from footprint.center (a geographic ray intersection).
 * `verticalFovDegrees` should be camera.getEffectiveFOV(), so zoom is
 * reflected in the result. `aspect` comes from camera.aspect.
 *
 * Returns longitudeRanges of one or two non-wrapping [-180, 180] ranges.
 * Two ranges indicate coverage crossing the antimeridian.
 */
export function getGeographicCoverage({
  center,
  cameraDistance,
  verticalFovDegrees,
  aspect,
}) {
  // An off-globe view has no geographic coverage.
  if (center == null) return null;

  if (
    !Number.isFinite(center.latitude) ||
    Math.abs(center.latitude) > 90 ||
    !Number.isFinite(center.longitude) ||
    !Number.isFinite(cameraDistance) ||
    cameraDistance <= 1 ||
    !Number.isFinite(verticalFovDegrees) ||
    verticalFovDegrees <= 0 ||
    verticalFovDegrees >= 180 ||
    !Number.isFinite(aspect) ||
    aspect <= 0
  ) {
    throw new RangeError("Invalid centered-camera coverage inputs");
  }

  const centerLatitude = center.latitude * DEG_TO_RAD;
  const centerLongitude = normalizeLongitude(center.longitude);
  const halfVerticalFov = (verticalFovDegrees * DEG_TO_RAD) / 2;

  // Any screen ray lies within a cone whose outermost ray goes through
  // a screen corner. tan(horizontal half-FOV) = aspect * tan(vertical half-FOV).
  const halfHeight = Math.tan(halfVerticalFov);
  const cornerRayAngle = Math.atan(Math.hypot(halfHeight * aspect, halfHeight));

  // Rays outside this angle miss the sphere; the tangent ray defines
  // the horizon. The smaller angle safely bounds every visible screen ray.
  const horizonRayAngle = Math.asin(1 / cameraDistance);
  const horizonLimited = cornerRayAngle >= horizonRayAngle;
  const limitRayAngle = Math.min(cornerRayAngle, horizonRayAngle);

  // Nearest ray/sphere intersection, converted to a great-circle angle
  // away from the point beneath the camera (spherical geometry).
  const angularRadius = horizonLimited
    ? Math.acos(1 / cameraDistance)
    : Math.asin(clamp(cameraDistance * Math.sin(limitRayAngle), -1, 1)) -
      limitRayAngle;

  const radiusDegrees = angularRadius * RAD_TO_DEG;
  const south = Math.max(-90, center.latitude - radiusDegrees);
  const north = Math.min(90, center.latitude + radiusDegrees);

  // A spherical cap containing either pole necessarily covers ALL
  // longitudes, even if no sampled boundary point lies at that pole.
  const allLongitudes =
    angularRadius >= Math.PI / 2 - Math.abs(centerLatitude) - 1e-12;

  if (allLongitudes) {
    return {
      south,
      north,
      longitudeRanges: [{ west: -180, east: 180 }],
      allLongitudes: true,
      crossesAntimeridian: false,
      angularRadiusDegrees: radiusDegrees,
      boundType: horizonLimited ? "Horizon" : "Camera FOV",
    };
  }

  // Maximum longitude deviation of a spherical cap that excludes poles.
  const deltaLongitude =
    Math.asin(clamp(Math.sin(angularRadius) / Math.cos(centerLatitude), -1, 1)) *
    RAD_TO_DEG;
  const west = centerLongitude - deltaLongitude;
  const east = centerLongitude + deltaLongitude;

  // Express a crossing as TWO ordinary ranges, rather than an invalid
  // interval such as 160° to -160° that could omit the Pacific seam.
  let longitudeRanges;
  if (west < -180) {
    longitudeRanges = [
      { west: -180, east },
      { west: west + 360, east: 180 },
    ];
  } else if (east > 180) {
    longitudeRanges = [
      { west: -180, east: east - 360 },
      { west, east: 180 },
    ];
  } else {
    longitudeRanges = [{ west, east }];
  }

  return {
    south,
    north,
    longitudeRanges,
    allLongitudes: false,
    crossesAntimeridian: longitudeRanges.length === 2,
    angularRadiusDegrees: radiusDegrees,
    boundType: horizonLimited ? "Horizon" : "Camera FOV",
  };
}

