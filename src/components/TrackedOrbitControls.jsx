
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  getViewMetrics,
  MIN_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
} from "../utils/viewMetrics.js";

export default function TrackedOrbitControls({ onViewChange }) {
    
  // Access the active Three.js camera.
  const { camera } = useThree();

  // Called whenever OrbitControls changes the camera.
  function handleChange() {
    onViewChange(getViewMetrics(camera.position));
  }

  return (
    <OrbitControls
      target={[0, 0, 0]}
      enablePan={false}
      enableDamping={false}
      minDistance={MIN_CAMERA_DISTANCE}
      maxDistance={MAX_CAMERA_DISTANCE}
      onChange={handleChange}
    />
  );
}
