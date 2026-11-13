import { getPlaceVisuals } from "./placeProminence.js";

// Both the dot and the name live in one HTML element. This planner returns
// only complete, non-overlapping pairs; a rejected label has no marker.
export function getPairLimit(scale, distance) {
  if (scale === "Global") return 22;
  if (scale === "Regional") return 42;
  return distance < 1.09 ? 85 : distance < 1.25 ? 68 : 52;
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left &&
    a.top < b.bottom && a.bottom > b.top;
}

export function layoutPlacePairs({
  featured = null,
  majorCities = [],
  towns = [],
  project,
  width,
  height,
  scale,
  distance,
  limit = getPairLimit(scale, distance),
}) {
  if (typeof project !== "function" || width <= 0 || height <= 0) return [];

  const selected = [];
  const occupied = [];
  const seen = new Set();
  const candidates = [featured, ...majorCities, ...(scale === "Global" ? [] : towns)];

  for (const place of candidates) {
    if (selected.length >= limit) break;
    if (!place || typeof place.name !== "string" || !place.name.trim()) continue;
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) continue;

    const identity = place.geonameId
      ? `geonames-${place.geonameId}`
      : String(place.id);
    if (seen.has(identity)) continue;
    seen.add(identity);

    const point = project(place);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;

    const visuals = getPlaceVisuals(place, distance);
    // Reserve the full dot + gap + variable-size name when testing overlaps.
    // If the pair doesn't fit, neither its dot nor its name is rendered.
    const nameWidth = Math.max(24, place.name.length * visuals.fontSize * 0.7);
    const halfHeight = Math.max(visuals.fontSize * 1.1, visuals.dotSize) / 2 + 5;
    const bounds = {
      left: point.x - visuals.dotSize / 2 - 6,
      right: point.x + visuals.dotSize / 2 + 5 + nameWidth + 7,
      top: point.y - halfHeight,
      bottom: point.y + halfHeight,
    };

    if (bounds.left < 6 || bounds.right > width - 6 ||
        bounds.top < 6 || bounds.bottom > height - 6 ||
        occupied.some((other) => intersects(bounds, other))) continue;

    occupied.push(bounds);
    selected.push({ ...place, ...visuals });
  }

  return selected;
}

export function samePlacePairs(before, after) {
  return before.length === after.length && before.every((entry, index) =>
    entry.id === after[index].id &&
    entry.fontSize === after[index].fontSize &&
    entry.dotSize === after[index].dotSize &&
    entry.fontWeight === after[index].fontWeight &&
    entry.tone === after[index].tone &&
    entry.name === after[index].name
  );
}
