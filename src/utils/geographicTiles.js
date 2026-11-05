// A temporary 30° latitude/longitude grid.
export const TILE_SIZE_DEGREES = 30;
export const TILE_ROWS = 180 / TILE_SIZE_DEGREES;
export const TILE_COLUMNS = 360 / TILE_SIZE_DEGREES;

export function selectGeographicTiles(coverage) {
  if (!coverage) return [];

  const selected = [];

  for (let row = 0; row < TILE_ROWS; row++) {
    const south = -90 + row * TILE_SIZE_DEGREES;
    const north = south + TILE_SIZE_DEGREES;

    if (north < coverage.south || south > coverage.north) continue;

    for (let col = 0; col < TILE_COLUMNS; col++) {
      const west = -180 + col * TILE_SIZE_DEGREES;
      const east = west + TILE_SIZE_DEGREES;

      const intersectsLongitude = coverage.longitudeRanges.some(
        (range) => east >= range.west && west <= range.east
      );

      if (intersectsLongitude) {
        selected.push({
          id: `r${row}-c${col}`,
          row,
          col,
          south,
          north,
          west,
          east,
        });
      }
    }
  }

  return selected;
}