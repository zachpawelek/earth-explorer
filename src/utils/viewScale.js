
// Camera-distance thresholds for our current globe.
// Larger distances mean the camera is farther from Earth.
const GLOBAL_DISTANCE = 4.0;
const REGIONAL_DISTANCE = 2.5;

// Determine the viewing scale based on camera distance.
export function getViewScale(distance) {

  // Far from Earth: show global-scale information.
  if (distance >= GLOBAL_DISTANCE) {
    return "Global";
  }

  // Medium distance: show regional-scale information.
  if (distance >= REGIONAL_DISTANCE) {
    return "Regional";
  }

  // Close to Earth: show local-scale information.
  return "Close-up";
}
