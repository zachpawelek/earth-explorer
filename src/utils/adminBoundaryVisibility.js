// Internal borders are visually secondary to international borders.
// Reveal them progressively when the view gets close enough to read them.
export const ADMIN1_START_DISTANCE = 2.45;
const FULL_OPACITY_DISTANCE = 1.20;
const MAX_OPACITY = 0.62;

export function getAdmin1Opacity(cameraDistance) {
  if (!Number.isFinite(cameraDistance) || cameraDistance >= ADMIN1_START_DISTANCE) {
    return 0;
  }
  const fraction = Math.max(0, Math.min(1,
    (ADMIN1_START_DISTANCE - cameraDistance) /
      (ADMIN1_START_DISTANCE - FULL_OPACITY_DISTANCE)
  ));
  return MAX_OPACITY * fraction;
}
