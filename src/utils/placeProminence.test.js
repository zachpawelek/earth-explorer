import test from "node:test";
import assert from "node:assert/strict";
import { getPlaceImportance, getPlaceVisuals } from "./placeProminence.js";

const town = (population, extra = {}) => ({ population, ...extra });

test("Population creates a consistent visual size hierarchy", () => {
  const tiny = getPlaceVisuals(town(75), 1.02);
  const small = getPlaceVisuals(town(2_000), 1.02);
  const medium = getPlaceVisuals(town(80_000), 1.02);
  const metro = getPlaceVisuals(town(8_000_000), 1.02);
  assert.ok(tiny.dotSize < small.dotSize);
  assert.ok(small.dotSize < medium.dotSize);
  assert.ok(medium.dotSize < metro.dotSize);
  assert.ok(tiny.fontSize < small.fontSize);
  assert.ok(small.fontSize < medium.fontSize);
  assert.ok(medium.fontSize < metro.fontSize);
});

test("Cities remain more prominent than villages at every zoom", () => {
  for (const distance of [4, 2, 1.15, 1.02]) {
    const village = getPlaceVisuals(town(70), distance);
    const city = getPlaceVisuals(town(5_000_000, { prominence: "major" }), distance);
    assert.ok(city.dotSize > village.dotSize);
    assert.ok(city.fontSize > village.fontSize);
  }
});

test("Labels scale up with zoom, preserving readability at local scale", () => {
  for (const population of [50, 5_000, 5_000_000]) {
    const regional = getPlaceVisuals(town(population), 2);
    const close = getPlaceVisuals(town(population), 1.02);
    assert.ok(close.fontSize > regional.fontSize);
    assert.ok(close.dotSize >= regional.dotSize);
  }
  assert.ok(getPlaceVisuals(town(50), 1.02).fontSize >= 10);
});

test("Administrative capitals receive a prominence floor", () => {
  assert.ok(getPlaceImportance(town(300, { featureCode: "PPLC" })) >
    getPlaceImportance(town(20_000)));
  assert.ok(getPlaceImportance(town(300, { featureCode: "PPLA2" })) >
    getPlaceImportance(town(300)));
});

test("Missing, invalid and extreme populations stay safely bounded", () => {
  for (const value of [null, undefined, -100, Infinity, NaN, 0, 1e13]) {
    const visuals = getPlaceVisuals(town(value), 1.02);
    assert.ok(Number.isFinite(visuals.fontSize));
    assert.ok(visuals.fontSize >= 10 && visuals.fontSize <= 19);
    assert.ok(visuals.dotSize >= 3 && visuals.dotSize <= 15);
  }
});


test("Deep zoom gives a clearly stronger city-versus-village contrast", () => {
  const village = getPlaceVisuals(town(75), 1.02);
  const city = getPlaceVisuals(town(8_000_000), 1.02);
  assert.ok(city.dotSize >= village.dotSize * 4);
  assert.ok(city.fontSize >= village.fontSize * 1.75);
  assert.ok(village.fontSize >= 10);
});

test("Administrative importance stays visible even for small capitals", () => {
  const hamlet = getPlaceVisuals(town(300), 1.02);
  const capital = getPlaceVisuals(town(300, { featureCode: "PPLC" }), 1.02);
  assert.ok(capital.dotSize > hamlet.dotSize * 2);
  assert.ok(capital.fontSize > hamlet.fontSize);
  assert.equal(capital.tone, "prominent");
});
