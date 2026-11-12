
import { useEffect, useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Vector3 } from "three";
import { markerRadiusForPixels, cityLabelFontSize } from "../utils/markerSizing.js";
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
  const markerRefs = useRef(new Map());
  const projected = useRef(new Vector3());

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

              // Relative marker prominence, converted to pixels when rendering.
              markerPixels: 1.6 + 1.1 * size,

              normal: latLonToCartesian(latitude, longitude, 1),

              markerPosition: latLonToCartesian(
                latitude,
                longitude,
                1.005
              ),

              labelPosition: latLonToCartesian(
                latitude,
                longitude,
                1.008
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
  const labeledCities = useMemo(() => {
    const priority = { major: 2, medium: 1, minor: 0 };
    return cities
      .filter((city) => labelIds.has(city.id))
      .sort((a, b) =>
        priority[b.prominence] - priority[a.prominence] ||
        b.population - a.population
      );
  }, [cities, labelIds]);

  // Size the markers in screen pixels and show only nonoverlapping labels.
  // Manipulate DOM/Three objects directly so camera movement doesn't cause
  // 243 React component updates for every mouse-wheel event.
  useFrame(({ camera, size: viewport }) => {
    const distance = camera.position.length();
    const horizon = 1 / distance;
    const fov = camera.fov ?? 75;

    for (const city of cities) {
      const marker = markerRefs.current.get(city.id);
      if (marker) {
        const radius = markerRadiusForPixels(
          distance, viewport.height, fov, city.markerPixels
        );
        marker.scale.setScalar(radius);
      }
    }

    const nextLimit = getLabelLimit(distance);
    if (nextLimit !== labelLimitRef.current) {
      labelLimitRef.current = nextLimit;
      setLabelLimit(nextLimit);
    }

    const occupied = [];
    const maxLabels = distance >= 3.2 ? 12 : distance >= 2 ? 24 : 40;

    for (const city of labeledCities) {
      const label = labelRefs.current.get(city.id);
      if (!label) continue;

      const [x, y, z] = city.normal;
      const facing = (
        x * camera.position.x +
        y * camera.position.y +
        z * camera.position.z
      ) / distance;

      // Normalize fade to the *current* visible horizon. At very close
      // zoom, (1 - horizon) is tiny, so a fixed 0.18 denominator would
      // accidentally hide every label, including one at screen center.
      const horizonFade = clamp01(
        (facing - horizon) / Math.max(0.001, (1 - horizon) * 0.35)
      );
      const zoomFade = city.prominence === "major" ? 1 :
        city.prominence === "medium" ? clamp01((5.5 - distance) / 1.5) :
        clamp01((4 - distance) / 1.5);
      const opacity = horizonFade * zoomFade;

      label.style.opacity = String(opacity);
      if (opacity < 0.1 || occupied.length >= maxLabels) {
        label.style.visibility = "hidden";
        continue;
      }

      projected.current.set(...city.labelPosition).project(camera);
      if (projected.current.z < -1 || projected.current.z > 1 ||
          Math.abs(projected.current.x) > 0.95 ||
          Math.abs(projected.current.y) > 0.95) {
        label.style.visibility = "hidden";
        continue;
      }

      const font = cityLabelFontSize(distance, city.prominence);
      const centerX = (projected.current.x + 1) * viewport.width / 2;
      const centerY = (1 - projected.current.y) * viewport.height / 2;
      const halfWidth = Math.max(15, city.name.length * font * 0.3 + 6);
      const halfHeight = font * 0.8 + 5;
      const bounds = {
        left: centerX - halfWidth, right: centerX + halfWidth,
        top: centerY - halfHeight, bottom: centerY + halfHeight,
      };

      const overlap = occupied.some((other) =>
        bounds.left < other.right && bounds.right > other.left &&
        bounds.top < other.bottom && bounds.bottom > other.top
      );

      if (overlap) {
        label.style.visibility = "hidden";
        continue;
      }

      occupied.push(bounds);
      label.style.fontSize = `${font.toFixed(1)}px`;
      label.style.visibility = "visible";
    }
  });

  return (
    <group>
      {cities.map((city) => (
        <group key={city.id}>
          {/* Every city keeps its clickable orange marker. */}
          <mesh
            position={city.markerPosition}
            scale={0.003}
            ref={(element) => {
              if (element) markerRefs.current.set(city.id, element);
              else markerRefs.current.delete(city.id);
            }}
            onClick={(event) => {
              event.stopPropagation();

              if (event.delta <= 5) {
                onCitySelect(city);
              }
            }}
          >
            <sphereGeometry args={[1, 8, 6]} />
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
