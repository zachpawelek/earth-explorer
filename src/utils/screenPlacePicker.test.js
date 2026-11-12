import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScreenPlaceIndex, pickScreenPlace, TOWN_PICK_RADIUS_PX } from './screenPlacePicker.js';

test('small visible dots get a 12-pixel click target', () => {
  const places = [{ id: 'A', x: 100, y: 100 }, { id: 'B', x: 220, y: 100 }];
  const index = buildScreenPlaceIndex(places, p => ({ x: p.x, y: p.y }));
  assert.equal(pickScreenPlace(index, 109, 107)?.id, 'A');
  assert.equal(pickScreenPlace(index, 110 + TOWN_PICK_RADIUS_PX, 120), null);
  assert.equal(pickScreenPlace(index, 205, 100), null);
});

test('picks the nearest dot across cell boundaries', () => {
  const places = [{ id: 'A', x: 31, y: 31 }, { id: 'B', x: 38, y: 38 }];
  const index = buildScreenPlaceIndex(places, p => p);
  assert.equal(pickScreenPlace(index, 35, 35)?.id, 'B');
  assert.equal(pickScreenPlace(index, 29, 29)?.id, 'A');
});

test('off-screen and non-projectable dots are not in the index', () => {
  const index = buildScreenPlaceIndex([{id:'behind'}, {id:'visible'}], p =>
    p.id === 'visible' ? { x: 15, y: 17 } : null);
  assert.equal(pickScreenPlace(index, 15, 17)?.id, 'visible');
  assert.equal(pickScreenPlace(index, Number.NaN, 17), null);
});
