
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import "./index.css";

/*
  CANVAS : Creates and manages a scene, camera, and WebGL renderer
  MESH: Object in the scene -> combines geometry with material 
  MESH-STANDARD-MATERIAL: Object's appearance and how it responds to lighting 





*/ 


function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3] }}
      frameloop="demand"
    >
      <ambientLight intensity={0.7} />

      <directionalLight
        position={[2, 3, 4]}
        intensity={2}
      />

      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#287e9b" />
      </mesh>

      <axesHelper args={[1.8]} />

      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        enableDamping={true}
        minDistance={1.5}
        maxDistance={6}
      />
    </Canvas>
  );
}

export default App;
