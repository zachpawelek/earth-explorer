import test from 'node:test';
import assert from 'node:assert/strict';
import { selectAdminTiles, loadAdminTilePositions } from './adminBoundaryTiles.js';

const manifest = { tileDegrees:20, tiles: [
  {key:'here',lat:0,lon:0,url:'/here'},
  {key:'far',lat:0,lon:180,url:'/far'},
  {key:'close',lat:10,lon:10,url:'/close'},
]};

test('only boundaries near the current view are selected at deep zoom', () => {
  const nearby = selectAdminTiles(manifest, {latitude:0,longitude:0,distance:1.03});
  assert.ok(nearby.some(t => t.key === 'here'));
  assert.ok(nearby.some(t => t.key === 'close'));
  assert.ok(!nearby.some(t => t.key === 'far'));
});

test('admin boundaries remain hidden at global zoom', () => {
  assert.deepEqual(selectAdminTiles(manifest,{latitude:0,longitude:0,distance:3}), []);
});

test('binary tile loads retain a six-float-per-segment layout', async () => {
  const data = new Float32Array([1,2,3,4,5,6]);
  const result = await loadAdminTilePositions('/testtile.bin', async () => ({ok:true, arrayBuffer:async()=>data.buffer}));
  assert.deepEqual([...result], [1,2,3,4,5,6]);
});
