import test from "node:test";
import assert from "node:assert/strict";
import { getWikipediaPortrait, getCommonsFilePage } from "./personImages.js";

const PERSON = { id: "Q937", enwikiTitle: "Albert Einstein" };
const THUMB = "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Albert_Einstein_Head_cleaned.jpg/330px-Albert_Einstein_Head_cleaned.jpg";
const expected = {
  type: "standard",
  wikibase_item: "Q937",
  thumbnail: { source: THUMB },
};

test("loads the English Wikipedia summary by article title and checks the Wikidata identity", async () => {
  let endpoint;
  const fetcher = async (url) => {
    endpoint = url;
    return { ok: true, json: async () => expected };
  };
  const image = await getWikipediaPortrait(PERSON, { fetcher });
  assert.match(endpoint, /page\/summary\/Albert_Einstein$/);
  assert.equal(image.src, THUMB);
  assert.match(image.articleUrl, /en\.wikipedia\.org\/wiki\/Albert_Einstein$/);
});

test("never shows an image for a different Wikidata person", async () => {
  const person = { id: "Q21999", enwikiTitle: "Example (person)" };
  const fetcher = async () => ({ ok: true, json: async () => expected });
  assert.equal(await getWikipediaPortrait(person, { fetcher }), null);
});

test("rejects invalid image host even when page ID matches", async () => {
  const person = { id: "Q21998", enwikiTitle: "Example (author)" };
  const fetcher = async () => ({ ok: true, json: async () => ({
    type: "standard", wikibase_item: person.id,
    thumbnail: { source: "https://example.net/a.jpg" },
  }) });
  assert.equal(await getWikipediaPortrait(person, { fetcher }), null);
});

test("missing article title makes no network request", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw Error("unexpected"); };
  assert.equal(await getWikipediaPortrait({ id: "Q132", enwikiTitle: null }, { fetcher }), null);
  assert.equal(calls, 0);
});

test("404 and missing thumbnail fall back cleanly", async () => {
  const fetch404 = async () => ({ ok: false, status: 404 });
  assert.equal(await getWikipediaPortrait({ id: "Q21997", enwikiTitle: "Missing person" }, { fetcher: fetch404 }), null);
  const fetchNoImage = async () => ({ ok: true, json: async () => ({ type: "standard", wikibase_item: "Q21996" }) });
  assert.equal(await getWikipediaPortrait({ id: "Q21996", enwikiTitle: "Example person" }, { fetcher: fetchNoImage }), null);
});

test("a failed image API request rejects for caller fallback", async () => {
  const fetcher = async () => ({ ok: false, status: 429 });
  await assert.rejects(
    getWikipediaPortrait({ id: "Q21995", enwikiTitle: "Another example" }, { fetcher }),
    /HTTP 429/
  );
});

test("finds a Commons file page for photo credits", () => {
  assert.equal(
    getCommonsFilePage(THUMB),
    "https://commons.wikimedia.org/wiki/File:Albert_Einstein_Head_cleaned.jpg"
  );
  assert.equal(getCommonsFilePage("https://evil.invalid/photo.jpg"), null);
});

test("rejects non-Commons Wikipedia images requiring separate rights review", async () => {
  const person = { id: "Q21993", enwikiTitle: "Example actor" };
  const fetcher = async () => ({ ok: true, json: async () => ({
    type: "standard", wikibase_item: person.id,
    thumbnail: { source: "https://upload.wikimedia.org/wikipedia/en/thumb/a/ab/Nonfree_poster.jpg/200px-Nonfree_poster.jpg" },
  }) });
  assert.equal(await getWikipediaPortrait(person, { fetcher }), null);
});
