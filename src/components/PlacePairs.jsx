import { useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { latLonToCartesian } from "../utils/coordinates.js";
import { loadGeoJSON } from "../utils/geographyCache.js";
import {
  buildGeoNamesCatalog,
  geoViewKey,
  loadGeoNamesRows,
  selectGeoNamesPlaces,
} from "../utils/geonamesCatalog.js";
import { layoutPlacePairs, samePlacePairs } from "../utils/placePairLayout.js";

const CITY_URL = "/data/cities-110m.geojson";
const MARKER_RADIUS = 1.006;

function loadMajorPlaces(features) {
  return features
    .filter((feature) => feature.geometry?.type === "Point")
    .map((feature) => {
      const props = feature.properties ?? {};
      const [longitude, latitude] = feature.geometry.coordinates;
      const population = Math.max(0, Number(props.POP_MAX) || 0);
      const prominence = population >= 5_000_000 || Number(props.WORLDCITY) === 1
        ? "major" : population >= 1_000_000 || Number(props.ADM0CAP) === 1
          ? "medium" : "minor";
      return {
        id: `major-${props.NE_ID ?? `${props.NAME}-${latitude}-${longitude}`}`,
        kind: "major", name: props.NAME, latitude, longitude, population,
        prominence, countryName: props.ADM0NAME || null,
        wikidataId: /^Q[1-9]\d*$/.test(props.WIKIDATAID) ? props.WIKIDATAID : null,
      };
    })
    .filter((place) => typeof place.name === "string" &&
      Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
    .sort((a, b) => {
      const importance = { major: 2, medium: 1, minor: 0 };
      return importance[b.prominence] - importance[a.prominence] ||
        b.population - a.population;
    });
}

// Replaces separate dot and label layers with a *single* selectable UI unit.
// If collision detection rejects the name, the dot is not rendered either.
export default function PlacePairs({ view, viewScale, selectedCity, onCitySelect }) {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);
  const [majorCities, setMajorCities] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [pairs, setPairs] = useState([]);
  const projected = useRef(new Vector3());
  const previousUpdate = useRef(-Infinity);

  useEffect(() => {
    let mounted = true;
    loadGeoJSON(CITY_URL)
      .then((data) => {
        if (mounted) setMajorCities(loadMajorPlaces(data.features ?? []));
      })
      .catch((error) => console.error("Major city catalog failed:", error));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (viewScale === "Global" || catalog) return;
    let mounted = true;
    loadGeoNamesRows()
      .then((rows) => {
        if (mounted) setCatalog(buildGeoNamesCatalog(rows));
      })
      .catch((error) => console.error("GeoNames catalog failed:", error));
    return () => { mounted = false; };
  }, [viewScale, catalog]);

  const key = geoViewKey(view);
  const quantizedView = useMemo(() => {
    const [latitude, longitude, bucket] = key.split(":").map(Number);
    return { latitude, longitude, distance: 1 + Math.exp(bucket / 12) };
  }, [key]);

  const visibleTowns = useMemo(() =>
    selectGeoNamesPlaces(catalog, quantizedView, viewScale, {
      fov: camera.fov ?? 75,
      aspect: viewport.width / Math.max(1, viewport.height),
    }),
  [catalog, quantizedView, viewScale, camera.fov, viewport.width, viewport.height]);

  // Ensure even a very short mouse gesture gets a final settled layout.
  useEffect(() => { previousUpdate.current = -Infinity; }, [view, majorCities, visibleTowns, selectedCity]);

  useFrame(({ clock, camera: activeCamera, size }) => {
    // Labels are lightweight, but laying out thousands of candidate places
    // every WebGL frame isn't. Re-plan ~10 times/sec; Html follows the camera
    // between updates without React rerendering the entire layout.
    const now = clock.elapsedTime * 1000;
    if (now - previousUpdate.current < 100) return;
    previousUpdate.current = now;

    const distance = activeCamera.position.length();
    const horizon = 1 / distance;
    activeCamera.updateMatrixWorld();
    const point = projected.current;

    const upcoming = layoutPlacePairs({
      featured: selectedCity ? {
        ...selectedCity,
        kind: selectedCity.geonameId ? "town" : "major",
        prominence: selectedCity.prominence ?? "minor",
      } : null,
      majorCities,
      towns: visibleTowns.slice(0, 1500),
      scale: viewScale,
      distance,
      width: size.width,
      height: size.height,
      project(place) {
        const [nx, ny, nz] = latLonToCartesian(place.latitude, place.longitude);
        const facing = (nx * activeCamera.position.x +
          ny * activeCamera.position.y +
          nz * activeCamera.position.z) / distance;
        if (facing <= horizon + 0.0005) return null;
        point.set(nx * MARKER_RADIUS, ny * MARKER_RADIUS, nz * MARKER_RADIUS);
        point.project(activeCamera);
        if (point.z < -1 || point.z > 1 ||
            Math.abs(point.x) > 1.02 || Math.abs(point.y) > 1.02) return null;
        return {
          x: (point.x + 1) * size.width / 2,
          y: (1 - point.y) * size.height / 2,
        };
      },
    });

    setPairs((previous) => samePlacePairs(previous, upcoming) ? previous : upcoming);
  });

  return (
    <group>
      {pairs.map((place) => (
        <Html
          key={place.id}
          position={latLonToCartesian(place.latitude, place.longitude, MARKER_RADIUS)}
          zIndexRange={[6, 1]}
          style={{ pointerEvents: "none" }}
        >
          <button
            type="button"
            className={`place-pair place-pair--${place.tone}${selectedCity?.id === place.id ? " place-pair--selected" : ""}`}
            style={{
              fontSize: `${place.fontSize}px`,
              fontWeight: place.fontWeight,
              "--dot-size": `${place.dotSize}px`,
              "--dot-half": `${place.dotSize / 2}px`,
              pointerEvents: "auto",
            }}
            aria-label={`Explore ${place.name}`}
            title={place.countryName ? `${place.name}, ${place.countryName}` : place.name}
            onClick={(event) => {
              event.stopPropagation();
              onCitySelect(place);
            }}
          >
            <span className="place-pair__dot" aria-hidden="true" />
            <span className="place-pair__name">{place.name}</span>
          </button>
        </Html>
      ))}
    </group>
  );
}
