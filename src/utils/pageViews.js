
const cache = new Map();

function monthStamp(date) {
  return `${date.getUTCFullYear()}${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}01`;
}

export function getReadershipWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const first = new Date(Date.UTC(year, month - 12, 1));
  const last = new Date(Date.UTC(year, month - 1, 1));

  return {
    start: monthStamp(first),
    end: monthStamp(last),
    label: `${
      first.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    } – ${
      last.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    }`,
  };
}

export async function getEnglishPageviews(
  title,
  { signal, fetcher = fetch, now = new Date() } = {}
) {
  if (typeof title !== "string" || !title.trim()) {
    return null;
  }

  const { start, end } = getReadershipWindow(now);
  const key = `${title}|${start}|${end}`;

  if (cache.has(key)) return cache.get(key);

  const encodedTitle = encodeURIComponent(
    title.replaceAll(" ", "_")
  );

  const url =
    "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/" +
    `en.wikipedia.org/all-access/user/${encodedTitle}/monthly/${start}/${end}`;

  const response = await fetcher(url, {
    signal,
    headers: {
      "Api-User-Agent":
        "EarthExplorer/0.1 (https://github.com/zachpawelek/earth-explorer)",
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(
      `Wikimedia pageviews HTTP ${response.status}`
    );
  }

  const payload = await response.json();
  const items = payload.items;

  // Require a complete twelve-month series.
  if (
    !Array.isArray(items) ||
    items.length !== 12 ||
    items.some(
      (item) =>
        !Number.isSafeInteger(item.views) ||
        item.views < 0
    )
  ) {
    return null;
  }

  const total = items.reduce(
    (sum, item) => sum + item.views,
    0
  );

  cache.set(key, total);
  return total;
}

export async function getCandidateReadership(
  people,
  { signal, fetcher = fetch, now = new Date() } = {}
) {
  const byId = {};
  const errors = {};

  // Request one article at a time.
  for (const person of people) {
    if (signal?.aborted) return null;

    try {
      byId[person.id] = await getEnglishPageviews(
        person.enwikiTitle,
        { signal, fetcher, now }
      );
    } catch (error) {
      if (
        signal?.aborted ||
        error.name === "AbortError"
      ) {
        return null;
      }

      byId[person.id] = null;
      errors[person.id] = error.message;
    }
  }

  return {
    byId,
    errors,
    window: getReadershipWindow(now),
  };
}

export function rankReadershipPilot(
  people,
  pageviewsById
) {
  const measurable = people.filter(
    (person) =>
      Number.isFinite(pageviewsById?.[person.id]) &&
      Number.isFinite(person.sitelinks)
  );

  if (measurable.length === 0) return [];

  const maxLinks = Math.max(
    1,
    ...measurable.map((person) => person.sitelinks)
  );

  const maxViews = Math.max(
    1,
    ...measurable.map(
      (person) => pageviewsById[person.id]
    )
  );

  return measurable
    .map((person) => {
      const links =
        Math.log1p(person.sitelinks) /
        Math.log1p(maxLinks);

      const views =
        Math.log1p(pageviewsById[person.id]) /
        Math.log1p(maxViews);

      return {
        ...person,
        pilotScore: Math.round(
          100 * (0.5 * links + 0.5 * views)
        ),
      };
    })
    .sort(
      (a, b) =>
        b.pilotScore - a.pilotScore ||
        a.id.localeCompare(b.id)
    );
}
