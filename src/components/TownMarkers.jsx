import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Object3D, Vector3 } from "three";
import { latLonToCartesian } from "../utils/coordinates.js";
import { isTownFacingCamera } from "../utils/townCatalog.js";
import { markerRadiusForPixels, localTownFontSize } from "../utils/markerSizing.js";
import {
  buildGeoNamesCatalog,
  geoViewKey,
  selectGeoNamesPlaces,
} from "../utils/geonamesCatalog.js";

const DATA_URL = "/data/geonames-cities500.json";
const MESH_CAPACITY = 7500;

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left &&
    a.top < b.bottom && a.bottom > b.top;
}

export default function TownMarkers({ view, viewScale, onCitySelect }) {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);
  const meshRef = useRef(null);
  const markerDummy = useRef(new Object3D());
  const lastMarkers = useRef({ list: null, radius: -1 });
  const [catalog, setCatalog] = useState(null);
  const [hovered, setHovered] = useState(null);

  // Defer loading the large catalog until the camera reaches regional scale.
  useEffect(() => {
    if (viewScale === "Global" || catalog) return;
    const controller = new AbortController();
    fetch(DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`GeoNames HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!controller.signal.aborted) {
          const nextCatalog = buildGeoNamesCatalog(payload.places ?? []);
          setCatalog(nextCatalog);
          console.info(`GeoNames: loaded ${nextCatalog.count} places`);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.error("GeoNames loading failed:", error);
      });
    return () => controller.abort();
  }, [viewScale, catalog]);

  const viewKey = geoViewKey(view);
  const quantizedView = useMemo(() => {
    const [lat, lon, altitudeBucket] = viewKey.split(":").map(Number);
    return {
      latitude: lat,
      longitude: lon,
      distance: 1 + Math.exp(altitudeBucket / 12),
    };
  }, [viewKey]);

  const visibleTowns = useMemo(
    () => selectGeoNamesPlaces(catalog, quantizedView, viewScale),
    [catalog, quantizedView, viewScale]
  );

  // Only recompute thousands of instance matrices when candidate places change
  // or their screen-pixel radius would change meaningfully.
  useFrame(({ camera: activeCamera, size }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const baseRadius = markerRadiusForPixels(
      activeCamera.position.length(), size.height, activeCamera.fov ?? 75, 1
    );
    const previous = lastMarkers.current;
    if (previous.list === visibleTowns &&
        Math.abs(baseRadius - previous.radius) <= baseRadius * 0.07) return;

    const marker = markerDummy.current;
    for (let index = 0; index < visibleTowns.length; index += 1) {
      const town = visibleTowns[index];
      const prominence = Math.min(1, Math.log10(town.population + 1) / 7);
      const radius = baseRadius * (1.25 + 0.65 * prominence);
      marker.position.set(...latLonToCartesian(town.latitude, town.longitude, 1.005));
      marker.scale.setScalar(radius);
      marker.updateMatrix();
      mesh.setMatrixAt(index, marker.matrix);
    }
    mesh.count = visibleTowns.length;
    mesh.instanceMatrix.needsUpdate = true;
    lastMarkers.current = { list: visibleTowns, radius: baseRadius };
  });

  // Automatically reveal a few nearby town names once the user reaches a
  // genuinely local scale. All other towns remain accessible on hover.
  const localLabels = useMemo(() => {
    if (viewScale !== "Close-up" || quantizedView.distance > 1.26) return [];

    const maxLabels = quantizedView.distance < 1.075 ? 32 :
      quantizedView.distance < 1.15 ? 20 : 10;
    const font = localTownFontSize(quantizedView.distance);
    const labels = [];
    const occupied = [];
    const point = new Vector3();

    camera.updateMatrixWorld();
    for (const town of visibleTowns) {
      point.set(...latLonToCartesian(town.latitude, town.longitude, 1.010))
        .project(camera);
      if (point.z < -1 || point.z > 1 ||
          Math.abs(point.x) > 0.91 || Math.abs(point.y) > 0.91) continue;

      const x = (1 + point.x) * viewport.width / 2;
      const y = (1 - point.y) * viewport.height / 2;
      const halfWidth = Math.max(28, town.name.length * font * 0.3 + 11);
      const halfHeight = font + 8;
      const box = {
        left: x - halfWidth, right: x + halfWidth,
        top: y - halfHeight, bottom: y + halfHeight,
      };
      if (occupied.some((other) => overlaps(box, other))) continue;

      occupied.push(box);
      labels.push(town);
      if (labels.length >= maxLabels) break;
    }
    return labels;
  }, [visibleTowns, quantizedView, viewScale, camera, viewport.width, viewport.height]);

  function getTownAtPointer(event) {
    const town = visibleTowns[event.instanceId];
    return town && isTownFacingCamera(town, camera.position) ? town : null;
  }

  const activeHover = hovered && visibleTowns.some((town) => town.id === hovered.id)
    ? hovered : null;
  const hoverHasLabel = activeHover && localLabels.some((town) => town.id === activeHover.id);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MESH_CAPACITY]}
        frustumCulled={false}
        onPointerMove={(event) => {
          const town = getTownAtPointer(event);
          if (town) event.stopPropagation();
          setHovered((previous) => previous?.id === town?.id ? previous : town);
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(event) => {
          if (event.delta > 5) return;
          const town = getTownAtPointer(event);
          if (!town) return;
          event.stopPropagation();
          onCitySelect(town);
        }}
      >
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color="#ffd08a" />
      </instancedMesh>

      {localLabels.map((town) => (
        <Html
          key={town.id}
          center
          position={latLonToCartesian(town.latitude, town.longitude, 1.010)}
          style={{ pointerEvents: "none" }}
        >
          <span
            className="local-town-label"
            style={{ fontSize: `${localTownFontSize(quantizedView.distance)}px` }}
          >
            {town.name}
          </span>
        </Html>
      ))}

      {activeHover && !hoverHasLabel && (
        <Html
          center
          position={latLonToCartesian(activeHover.latitude, activeHover.longitude, 1.011)}
          style={{ pointerEvents: "none" }}
        >
          <span
            className="town-hover-label"
            style={{ fontSize: `${localTownFontSize(quantizedView.distance)}px` }}
          >
            {activeHover.name}
          </span>
        </Html>
      )}
    </group>
  );
}
