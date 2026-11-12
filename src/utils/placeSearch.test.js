import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlaceName, buildPlaceSearchIndex, searchPlaces } from "./placeSearch.js";

const rows = [
  [1, "Madison", 43.07, -89.4, 280000, "US", "WI", "PPLA2"],
  [2, "Madison", 32.46, -90.11, 28000, "US", "MS", "PPL"],
  [3, "Madisonville", 30.4, -90.1, 10000, "US", "LA", "PPL"],
  [4, "São Paulo", -23.5, -46.6, 12000000, "BR", "27", "PPLA"],
];
const majors = [{
  type: "Feature",
  geometry: { type: "Point", coordinates: [2.35, 48.86] },
  properties: { NE_ID: 777, NAME: "Paris", ADM0NAME: "France", WIKIDATAID: "Q90", POP_MAX: 2000000 },
}];
const entries = buildPlaceSearchIndex(rows, majors);

test("place search matches accent-insensitively", () => {
  assert.equal(normalizePlaceName("  SÃO   Paulo "), "sao paulo");
  assert.equal(searchPlaces(entries, "sao paulo")[0].geonameId, "4");
});

test("exact city names rank ahead of longer partial names", () => {
  const found = searchPlaces(entries, "Madison");
  assert.equal(found[0].geonameId, "1");
  assert.equal(found[1].geonameId, "2");
  assert.equal(found[2].name, "Madisonville");
});

test("major cities remain searchable with their known Wikidata ID", () => {
  const found = searchPlaces(entries, "Paris");
  assert.equal(found[0].wikidataId, "Q90");
  assert.equal(found[0].countryName, "France");
});

test("GeoNames search results preserve IDs and country disambiguation", () => {
  const found = searchPlaces(entries, "Madison", 1);
  assert.equal(found.length, 1);
  assert.equal(found[0].geonameId, "1");
  assert.equal(found[0].countryCode, "US");
  assert.equal(found[0].admin1, "WI");
});

test("invalid or very short searches return empty results", () => {
  assert.deepEqual(searchPlaces(entries, "m"), []);
  assert.deepEqual(searchPlaces(entries, "unknown"), []);
  assert.deepEqual(searchPlaces(entries, "paris", 0), []);
});
