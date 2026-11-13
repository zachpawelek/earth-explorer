import test from "node:test";
import assert from "node:assert/strict";
import { getPairLimit, layoutPlacePairs, samePlacePairs } from "./placePairLayout.js";

const major = (id, name, x, y) => ({
  id, name, latitude: 0, longitude: 0, kind: "major", prominence: "major", x, y,
});
const town = (id, name, x, y) => ({
  id, name, latitude: 0, longitude: 0, kind: "town", x, y,
});
const plan = (majorCities, towns, options = {}) => layoutPlacePairs({
  majorCities, towns, project: (p) => ({ x: p.x, y: p.y }),
  width: 700, height: 500, distance: 1.05, scale: "Close-up", ...options,
});

test("Every selected place is exactly one complete dot/name pair", () => {
  const result = plan([major("m1", "Madison", 50, 100)],
    [town("t1", "Middleton", 300, 100)]);
  assert.deepEqual(result.map((p) => p.id), ["m1", "t1"]);
  assert.ok(result.every((p) => p.fontSize > 0));
});

test("Overlapping labels hide their whole places, not just the text", () => {
  const result = plan([major("m1", "City", 100, 100)],
    [town("t1", "Same place", 105, 102)]);
  assert.deepEqual(result.map((p) => p.id), ["m1"]);
});

test("A label outside the viewport is omitted along with its dot", () => {
  const result = plan([major("edge", "Very Long City Name", 692, 30)],
    [town("center", "Town", 120, 110)]);
  assert.deepEqual(result.map((p) => p.id), ["center"]);
});

test("A selected place has priority in collisions", () => {
  const target = town("selected", "Target", 100, 100);
  const result = plan([major("m1", "City", 100, 100)], [], { featured: target });
  assert.deepEqual(result.map((p) => p.id), ["selected"]);
});

test("Global mode draws named major-city pairs only", () => {
  const result = plan([major("m1", "City", 100, 100)],
    [town("t1", "Village", 300, 100)], { scale: "Global" });
  assert.deepEqual(result.map((p) => p.id), ["m1"]);
});

test("Scale budgets increase as the camera approaches local areas", () => {
  assert.ok(getPairLimit("Global", 4) < getPairLimit("Regional", 2));
  assert.ok(getPairLimit("Regional", 2) < getPairLimit("Close-up", 1.03));
});

test("A repeated ID is never displayed twice", () => {
  const same = major("same", "Town", 100, 100);
  assert.equal(plan([same, same], []).length, 1);
});

test("Stable layouts can be reused without rerendering", () => {
  const a = plan([major("a", "City", 100, 100)], []);
  const b = plan([major("a", "City", 101, 100)], []);
  assert.ok(samePlacePairs(a, b));
  assert.ok(!samePlacePairs(a, []));
});

test("A bigger city reserves more collision space than a small town", () => {
  const high = { ...major("big", "Springfield", 100, 100), population: 6_000_000 };
  const low = { ...town("small", "Near", 305, 100), population: 70 };
  const result = plan([high], [low]);
  assert.deepEqual(result.map((p) => p.id), ["big", "small"]);
  assert.ok(result[0].dotSize > result[1].dotSize);
  assert.ok(result[0].fontSize > result[1].fontSize);
});

test("A changed dot size triggers a layout refresh", () => {
  const a = plan([major("a", "City", 100, 100)], []);
  const b = [{ ...a[0], dotSize: a[0].dotSize + 1 }];
  assert.ok(!samePlacePairs(a, b));
});
