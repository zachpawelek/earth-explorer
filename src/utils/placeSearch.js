// GeoNames rows: [id, name, lat, lon, population, country, admin1, feature].
// Build text keys once; each keystroke then scans only normalized strings.
export function normalizePlaceName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function buildPlaceSearchIndex(geoNamesRows, majorFeatures) {
  const entries = [];

  for (const row of geoNamesRows) {
    if (!Array.isArray(row) || row.length < 8) continue;
    const [id, name, latitude, longitude, population, countryCode, admin1, featureCode] = row;
    if (!Number.isSafeInteger(id) || id <= 0 ||
        typeof name !== "string" || !name.trim() ||
        !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) continue;

    entries.push({
      searchName: normalizePlaceName(name),
      id: `geonames-${id}`, geonameId: String(id),
      name, latitude, longitude,
      population: Number.isFinite(population) ? Math.max(0, population) : 0,
      countryCode, countryName: countryCode,
      admin1, featureCode, wikidataId: null,
    });
  }

  for (const feature of majorFeatures) {
    if (feature.geometry?.type !== "Point") continue;
    const [longitude, latitude] = feature.geometry.coordinates ?? [];
    const properties = feature.properties ?? {};
    const name = properties.NAME;
    if (typeof name !== "string" || !name.trim() ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const qid = properties.WIKIDATAID;
    entries.push({
      searchName: normalizePlaceName(name),
      id: `major-${properties.NE_ID ?? `${name}-${latitude}-${longitude}`}`,
      name, latitude, longitude,
      population: Math.max(0, Number(properties.POP_MAX) || 0),
      countryName: properties.ADM0NAME || null,
      countryCode: properties.ISO_A2 || null,
      admin1: null,
      wikidataId: typeof qid === "string" && /^Q[1-9]\d*$/.test(qid) ? qid : null,
    });
  }

  return entries;
}

function compareMatches(a, b) {
  return b.searchScore - a.searchScore ||
    b.population - a.population ||
    a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

export function searchPlaces(entries, query, limit = 8) {
  const needle = normalizePlaceName(query);
  if (needle.length < 2 || limit < 1) return [];

  const best = [];
  for (const entry of entries) {
    const name = entry.searchName;
    let nameScore;
    if (name === needle) nameScore = 1000;
    else if (name.startsWith(needle)) nameScore = 600;
    else if (name.includes(` ${needle}`)) nameScore = 350;
    else if (needle.length >= 3 && name.includes(needle)) nameScore = 150;
    else continue;

    const match = {
      ...entry,
      searchScore: nameScore + Math.log10(entry.population + 1) * 7,
    };
    if (best.length < limit) {
      best.push(match);
      best.sort(compareMatches);
    } else if (compareMatches(match, best[best.length - 1]) < 0) {
      best[best.length - 1] = match;
      best.sort(compareMatches);
    }
  }
  return best;
}
