
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { latLonToCartesian } from "./utils/coordinates.js";
import Coastlines from "./components/Coastlines.jsx";
import "./index.css";
//import FirstTriangle from "./components/FirstTriangle.jsx";
import ContinentFill from "./components/ContinentFill.jsx";
import GlobeSurface from "./components/GlobeSurface.jsx";

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

  return (
    <Canvas
      camera={{ position: [0, 0, 3] }}
      frameloop="demand"
    >
      <ambientLight intensity={0.5} />

      <directionalLight
        position={[2, 3, 4]}
        intensity={2}
      />

      <GlobeSurface globeRef={globeRef} />
      

      {/* Components */}

      {/* <FirstTriangle /> */}
      {/* <ContinentFill />  */}
      <Coastlines />



      <axesHelper args={[1.8]} />
      <DebugMarkers globeRef={globeRef} />


      {/* Coming from Drei  */}

      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        enableDamping={false}
        minDistance={1.5}
        maxDistance={6}
      />
    </Canvas>
  );
}

export default App;
