// Interactive targets are substantially larger than the visible dot.
// This is a *radius*, so the clickable area spans about 18 screen pixels.
export const MARKER_HIT_RADIUS_PX = 9;

export function markerHitScale(visibleRadiusPixels) {
  if (!Number.isFinite(visibleRadiusPixels) || visibleRadiusPixels <= 0) {
    return 1;
  }
  return Math.max(1, MARKER_HIT_RADIUS_PX / visibleRadiusPixels);
}

// Unlike visible markers, selection targets should NOT use the small
// world-radius cap in markerRadiusForPixels: that cap would make them tiny
// on screen at regional zoom. Depth is the camera-to-marker distance.
export function hitTargetRadiusForPixels(
  depth,
  viewportHeight,
  fovDegrees,
  pixels = MARKER_HIT_RADIUS_PX,
) {
  if (![depth, viewportHeight, fovDegrees, pixels].every(Number.isFinite) ||
      depth <= 0 || viewportHeight <= 0 || fovDegrees <= 0 ||
      fovDegrees >= 180 || pixels <= 0) {
    return 0.0001;
  }

  const halfFov = (fovDegrees * Math.PI / 180) / 2;
  return Math.max(0.00001, Math.min(0.15,
    pixels * 2 * depth * Math.tan(halfFov) / viewportHeight
  ));
}

// Keep marker radii approximately constant in screen pixels as the camera
// approaches the unit-radius globe. Unlike fixed-world-size meshes, these
// won't turn into huge circles at town-level zoom.
export function markerRadiusForPixels(
  cameraDistance,
  viewportHeight,
  fovDegrees,
  pixels,
) {
  if (![cameraDistance, viewportHeight, fovDegrees, pixels].every(Number.isFinite) ||
      viewportHeight <= 0 || fovDegrees <= 0 || fovDegrees >= 180 || pixels <= 0) {
    return 0.0001;
  }

  // Markers are positioned at globe radius 1.005.
  const depth = Math.max(0.004, cameraDistance - 1.005);
  const halfFov = (fovDegrees * Math.PI / 180) / 2;
  const radius = pixels * 2 * depth * Math.tan(halfFov) / viewportHeight;
  return Math.max(0.000015, Math.min(0.012, radius));
}

export function cityLabelFontSize(cameraDistance, prominence) {
  const altitude = Math.max(0.018, cameraDistance - 1);
  const zoom = Math.max(0, Math.min(1, Math.log(3 / altitude) / Math.log(3 / 0.018)));
  const [small, large] = prominence === "major" ? [7, 13] :
    prominence === "medium" ? [6.5, 11.5] : [6, 10.5];
  return small + (large - small) * zoom;
}

export function localTownFontSize(cameraDistance) {
  const altitude = cameraDistance - 1;
  const zoom = Math.max(0, Math.min(1, (0.26 - altitude) / 0.242));
  return 8 + 4 * zoom;
}
