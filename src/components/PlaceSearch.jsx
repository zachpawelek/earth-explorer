import { useEffect, useMemo, useRef, useState } from "react";
import { loadGeoJSON } from "../utils/geographyCache.js";
import { loadGeoNamesRows } from "../utils/geonamesCatalog.js";
import { buildPlaceSearchIndex, searchPlaces } from "../utils/placeSearch.js";

export default function PlaceSearch({ onSelect }) {
  const containerRef = useRef(null);
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [index, setIndex] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activated) return;
    let active = true;

    Promise.all([
      loadGeoNamesRows(),
      loadGeoJSON("/data/cities-110m.geojson"),
    ])
      .then(([rows, cities]) => {
        if (active) setIndex(buildPlaceSearchIndex(rows, cities.features ?? []));
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });

    return () => { active = false; };
  }, [activated]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const results = useMemo(
    () => index && query === debouncedQuery
      ? searchPlaces(index, debouncedQuery)
      : [],
    [index, query, debouncedQuery]
  );

  function selectPlace(place) {
    onSelect(place);
    setQuery(place.name);
    setOpen(false);
  }

  return (
    <div className="place-search" ref={containerRef}>
      <label className="place-search-label" htmlFor="earth-place-search">
        Find a place
      </label>
      <input
        id="earth-place-search"
        type="search"
        placeholder="Search cities and small towns…"
        autoComplete="off"
        value={query}
        onFocus={(event) => {
          event.target.select();
          setActivated(true);
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && results.length) {
            event.preventDefault();
            selectPlace(results[0]);
          }
        }}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && query.trim().length >= 2}
        aria-controls="earth-place-results"
      />
      {open && query.trim().length >= 2 && (
        <div id="earth-place-results" className="place-search-results" role="listbox">
          {!index && !error && <p>Loading place catalog…</p>}
          {error && <p role="alert">Couldn't load places: {error}</p>}
          {index && results.length === 0 && <p>No matching places found.</p>}
          {index && results.map((place) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              className="place-search-result"
              key={place.id}
              onClick={() => selectPlace(place)}
            >
              <span>{place.name}</span>
              <small>
                {[place.admin1, place.countryName].filter(Boolean).join(", ")}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
