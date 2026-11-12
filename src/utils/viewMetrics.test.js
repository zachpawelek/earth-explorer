import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  getRotationSpeed,
  getZoomSpeed,
  getViewMetrics,
} from "./viewMetrics.js";

test("globe drag sensitivity decreases toward the surface", () => {
  const near = getRotationSpeed(MIN_CAMERA_DISTANCE);
  const regional = getRotationSpeed(2);
  const global = getRotationSpeed(3.2);
  assert.ok(near > 0 && near < regional);
  assert.ok(regional < global);
  assert.ok(global <= 0.5);
  assert.equal(getRotationSpeed(MAX_CAMERA_DISTANCE), global);
});

test("rotation speed is bounded for extreme or invalid distances", () => {
  assert.equal(getRotationSpeed(0), getRotationSpeed(MIN_CAMERA_DISTANCE));
  assert.equal(getRotationSpeed(Infinity), getRotationSpeed(MIN_CAMERA_DISTANCE));
});

test("view metrics still report the expected distance", () => {
  assert.equal(getViewMetrics({ x: 0, y: 0, z: 3 }).distance, 3);
});


test("wheel zoom is slower closer to the surface and remains bounded", () => {
  const near = getZoomSpeed(MIN_CAMERA_DISTANCE);
  const regional = getZoomSpeed(2);
  const far = getZoomSpeed(3.2);
  assert.ok(near > 0 && near < regional);
  assert.ok(regional < far && far < 1);
  assert.equal(getZoomSpeed(MAX_CAMERA_DISTANCE), far);
  assert.equal(getZoomSpeed(0), near);
  assert.equal(getZoomSpeed(NaN), near);
});
