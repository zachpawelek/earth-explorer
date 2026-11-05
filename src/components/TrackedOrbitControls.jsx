import { useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import {
  getViewMetrics,
  MIN_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
} from "../utils/viewMetrics.js";

export default function TrackedOrbitControls({ onViewChange }) {
  const camera = useThree((state) => state.camera);

  // Update the camera's location and zoom information.
  const handleChange = useCallback(() => {
    onViewChange(getViewMetrics(camera.position));
  }, [camera, onViewChange]);

  // Calculate the initial view when the component mounts.
  useEffect(() => {
    handleChange();
  }, [handleChange]);

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