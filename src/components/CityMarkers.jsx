
import { useEffect, useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { latLonToCartesian } from "../utils/coordinates.js";
import { loadGeoJSON } from "../utils/geographyCache.js";
import { getViewScale } from "../utils/viewScale.js";

const CITY_DATA_URL = "/data/cities-110m.geojson";

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function getProminence(properties, population) {
  const isCapital = Number(properties?.ADM0CAP) === 1;
  const isWorldCity = Number(properties?.WORLDCITY) === 1;

  if (population >= 5_000_000 || isWorldCity) return "major";
  if (population >= 1_000_000 || isCapital) return "medium";

  return "minor";
}

function getLabelLimit(cameraDistance) {
  const viewScale = getViewScale(cameraDistance);

  if (viewScale === "Global") return 25;
  if (viewScale === "Regional") return 60;

  return 120;
}

export default function CityMarkers({ onCitySelect }) {
  const [cities, setCities] = useState([]);
  const labelRefs = useRef(new Map());

  const [labelLimit, setLabelLimit] = useState(60);
  const labelLimitRef = useRef(60);

  // Load city data once when the component mounts.
  useEffect(() => {
    let active = true;

    loadGeoJSON(CITY_DATA_URL)
      .then((geojson) => {
        const loadedCities = geojson.features
          .filter((feature) => feature.geometry?.type === "Point")
          .map((feature) => {
            const [longitude, latitude] = feature.geometry.coordinates;
            const properties = feature.properties ?? {};

            const population = Math.max(
              0,
              Number(properties.POP_MAX) || 0
            );

            const prominence = getProminence(properties, population);

            const size = clamp01(
              (Math.log10(population + 1) - 4) / 4
            );

            return {
              id: String(
                properties.NE_ID ??
                  `${properties.NAME}-${longitude}-${latitude}`
              ),
              name: properties.NAME,
              longitude,
              latitude,
              prominence,
              population,
              wikidataId: properties.WIKIDATAID || null,
              countryName: properties.ADM0NAME || null,

              // Smaller orange markers, scaled by population.
              markerRadius: 0.004 + 0.0045 * size,

              normal: latLonToCartesian(latitude, longitude, 1),

              markerPosition: latLonToCartesian(
                latitude,
                longitude,
                1.025
              ),

              labelPosition: latLonToCartesian(
                latitude,
                longitude,
                1.05
              ),
            };
          })
          .filter(
            (city) =>
              typeof city.name === "string" &&
              Number.isFinite(city.longitude) &&
              Number.isFinite(city.latitude)
          );

        if (active) {
          setCities(loadedCities);
          console.log(`Loaded ${loadedCities.length} city markers`);
        }
      })
      .catch((error) => {
        console.error("Could not load cities:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  // Rank cities and choose which ones receive text labels.
  // Recalculate only when the city list or label limit changes.
  const labelIds = useMemo(() => {
    const priority = {
      major: 2,
      medium: 1,
      minor: 0,
    };

    const rankedCities = [...cities].sort((a, b) => {
      const prominenceDifference =
        priority[b.prominence] - priority[a.prominence];

      return prominenceDifference || b.population - a.population;
    });

    const selectedCities = rankedCities.slice(0, labelLimit);

    return new Set(selectedCities.map((city) => city.id));
  }, [cities, labelLimit]);

  // Only process the cities that have text labels.
  const labeledCities = useMemo(
    () => cities.filter((city) => labelIds.has(city.id)),
    [cities, labelIds]
  );

  // Adjust label visibility as the globe rotates and zooms.
  useFrame(({ camera }) => {
    const distance = camera.position.length();
    const horizon = 1 / distance;

    const nextLimit = getLabelLimit(distance);

    // Update React state only when entering a new zoom range.
    if (nextLimit !== labelLimitRef.current) {
      labelLimitRef.current = nextLimit;
      setLabelLimit(nextLimit);
    }

    for (const city of labeledCities) {
      const label = labelRefs.current.get(city.id);
      if (!label) continue;

      const [x, y, z] = city.normal;

      const facing =
        (
          x * camera.position.x +
          y * camera.position.y +
          z * camera.position.z
        ) / distance;

      // Fade labels as they approach the globe's horizon.
      const horizonFade = clamp01(
        (facing - horizon) / 0.18
      );

      // Less prominent cities require closer zoom.
      const zoomFade =
        city.prominence === "major"
          ? 1
          : city.prominence === "medium"
            ? clamp01((5.5 - distance) / 1.5)
            : clamp01((4 - distance) / 1.5);

      const opacity = horizonFade * zoomFade;

      label.style.opacity = String(opacity);
      label.style.visibility =
        opacity < 0.01 ? "hidden" : "visible";
    }
  });

  return (
    <group>
      {cities.map((city) => (
        <group key={city.id}>
          {/* Every city keeps its clickable orange marker. */}
          <mesh
            position={city.markerPosition}
            onClick={(event) => {
              event.stopPropagation();

              if (event.delta <= 5) {
                onCitySelect(city);
              }
            }}
          >
            <sphereGeometry args={[city.markerRadius, 10, 10]} />
            <meshBasicMaterial color="#ff9f43" />
          </mesh>

          {/* Only selected cities receive an HTML text label. */}
          {labelIds.has(city.id) && (
            <Html
              center
              position={city.labelPosition}
              style={{ pointerEvents: "none" }}
            >
              <span
                ref={(element) => {
                  if (element) {
                    labelRefs.current.set(city.id, element);
                  } else {
                    labelRefs.current.delete(city.id);
                  }
                }}
                className={`city-label city-label--${city.prominence}`}
              >
                {city.name}
              </span>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}
