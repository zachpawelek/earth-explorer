import { Canvas } from "@react-three/fiber";


/*
  CANVAS : Creates and manages a scene, camera, and WebGL renderer
  MESH: Object in the scene -> combines geometry with material 
  MESH-STANDARD-MATERIAL: Object's appearance and how it responds to lighting 


*/ 






function App() {
  return (
    <Canvas camera={{ position: [0, 0, 3] }}>
      <ambientLight intensity={0.5} />

      <directionalLight
        position={[2, 3, 4]}
        intensity={2}
      />

      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#287e9b" />
      </mesh>
    </Canvas>
  );
}

export default App;