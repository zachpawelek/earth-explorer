import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Object3D } from "three";
import { latLonToCartesian } from "../utils/coordinates.js";
import { isTownFacingCamera } from "../utils/townCatalog.js";
import {
  buildGeoNamesCatalog,
  geoViewKey,
  selectGeoNamesPlaces,
} from "../utils/geonamesCatalog.js";

const DATA_URL = "/data/geonames-cities500.json";
const MESH_CAPACITY = 7500;

export default function TownMarkers({ view, viewScale, onCitySelect }) {
  const camera = useThree((state) => state.camera);
  const meshRef = useRef(null);
  const [catalog, setCatalog] = useState(null);
  const [hovered, setHovered] = useState(null);

  // Delay the large download until the user zooms in for the first time.
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
    const [lat, lon, distance] = viewKey.split(":").map(Number);
    return { latitude: lat * 2, longitude: lon * 2, distance: distance / 10 };
  }, [viewKey]);

  const visibleTowns = useMemo(
    () => selectGeoNamesPlaces(catalog, quantizedView, viewScale),
    [catalog, quantizedView, viewScale],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const marker = new Object3D();
    for (let index = 0; index < visibleTowns.length; index += 1) {
      const town = visibleTowns[index];
      const size = Math.min(1, Math.log10(town.population + 1) / 7);
      const radius = 0.0014 + 0.0016 * size;
      marker.position.set(...latLonToCartesian(town.latitude, town.longitude, 1.018));
      marker.scale.setScalar(radius);
      marker.updateMatrix();
      mesh.setMatrixAt(index, marker.matrix);
    }
    mesh.count = visibleTowns.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [visibleTowns]);

  function getTownAtPointer(event) {
    const town = visibleTowns[event.instanceId];
    return town && isTownFacingCamera(town, camera.position) ? town : null;
  }

  const activeHover = hovered && visibleTowns.some((town) => town.id === hovered.id)
    ? hovered : null;

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

      {activeHover && (
        <Html
          center
          position={latLonToCartesian(activeHover.latitude, activeHover.longitude, 1.05)}
          style={{ pointerEvents: "none" }}
        >
          <span className="town-hover-label">{activeHover.name}</span>
        </Html>
      )}
    </group>
  );
}
