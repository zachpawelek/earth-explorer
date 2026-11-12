import test from "node:test";
import assert from "node:assert/strict";
import { buildGeoNamesWikidataQuery, resolveGeoNamesWikidata } from "./geonamesLookup.js";

function fakeResponse(ids) {
  return async () => ({
    ok: true,
    json: async () => ({ results: { bindings: ids.map((id) => ({ place: { value: `http://www.wikidata.org/entity/${id}` } })) } }),
  });
}

test("GeoNames lookup uses a safe string identifier in P1566", () => {
  assert.match(buildGeoNamesWikidataQuery("2950159"), /wdt:P1566 "2950159"/);
  assert.throws(() => buildGeoNamesWikidataQuery('1"; DROP'), /Invalid/);
});

test("unique matching Wikidata item is accepted", async () => {
  const record = await resolveGeoNamesWikidata("450001", { fetcher: fakeResponse(["Q123"]) });
  assert.deepEqual(record, { status: "matched", wikidataId: "Q123" });
});

test("missing matching item is not guessed", async () => {
  const record = await resolveGeoNamesWikidata("450002", { fetcher: fakeResponse([]) });
  assert.deepEqual(record, { status: "not-found", wikidataId: null });
});

test("ambiguous duplicate Wikidata identifiers are rejected", async () => {
  const record = await resolveGeoNamesWikidata("450003", { fetcher: fakeResponse(["Q1", "Q2"]) });
  assert.deepEqual(record, { status: "ambiguous", wikidataId: null });
});

test("lookup errors propagate and do not pretend a place was missing", async () => {
  await assert.rejects(
    resolveGeoNamesWikidata("450004", { fetcher: async () => ({ ok: false, status: 429 }) }),
    /HTTP 429/,
  );
});
