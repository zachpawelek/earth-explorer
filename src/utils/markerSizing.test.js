import test from "node:test";
import assert from "node:assert/strict";
import { markerRadiusForPixels, markerHitScale, hitTargetRadiusForPixels, MARKER_HIT_RADIUS_PX, cityLabelFontSize, localTownFontSize } from "./markerSizing.js";

test("world-space marker radius shrinks as globe camera approaches the surface", () => {
  const far = markerRadiusForPixels(3, 900, 75, 2);
  const near = markerRadiusForPixels(1.018, 900, 75, 2);
  assert.ok(far > near * 20);
  assert.ok(near > 0);
});

test("city and town labels grow as viewer zooms in", () => {
  assert.ok(cityLabelFontSize(3, "major") < cityLabelFontSize(1.02, "major"));
  assert.ok(cityLabelFontSize(3, "minor") < cityLabelFontSize(1.02, "minor"));
  assert.ok(localTownFontSize(1.2) < localTownFontSize(1.02));
});

test("screen-radius conversion tolerates invalid input", () => {
  assert.equal(markerRadiusForPixels(0, 0, 75, 2), 0.0001);
});

test("invisible marker targets provide a larger click area without changing visible pixels", () => {
  assert.equal(MARKER_HIT_RADIUS_PX, 9);
  assert.ok(markerHitScale(2) > 4);
  assert.equal(markerHitScale(20), 1);
  assert.equal(markerHitScale(0), 1);
  const radius = markerRadiusForPixels(1.1, 900, 75, 2);
  const target = markerRadiusForPixels(1.1, 900, 75, MARKER_HIT_RADIUS_PX);
  assert.ok(target > radius * 4);
});

test("hit target size is screen-relative even at regional zoom", () => {
  const depth = 2;
  const height = 900;
  const pick = hitTargetRadiusForPixels(depth, height, 75);
  const visible = markerRadiusForPixels(depth + 1.005, height, 75, 2);
  assert.ok(pick > 0.012); // Not clamped to the visible-marker limit
  assert.ok(pick > visible);
  assert.equal(hitTargetRadiusForPixels(-1, height, 75), 0.0001);
});
