import test from "node:test";
import assert from "node:assert/strict";
import { markerRadiusForPixels, cityLabelFontSize, localTownFontSize } from "./markerSizing.js";

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
