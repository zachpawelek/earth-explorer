import test from "node:test";
import assert from "node:assert/strict";
import { buildGeoNamesCatalog, selectGeoNamesPlaces, geoViewKey, visibleAngularRadius } from "./geonamesCatalog.js";

const rows = [
  [10, "Front village", 0, 0, 600, "US", "WI", "PPL"],
  [11, "Back village", 0, 180, 800, "US", "WI", "PPL"],
  [12, "Regional town", 1, 2, 25000, "US", "WI", "PPL"],
  [13, "Admin town", -1, 1, 600, "US", "WI", "PPLA2"],
];
const catalog = buildGeoNamesCatalog(rows);
const view = { latitude: 0, longitude: 0, distance: 1.5 };

test("GeoNames global view intentionally defers small place markers", () => {
  assert.deepEqual(selectGeoNamesPlaces(catalog, view, "Global"), []);
});

test("close-up shows nearby villages but excludes far-side towns", () => {
  const places = selectGeoNamesPlaces(catalog, view, "Close-up");
  assert.ok(places.some((p) => p.name === "Front village"));
  assert.ok(!places.some((p) => p.name === "Back village"));
  assert.equal(places.find((p) => p.geonameId === "10").id, "geonames-10");
});

test("regional zoom filters low-population villages except administrative seats", () => {
  const places = selectGeoNamesPlaces(catalog, view, "Regional");
  assert.ok(!places.some((p) => p.name === "Front village"));
  assert.ok(places.some((p) => p.name === "Regional town"));
  assert.ok(places.some((p) => p.name === "Admin town"));
});

test("bad GeoNames rows are skipped safely", () => {
  const c = buildGeoNamesCatalog([[42, "Bad", 999, 0, 3, "US", "", "PPL"]]);
  assert.equal(c.buckets.length, 0);
});

test("camera view key is stable across tiny angle changes", () => {
  assert.equal(geoViewKey({ latitude: 1, longitude: 1, distance: 1.51 }), geoViewKey({ latitude: 1.1, longitude: 1.1, distance: 1.52 }));
});


test("GeoNames close-up key responds to fine geographic motion and surface zoom", () => {
  assert.notEqual(
    geoViewKey({ latitude: 0, longitude: 0, distance: 1.018 }),
    geoViewKey({ latitude: 0, longitude: 0, distance: 1.026 })
  );
  assert.notEqual(
    geoViewKey({ latitude: 0, longitude: 0, distance: 1.018 }),
    geoViewKey({ latitude: 0, longitude: 0.16, distance: 1.018 })
  );
});


test("close-up camera frustum excludes towns outside the screen, not just the horizon", () => {
  const points = [
    [21, "Center", 0, 0, 800, "US", "WI", "PPL"],
    [22, "Nearby", 0, 0.2, 800, "US", "WI", "PPL"],
    [23, "Off-screen but above horizon", 0, 6, 800, "US", "WI", "PPL"],
  ];
  const near = { latitude: 0, longitude: 0, distance: 1.03 };
  const places = selectGeoNamesPlaces(buildGeoNamesCatalog(points), near, "Close-up", {
    fov: 75, aspect: 1.6,
  });
  assert.ok(places.some((p) => p.name === "Center"));
  assert.ok(places.some((p) => p.name === "Nearby"));
  assert.ok(!places.some((p) => p.name === "Off-screen but above horizon"));
});

test("angular visibility widens as the camera zooms out", () => {
  const close = visibleAngularRadius(1.03, 75, 1.6);
  const farther = visibleAngularRadius(1.3, 75, 1.6);
  assert.ok(close > 0);
  assert.ok(farther > close);
  assert.ok(close < Math.acos(1 / 1.03));
});
