import assert from 'node:assert/strict';
import test from 'node:test';
import {
  tileLatitude, tileLongitude, mercatorTileX, mercatorTileY,
  getLocalMapZoom, getLocalMapOpacity, selectLocalMapTiles,
  createLocalMapTileMeshData, localMapTileUrl, MAX_LOCAL_TILES,
} from './localMapTiles.js';

const view = { latitude: 43.0731, longitude: -89.4012, distance: 1.018 };

test('global view never requests a street basemap', () => {
  assert.equal(getLocalMapZoom(3), null);
  assert.equal(getLocalMapOpacity(3), 0);
  assert.deepEqual(selectLocalMapTiles({ ...view, distance: 3 }), []);
});

test('close-up selects only a bounded number of local tiles', () => {
  const tiles = selectLocalMapTiles(view);
  assert.ok(tiles.length > 0);
  assert.ok(tiles.length <= MAX_LOCAL_TILES);
  assert.ok(tiles.every((tile) => tile.y >= 0 && tile.x >= 0 && tile.x < 2 ** tile.zoom));
  assert.equal(new Set(tiles.map((tile) => tile.key)).size, tiles.length);
});

test('date line longitude wrapping keeps valid tile X values', () => {
  for (const longitude of [-179.9, 179.9, 180.01, -180.01]) {
    const tiles = selectLocalMapTiles({ ...view, longitude });
    assert.ok(tiles.length > 0);
    assert.ok(tiles.every((tile) => tile.x >= 0 && tile.x < 2 ** tile.zoom));
  }
});

test('tile longitude and latitude inverse conversions', () => {
  const zoom = 10;
  const x = mercatorTileX(-89.4, zoom);
  const y = mercatorTileY(43.07, zoom);
  assert.ok(Math.abs(tileLongitude(x, zoom) + 89.4) < 1e-8);
  assert.ok(Math.abs(tileLatitude(y, zoom) - 43.07) < 1e-8);
});

test('mesh geometry has outward-facing triangles and matching UVs', () => {
  const tile = { zoom: 3, x: 4, y: 4 };
  const data = createLocalMapTileMeshData(tile, 1);
  assert.equal(data.positions.length, 12);
  assert.equal(data.uvs.length, 8);
  assert.equal(data.indices.length, 6);
  const pos = data.positions;
  const [a, b, c] = data.indices;
  const v = (i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
  const A = v(a), B = v(b), C = v(c);
  const u = B.map((n, i) => n - A[i]);
  const w = C.map((n, i) => n - A[i]);
  const cross = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  assert.ok(cross.reduce((sum, n, i) => sum + n * A[i], 0) > 0);
});

test('tile URL uses the label-free style and encodes key', () => {
  const url = localMapTileUrl({ zoom: 10, x: 1, y: 2 }, 'abc+xyz');
  assert.match(url, /voyager_nolabels\/10\/1\/2\.png\?key=abc%2Bxyz/);
});

test('polar latitudes do not request invalid Mercator tiles', () => {
  assert.deepEqual(selectLocalMapTiles({ ...view, latitude: 89 }), []);
});

test('completed local map tiles are fully opaque; only transitions fade', () => {
  assert.equal(getLocalMapOpacity(1.18), 1);
  assert.equal(getLocalMapOpacity(1.018), 1);
  assert.equal(getLocalMapOpacity(1.2), 0);
});
