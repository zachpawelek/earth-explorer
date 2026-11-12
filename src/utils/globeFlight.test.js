import test from "node:test";
import assert from "node:assert/strict";
import { interpolateGlobeFlight, SEARCH_ARRIVAL_DISTANCE } from "./globeFlight.js";

const start = { x: 0, y: 0, z: 3 };
const destination = { latitude: 43.07, longitude: -89.4 };

test("flight remains at its initial position at t=0", () => {
  const p = interpolateGlobeFlight(start, destination, 0);
  assert.ok(p.distanceTo(start) < 0.00001);
});

test("flight ends above the selected place at a safe distance", () => {
  const p = interpolateGlobeFlight(start, destination, 1);
  assert.ok(Math.abs(p.length() - SEARCH_ARRIVAL_DISTANCE) < 1e-9);
  const lat = Math.asin(p.y / p.length()) * 180 / Math.PI;
  const lon = Math.atan2(p.x, p.z) * 180 / Math.PI;
  assert.ok(Math.abs(lat - destination.latitude) < 0.001);
  assert.ok(Math.abs(lon - destination.longitude) < 0.001);
});

test("flight interpolates smoothly at an intermediate distance", () => {
  const p = interpolateGlobeFlight(start, destination, 0.5);
  assert.ok(p.length() > SEARCH_ARRIVAL_DISTANCE);
  assert.ok(p.length() < 3);
});
