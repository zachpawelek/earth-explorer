import assert from "node:assert/strict";
import test from "node:test";
import { buildCoastlinePositions } from "./coastlineGeometry.js";

const line = {
  features: [{ geometry: { type: "LineString", coordinates: [[0, 0], [0.5, 0]] } }],
};

test("default coastline radius stays unchanged", () => {
  const positions = buildCoastlinePositions(line);
  assert.equal(positions.length, 6);
  assert.ok(Math.abs(Math.hypot(...positions.slice(0, 3)) - 1.01) < 1e-6);
});

test("internal borders project closer to the globe without changing coordinates", () => {
  const positions = buildCoastlinePositions(line, 1.002);
  assert.equal(positions.length, 6);
  assert.ok(Math.abs(Math.hypot(...positions.slice(0, 3)) - 1.002) < 1e-6);
});
