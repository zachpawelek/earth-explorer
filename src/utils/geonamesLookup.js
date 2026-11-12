const ID_PATTERN = /^[1-9]\d*$/;
const ITEM_PATTERN = /^Q[1-9]\d*$/;
const cache = new Map();

export function buildGeoNamesWikidataQuery(geonameId) {
  const id = String(geonameId);
  if (!ID_PATTERN.test(id)) throw new Error("Invalid GeoNames identifier");
  return `SELECT DISTINCT ?place WHERE { ?place wdt:P1566 "${id}". } LIMIT 2`;
}

// Only return a Wikidata item when the GeoNames ID resolves unambiguously.
// An absent or ambiguous link must never silently become a guessed city.
export async function resolveGeoNamesWikidata(
  geonameId,
  { signal, fetcher = fetch } = {},
) {
  const id = String(geonameId);
  const query = buildGeoNamesWikidataQuery(id);
  if (cache.has(id)) return cache.get(id);

  const params = new URLSearchParams({ query, format: "json" });
  const response = await fetcher(`https://query.wikidata.org/sparql?${params}`, { signal });
  if (!response.ok) throw new Error(`GeoNames Wikidata lookup HTTP ${response.status}`);

  const data = await response.json();
  const matches = new Set(
    (data.results?.bindings ?? [])
      .map((row) => row.place?.value?.split("/").pop())
      .filter((value) => ITEM_PATTERN.test(value)),
  );
  const result = matches.size === 1
    ? { status: "matched", wikidataId: [...matches][0] }
    : { status: matches.size > 1 ? "ambiguous" : "not-found", wikidataId: null };
  cache.set(id, result);
  return result;
}
