
const WIKIDATA_ID = /^Q[1-9]\d*$/;
const SCORE_REFERENCE = Math.log1p(300);

export function getFameIndex(sitelinks) {
  const count = Number(sitelinks);

  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((100 * Math.log1p(count)) / SCORE_REFERENCE)
  );
}

export function rankPeople(people) {
  return [...people].sort(
    (a, b) =>
      b.fameIndex - a.fameIndex ||
      b.sitelinks - a.sitelinks ||
      a.id.localeCompare(b.id)
  );
}

export function buildBirthplaceQuery(cityId) {
  if (!WIKIDATA_ID.test(cityId)) {
    throw new Error("Invalid Wikidata city identifier");
  }

  return `
SELECT ?person ?personLabel ?personDescription ?sitelinks WHERE {
  {
    SELECT ?person ?sitelinks WHERE {
      ?person wdt:P31 wd:Q5;
              wdt:P19 wd:${cityId};
              wikibase:sitelinks ?sitelinks.
    }
    ORDER BY DESC(?sitelinks)
    LIMIT 10
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)`;
}

export async function findMostNotablePerson(
  cityId,
  { signal, fetcher = fetch } = {}
) {
  const query = buildBirthplaceQuery(cityId);
  const params = new URLSearchParams({
    query,
    format: "json",
  });

  const response = await fetcher(
    `https://query.wikidata.org/sparql?${params}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(`Wikidata returned HTTP ${response.status}`);
  }

  const data = await response.json();

  const people = (data.results?.bindings ?? [])
    .map((row) => {
      const id = row.person?.value?.split("/").pop();

      if (!WIKIDATA_ID.test(id)) return null;

      const sitelinks = Number(row.sitelinks?.value) || 0;

      return {
        id,
        name: row.personLabel?.value || id,
        description:
          row.personDescription?.value || "No description available",
        sitelinks,
        fameIndex: getFameIndex(sitelinks),
        url: `https://www.wikidata.org/wiki/${id}`,
      };
    })
    .filter(Boolean);

  return rankPeople(people)[0] ?? null;
}
