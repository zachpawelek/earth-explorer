// The lead image belongs to an article identified by the selected person's Wikidata ID.
// Never search by a person's display name: names can be ambiguous.
const WIKIDATA_ID = /^Q[1-9]\d*$/;
const portraitCache = new Map();

function isWikimediaThumbnail(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname) &&
      url.pathname.startsWith("/wikipedia/commons/")
    );
  } catch {
    return false;
  }
}

// Commons file pages contain licensing and author details. The page-summary API
// doesn't include those details itself.
export function getCommonsFilePage(imageUrl) {
  if (!isWikimediaThumbnail(imageUrl)) return null;

  const segments = new URL(imageUrl).pathname.split("/").filter(Boolean);
  const commonsIndex = segments.indexOf("commons");
  if (commonsIndex === -1) return null;

  const fileIndex = segments[commonsIndex + 1] === "thumb"
    ? commonsIndex + 4
    : commonsIndex + 3;
  const filename = segments[fileIndex];
  if (!filename) return null;

  try {
    return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(decodeURIComponent(filename))}`;
  } catch {
    return null;
  }
}

export async function getWikipediaPortrait(
  person,
  { signal, fetcher = fetch } = {}
) {
  if (
    !WIKIDATA_ID.test(person?.id ?? "") ||
    typeof person?.enwikiTitle !== "string" ||
    !person.enwikiTitle.trim()
  ) {
    return null;
  }

  const key = `${person.id}|${person.enwikiTitle}`;
  if (portraitCache.has(key)) return portraitCache.get(key);

  const title = person.enwikiTitle.trim().replaceAll(" ", "_");
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  const response = await fetcher(url, { signal });
  if (response.status === 404) {
    if (!signal?.aborted) portraitCache.set(key, null);
    return null;
  }
  if (!response.ok) {
    throw new Error(`Wikipedia image lookup returned HTTP ${response.status}`);
  }

  const summary = await response.json();

  // A Wikidata ID match is essential. We must not accidentally show a similarly
  // named person, disambiguation page, or unrelated lead image.
  if (
    summary.type !== "standard" ||
    summary.wikibase_item !== person.id ||
    !isWikimediaThumbnail(summary.thumbnail?.source)
  ) {
    if (!signal?.aborted) portraitCache.set(key, null);
    return null;
  }

  const portrait = {
    src: summary.thumbnail.source,
    articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    filePageUrl: getCommonsFilePage(summary.thumbnail.source),
  };

  if (!signal?.aborted) portraitCache.set(key, portrait);
  return portrait;
}
