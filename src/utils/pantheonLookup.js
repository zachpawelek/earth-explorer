const QID_PATTERN = /^Q[1-9]\d*$/;

let pendingIndex;

function loadPantheonIndex() {
  if (!pendingIndex) {
    pendingIndex = fetch("/data/pantheon-index.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Pantheon HTTP ${response.status}`);
        }

        return response.json();
      })
      .catch((error) => {
        pendingIndex = undefined;
        throw error;
      });
  }

  return pendingIndex;
}

export async function findPantheonRecord(personId) {
  if (!QID_PATTERN.test(personId)) return null;

  const index = await loadPantheonIndex();

  return index.people?.[personId] ?? null;
}


export async function findPantheonRecords(
  personIds,
  loader = loadPantheonIndex
) {
  const ids = [
    ...new Set(
      personIds.filter(
        (id) =>
          typeof id === "string" &&
          QID_PATTERN.test(id)
      )
    ),
  ];

  if (ids.length === 0) {
    return {};
  }

  const index = await loader();

  return Object.fromEntries(
    ids.map((id) => [
      id,
      index.people?.[id] ?? null,
    ])
  );
}
  