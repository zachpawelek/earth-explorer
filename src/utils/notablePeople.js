
const WIKIDATA_ID = /^Q[1-9]\d*$/;
const SCORE_REFERENCE = Math.log1p(300);

export const CANDIDATE_LIMIT = 50;

export function getFameIndex(sitelinks) {
  const count = Number(sitelinks);

  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (100 * Math.log1p(count)) / SCORE_REFERENCE
    )
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
SELECT ?person ?personLabel ?personDescription ?enwikiTitle ?sitelinks WHERE {
  {
    SELECT DISTINCT ?person ?sitelinks WHERE {
      ?person wdt:P31 wd:Q5;
              wdt:P19/wdt:P131* wd:${cityId};
              wikibase:sitelinks ?sitelinks.
    }
    ORDER BY DESC(?sitelinks)
    LIMIT ${CANDIDATE_LIMIT}
  }
  OPTIONAL {
    ?article schema:about ?person;
             schema:isPartOf <https://en.wikipedia.org/>;
             schema:name ?enwikiTitle.
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
ORDER BY DESC(?sitelinks)`;
}

export async function findBirthplaceCandidates(
  cityId,
  { signal, fetcher = fetch } = {}
) {
  const params = new URLSearchParams({
    query: buildBirthplaceQuery(cityId),
    format: "json",
  });

  const response = await fetcher(
    `https://query.wikidata.org/sparql?${params}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(
      `Wikidata returned HTTP ${response.status}`
    );
  }

  const data = await response.json();
  const bindings = data.results?.bindings ?? [];

  const byId = new Map();

  for (const row of bindings) {
    const id = row.person?.value?.split("/").pop();

    if (!WIKIDATA_ID.test(id)) continue;

    const sitelinks = Math.max(
      0,
      Number(row.sitelinks?.value) || 0
    );

    const person = {
      id,
      name: row.personLabel?.value || id,
      description:
        row.personDescription?.value ||
        "No description available",
      sitelinks,
      fameIndex: getFameIndex(sitelinks),
      enwikiTitle: row.enwikiTitle?.value ?? null,
      url: `https://www.wikidata.org/wiki/${id}`,
    };

    if (
      !byId.has(id) ||
      sitelinks > byId.get(id).sitelinks
    ) {
      byId.set(id, person);
    }
  }

  return {
    people: rankPeople([...byId.values()]),
    mayBeTruncated: bindings.length >= CANDIDATE_LIMIT,
  };
}

export async function findMostNotablePerson(cityId, options) {
  const { people } = await findBirthplaceCandidates(
    cityId,
    options
  );

  return people[0] ?? null;
}
