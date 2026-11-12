
import { useEffect, useState } from "react";
import { findBirthplaceCandidates } from "../utils/notablePeople.js";
import { resolveGeoNamesWikidata } from "../utils/geonamesLookup.js";
import {
    findPantheonRecord,
    findPantheonRecords,
  } from "../utils/pantheonLookup.js";

  import ReadershipComparison from "./ReadershipComparison.jsx";


function PantheonEvidence({ person }) {
    const [result, setResult] = useState(null);
  
    useEffect(() => {
      let active = true;
  
      findPantheonRecord(person.id)
        .then((record) => {
          if (active) {
            setResult({
              personId: person.id,
              record,
              error: false,
            });
          }
        })
        .catch((error) => {
          console.error("Pantheon lookup failed:", error);
  
          if (active) {
            setResult({
              personId: person.id,
              record: null,
              error: true,
            });
          }
        });
  
      return () => {
        active = false;
      };
    }, [person.id]);
  
    if (result?.personId !== person.id) {
      return <p>Checking Pantheon records...</p>;
    }
  
    if (result.error) {
      return <p>Pantheon data unavailable.</p>;
    }
  
    if (!result.record) {
      return <p>No matching Pantheon record found.</p>;
    }
  
    return (
      <div className="city-discovery-note">
        <p>
          Pantheon HPI:{" "}
          <strong>{result.record.hpi}/100</strong>
        </p>
  
        <p>
          Pantheon birthplace:{" "}
          {result.record.birthplace ?? "Not provided"}
        </p>
  
        <a
          href="https://pantheon.world/data/datasets"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pantheon data source
        </a>
      </div>
    );
  }


function CandidateComparison({ people }) {
    const [result, setResult] = useState(null);
  
    const ids = people.map((person) => person.id).join(",");
  
    useEffect(() => {
      let active = true;
  
      findPantheonRecords(ids.split(","))
        .then((records) => {
          if (active) {
            setResult({
              ids,
              records,
              error: null,
            });
          }
        })
        .catch((error) => {
          if (active) {
            setResult({
              ids,
              records: null,
              error: error.message,
            });
          }
        });
  
      return () => {
        active = false;
      };
    }, [ids]);
  
    const loading = result?.ids !== ids;
  
    const records =
      !loading && !result.error
        ? result.records
        : null;
  
    const hpiCandidates = people.filter((person) =>
      Number.isFinite(records?.[person.id]?.hpi)
    );
  
    const sitelinkLeaderHasHpi = Number.isFinite(
      records?.[people[0].id]?.hpi
    );
  
    const hpiLeader = hpiCandidates.reduce(
      (winner, person) =>
        !winner ||
        records[person.id].hpi > records[winner.id].hpi
          ? person
          : winner,
      null
    );
  
    return (
      <details className="city-discovery-note">
        <summary>
          Compare top {people.length} candidates
        </summary>
  
        {loading && <p>Checking Pantheon records...</p>}
  
        {!loading && result.error && (
          <p>Pantheon comparison unavailable.</p>
        )}
  
        {records && (
          <>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  fontSize: "12px",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>
                      Person
                    </th>
                    <th>Sitelinks</th>
                    <th>Languages</th>
                    <th>HPI</th>
                  </tr>
                </thead>
  
                <tbody>
                  {people.map((person) => {
                    const record = records[person.id];
  
                    return (
                      <tr key={person.id}>
                        <td>{person.name}</td>
  
                        <td style={{ textAlign: "right" }}>
                          {person.sitelinks}
                        </td>
  
                        <td style={{ textAlign: "right" }}>
                          {record?.languages ?? "—"}
                        </td>
  
                        <td style={{ textAlign: "right" }}>
                          {record?.hpi ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
  
            <p>
              {hpiCandidates.length} of {people.length}
              {" "}have Pantheon HPI data.
              {hpiLeader &&
                ` Highest HPI among those matched: ${hpiLeader.name}.`}
            </p>
  
            {hpiLeader && (
              <p>
                {!sitelinkLeaderHasHpi
                  ? "The sitelink leader has no Pantheon HPI, so direct agreement cannot be checked."
                  : hpiLeader.id === people[0].id
                    ? "Both rankings select the same leader within this group."
                    : "The two rankings select different leaders within this group."}
              </p>
            )}
  
            <p>
              Missing Pantheon data is not a score of zero.
              Neither ranking proves who is most famous.
            </p>
          </>
        )}
      </details>
    );
  }
  
  

export default function CityDiscoveryPanel({ city, onClose }) {
  const [result, setResult] = useState(null);
  const selectionKey = city?.id ?? city?.wikidataId;
  const canLookup = Boolean(city?.wikidataId || city?.geonameId);

  useEffect(() => {
    if (!city?.wikidataId && !city?.geonameId) return;
    const controller = new AbortController();
    const currentKey = city.id ?? city.wikidataId;

    async function search() {
      try {
        const link = city.wikidataId
          ? { status: "matched", wikidataId: city.wikidataId }
          : await resolveGeoNamesWikidata(city.geonameId, {
              signal: controller.signal,
            });

        if (link.status !== "matched") {
          if (!controller.signal.aborted) {
            setResult({ selectionKey: currentKey, status: link.status, people: [], error: null });
          }
          return;
        }

        const { people, mayBeTruncated } = await findBirthplaceCandidates(
          link.wikidataId,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setResult({
            selectionKey: currentKey,
            status: "matched",
            resolvedId: link.wikidataId,
            people,
            mayBeTruncated,
            error: null,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted && error.name !== "AbortError") {
          setResult({ selectionKey: currentKey, status: "error", people: [], error: error.message });
        }
      }
    }

    search();
    return () => controller.abort();
  }, [city?.id, city?.wikidataId, city?.geonameId]);

  if (!city) return null;

  const activeResult = result?.selectionKey === selectionKey ? result : null;
  const loading = canLookup && !activeResult;
  const people = !loading && !activeResult?.error ? activeResult?.people ?? [] : [];
  const person = people[0] ?? null;
  const alternatives = people.slice(1, 5);

  return (
    <aside
      className="city-discovery-panel"
      aria-label="City discovery"
    >
      <div className="city-discovery-heading">
        <div>
          <div className="city-discovery-eyebrow">
            BORN HERE · PROVISIONAL RANKING
          </div>

          <h2>{city.name}</h2>
          <p>{city.countryName || "Country unknown"}</p>
        </div>

        <button
          onClick={onClose}
          aria-label="Close city discovery"
        >
          ×
        </button>
      </div>

      {!canLookup && (
        <p>No Wikidata or GeoNames identifier is available for this location.</p>
      )}
      {city.geonameId && (
        <p className="city-discovery-note">
          GeoNames reference: <a href={`https://www.geonames.org/${city.geonameId}`} target="_blank" rel="noopener noreferrer">{city.geonameId}</a>
          {activeResult?.resolvedId && (
            <> · <a href={`https://www.wikidata.org/wiki/${activeResult.resolvedId}`} target="_blank" rel="noopener noreferrer">Wikidata location</a></>
          )}
        </p>
      )}

      {loading && (
        <p role="status">Looking up people born here...</p>
      )}

      {!loading && activeResult?.error && (
        <p role="alert">Location or birthplace lookup failed: {activeResult.error}</p>
      )}

      {!loading && activeResult?.status === "not-found" && (
        <p>No Wikidata location linked to this GeoNames ID was found. The town is still valid, but notable-person discovery is unavailable for it.</p>
      )}
      {!loading && activeResult?.status === "ambiguous" && (
        <p>More than one Wikidata location uses this GeoNames ID. Please verify the town before retrieving notable people.</p>
      )}

{!loading && activeResult?.status === "matched" && !activeResult.error && !person && (
        <p>No Wikidata birthplace matches were found for this location or its recorded sublocations.</p>
      )}


      {person && (
        <div className="city-discovery-person">
          <h3>{person.name}</h3>

          <p>{person.description}</p>

          <div className="city-discovery-score">
            <strong>{person.fameIndex}/100</strong>
            <span>
              Prototype fame index · {person.sitelinks} Wikimedia sitelinks
            </span>
          </div>

          <PantheonEvidence key={person.id} person={person} />

          {people.length > 1 && (
  <CandidateComparison
    people={people.slice(0, 5)}
  />
)}

{people.length > 1 && (
  <ReadershipComparison people={people} />
)}

<p className="city-discovery-note">
  {people.length} birthplace candidates returned
  {activeResult.mayBeTruncated
    ? " (50-result cap reached; more may exist)."
    : "."}
</p>

{alternatives.length > 0 && (
  <details className="city-discovery-note">
    <summary>Other candidates considered</summary>

    <ol>
      {alternatives.map((candidate) => (
        <li key={candidate.id}>
          <a
            href={candidate.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {candidate.name}
          </a>
          {" · "}
          {candidate.sitelinks} sitelinks
        </li>
      ))}
    </ol>
  </details>
)}
          <a
            href={person.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Wikidata record
          </a>
        </div>
      )}

      <p className="city-discovery-note">
        Results are provisional. Some birthplace records and notable people
        may be missing from the source datasets.
      </p>
    </aside>
  );
}
