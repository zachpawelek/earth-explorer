
import { useEffect, useState } from "react";
import { findMostNotablePerson } from "../utils/notablePeople.js";
import { findPantheonRecord } from "../utils/pantheonLookup.js";


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
  

export default function CityDiscoveryPanel({ city, onClose }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!city?.wikidataId) return;

    const controller = new AbortController();
    const cityId = city.wikidataId;

    findMostNotablePerson(cityId, {
      signal: controller.signal,
    })
      .then((person) => {
        if (!controller.signal.aborted) {
          setResult({ cityId, person, error: null });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== "AbortError") {
          setResult({
            cityId,
            person: null,
            error: error.message,
          });
        }
      });

    return () => controller.abort();
  }, [city?.wikidataId]);

  if (!city) return null;

  const loading =
    city.wikidataId && result?.cityId !== city.wikidataId;

  const person = !loading ? result?.person : null;

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

      {!city.wikidataId && (
        <p>No Wikidata identifier is available for this city.</p>
      )}

      {loading && (
        <p role="status">Looking up people born here...</p>
      )}

      {!loading &&
        result?.cityId === city.wikidataId &&
        result.error && (
          <p role="alert">
            Could not retrieve people: {result.error}
          </p>
        )}

      {!loading &&
        result?.cityId === city.wikidataId &&
        !result.error &&
        !person && (
          <p>No exact birthplace matches were found in Wikidata.</p>
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
        Ranked by Wikimedia sitelinks among exact birthplace matches.
        This is not a verified worldwide fame ranking; missing birthplace
        records can change the result.
      </p>
    </aside>
  );
}
