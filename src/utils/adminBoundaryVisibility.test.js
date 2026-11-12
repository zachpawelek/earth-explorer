import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN1_START_DISTANCE, getAdmin1Opacity } from "./adminBoundaryVisibility.js";

test("subnational borders stay hidden at world scale", () => {
  assert.equal(getAdmin1Opacity(6), 0);
  assert.equal(getAdmin1Opacity(ADMIN1_START_DISTANCE), 0);
  assert.equal(getAdmin1Opacity(NaN), 0);
});

test("subnational borders fade in smoothly as the camera approaches", () => {
  assert.ok(getAdmin1Opacity(2) > 0);
  assert.ok(getAdmin1Opacity(1.3) > getAdmin1Opacity(2));
  assert.ok(getAdmin1Opacity(1.02) <= 0.62);
});
