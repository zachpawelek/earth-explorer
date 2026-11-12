import { cityLabelFontSize, localTownFontSize } from "./markerSizing.js";

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

    const fontSize = place.kind === "major"
      ? cityLabelFontSize(distance, place.prominence)
      : localTownFontSize(distance);
    // Text is to the RIGHT of the dot, both in the same clickable element.
    // Conservative widths prevent ambiguous overlaps on a crowded globe.
    const widthEstimate = Math.max(24, place.name.length * fontSize * 0.65);
    const bounds = {
      left: point.x - 10,
      right: point.x + widthEstimate + 17,
      top: point.y - fontSize * 0.75 - 7,
      bottom: point.y + fontSize * 0.75 + 7,
    };

    if (bounds.left < 6 || bounds.right > width - 6 ||
        bounds.top < 6 || bounds.bottom > height - 6 ||
        occupied.some((other) => intersects(bounds, other))) continue;

    occupied.push(bounds);
    selected.push({ ...place, fontSize: Math.round(fontSize * 2) / 2 });
  }

  return selected;
}

export function samePlacePairs(before, after) {
  return before.length === after.length && before.every((entry, index) =>
    entry.id === after[index].id &&
    entry.fontSize === after[index].fontSize &&
    entry.name === after[index].name
  );
}
