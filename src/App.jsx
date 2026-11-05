
import { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { latLonToCartesian } from "./utils/coordinates.js";
import Coastlines from "./components/Coastlines.jsx";
import "./index.css";
//import FirstTriangle from "./components/FirstTriangle.jsx";
import ContinentFill from "./components/ContinentFill.jsx";
import GlobeSurface from "./components/GlobeSurface.jsx";
import TrackedOrbitControls from "./components/TrackedOrbitControls.jsx";
import ViewHUD from "./components/ViewHUD.jsx";
import { getViewMetrics } from "./utils/viewMetrics.js";
import { Html } from "@react-three/drei";
import { getViewScale } from "./utils/viewScale.js";
import { GEOGRAPHY_SOURCES } from "./utils/geographySources.js";
import { useGeographyLayers } from "./hooks/useGeographyLayers.js";
import CountryBorders from "./components/CountryBorders.jsx";
import { loadGeoJSON } from "./utils/geographyCache.js";
import { findCountryName } from "./utils/countryLookup.js";



const DEBUG_LOCATIONS = [
  { name: "Front", lat: 0, lon: 0, color: "#ff4d6d" },
  { name: "East", lat: 0, lon: 90, color: "#49e3a5" },
  { name: "West", lat: 0, lon: -90, color: "#ffad42" },
  { name: "North", lat: 90, lon: 0, color: "#ffe066" },
  { name: "South", lat: -90, lon: 0, color: "#b38cff" },
  { name: "Back", lat: 0, lon: 180, color: "#f472d0" },
  {
    name: "Madison",
    lat: 43.0731,
    lon: -89.4012,
    color: "#ffffff",
  },
];

function DebugMarkers({ globeRef }) {
  return DEBUG_LOCATIONS.map((location) => {
    const position = latLonToCartesian(location.lat, location.lon, 1.1);

    return (
      <group key={location.name} position={position}>
        {/* Colored marker */}
        <mesh>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color={location.color} />
        </mesh>

        {/* Text label */}
        <Html
          center
          occlude={[globeRef]}
          pointerEvents="none"
        >
          <div className="marker-label">
            {location.name}
          </div>
        </Html>
      </group>
    );
  });
}

function App() {
  const globeRef = useRef(null);


const [countries, setCountries] = useState(null);
const [countryLoadError, setCountryLoadError] = useState(false);
const [selectedCountry, setSelectedCountry] = useState(undefined);

useEffect(() => {
  let active = true;

  loadGeoJSON("/data/countries-50m.geojson")
    .then((data) => {
      if (active) setCountries(data.features);
    })
    .catch((error) => {
      console.error("Country lookup data failed:", error);
      if (active) setCountryLoadError(true);
    });

  return () => {
    active = false;
  };
}, []);


  const [view, setView] = useState(() =>
    getViewMetrics({ x: 0, y: 0, z: 3 })
  );
  // Determine which datasets correspond to the current camera scale.
    const viewScale = getViewScale(view.distance);
    const geographySource = GEOGRAPHY_SOURCES[viewScale];

    // Prepare land and coastline data as one coordinated pair.
  const {
    rendered,
    isLoading,
    error,
    } = useGeographyLayers(geographySource);



    function handleGlobeClick(event) {
      // Ignore dragging or clicks before country data is loaded.
      if (event.delta > 5 || !countries) return;
    
      const { x, y, z } = event.point;
      const radius = Math.hypot(x, y, z);
    
      const latitude =
        Math.asin(y / radius) * 180 / Math.PI;
    
      const longitude =
        Math.atan2(x, z) * 180 / Math.PI;
    
      const countryName = findCountryName(
        countries,
        longitude,
        latitude
      );
    
      setSelectedCountry(countryName);
    }
    


  return (
    <div className="globe-layout">
    <Canvas
      camera={{ position: [0, 0, 3] }}
      frameloop="demand"
    >
      <ambientLight intensity={0.5} />

      <directionalLight
        position={[2, 3, 4]}
        intensity={2}
      />

      <GlobeSurface
        globeRef={globeRef}
        texture={rendered?.texture ?? null}
        onGlobeClick={handleGlobeClick}
      />
      

      {/* Components */}

      {/* <FirstTriangle /> */}
      {/* <ContinentFill />  */}
      <Coastlines
        positions={rendered?.positions ?? null}
      />

      <CountryBorders />



      <axesHelper args={[1.8]} />
      <DebugMarkers globeRef={globeRef} />


      {/* Coming from Drei  */}
      <TrackedOrbitControls onViewChange={setView} />
    </Canvas>


    {/* OUTSIDE of Canvas -> bc HUD is ordinary HTML rather than a 3d Object   */}
    <ViewHUD
      view={view}
      datasetResolution={rendered?.detail ?? "—"}
      isLoading={isLoading}
      loadError={error}
      selectedCountry={selectedCountry}
      countryDataReady={countries !== null}
      countryLoadError={countryLoadError}
    />
    </div>
  );
}

export default App;
