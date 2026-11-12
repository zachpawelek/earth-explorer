// A lightweight, camera-projected hit test. Place dots can stay visually tiny:
// selection uses a consistent screen-pixel radius rather than thousands of
// invisible 3D spheres that Three.js must raycast on each pointer event.
export const TOWN_PICK_RADIUS_PX = 12;
const CELL_PX = 32;

export function buildScreenPlaceIndex(places, project, cellSize = CELL_PX) {
  const cells = new Map();
  for (const place of places) {
    const point = project(place);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const col = Math.floor(point.x / cellSize);
    const row = Math.floor(point.y / cellSize);
    const key = `${col}:${row}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push({ place, x: point.x, y: point.y });
  }
  return { cells, cellSize };
}

export function pickScreenPlace(index, x, y, radius = TOWN_PICK_RADIUS_PX) {
  if (!index || !Number.isFinite(x) || !Number.isFinite(y) || radius <= 0) return null;
  const { cells, cellSize } = index;
  const r2 = radius * radius;
  let best = null;
  let bestDistance = r2;
  for (let col = Math.floor((x - radius) / cellSize); col <= Math.floor((x + radius) / cellSize); col++) {
    for (let row = Math.floor((y - radius) / cellSize); row <= Math.floor((y + radius) / cellSize); row++) {
      for (const entry of cells.get(`${col}:${row}`) ?? []) {
        const distance = (entry.x - x) ** 2 + (entry.y - y) ** 2;
        if (distance <= bestDistance) {
          bestDistance = distance;
          best = entry.place;
        }
      }
    }
  }
  return best;
}
