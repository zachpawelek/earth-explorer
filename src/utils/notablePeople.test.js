import test from "node:test";
import assert from "node:assert/strict";
import { buildBirthplaceQuery, findBirthplaceCandidates } from "./notablePeople.js";

test("Wikidata query retains English Wikipedia title outside limited subselect", () => {
  const query = buildBirthplaceQuery("Q90");
  const closeSubselect = query.indexOf("LIMIT 50");
  const optional = query.indexOf("OPTIONAL {");
  assert.ok(optional > closeSubselect, "Article title lookup must follow subquery");
  assert.match(query, /schema:name \?enwikiTitle/);
});

test("candidate mapper preserves English article title for pageview lookup", async () => {
  const fakeFetcher = async () => ({
    ok: true,
    json: async () => ({
      results: { bindings: [{
        person: { value: "http://www.wikidata.org/entity/Q123" },
        personLabel: { value: "Example" },
        sitelinks: { value: "12" },
        enwikiTitle: { value: "Example (artist)" },
      }] },
    }),
  });
  const result = await findBirthplaceCandidates("Q90", { fetcher: fakeFetcher });
  assert.equal(result.people[0].enwikiTitle, "Example (artist)");
});
