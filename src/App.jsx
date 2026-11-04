
import { useRef, useState } from "react";
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

  const [view, setView] = useState(() =>
    getViewMetrics({ x: 0, y: 0, z: 3 })
  );
  // Determine which datasets correspond to the current camera scale.
    const viewScale = getViewScale(view.distance);
    const geographySource = GEOGRAPHY_SOURCES[viewScale];



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
          landUrl={geographySource.landUrl}
      />
      

      {/* Components */}

      {/* <FirstTriangle /> */}
      {/* <ContinentFill />  */}
      <Coastlines
          coastlineUrl={geographySource.coastlineUrl}
      />



      <axesHelper args={[1.8]} />
      <DebugMarkers globeRef={globeRef} />


      {/* Coming from Drei  */}
      <TrackedOrbitControls onViewChange={setView} />
    </Canvas>


    {/* OUTSIDE of Canvas -> bc HUD is ordinary HTML rather than a 3d Object   */}
    <ViewHUD 
      view={view} 
      datasetResolution={geographySource.detail}
    />
    </div>
  );
}

export default App;
