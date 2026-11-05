
import { useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import {
  getViewMetrics,
  MIN_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
} from "../utils/viewMetrics.js";

import {
  getViewportFootprint,
} from "../utils/viewportFootprint.js";

export default function TrackedOrbitControls({
  onViewChange,
}) {
  // Access the active camera and canvas dimensions.
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  // Recalculate geographic information whenever
  // the camera changes.
  const handleChange = useCallback(() => {

    // Existing camera distance and zoom calculations.
    const metrics = getViewMetrics(camera.position);

    // NEW: Calculate the visible geographic footprint.
    const footprint = getViewportFootprint(camera);

    // Send everything to App.jsx in one state update.
    onViewChange({
      ...metrics,
      footprint,
    });

  }, [camera, onViewChange]);

  // Calculate the footprint on initial mount and
  // again if the canvas dimensions change.
  useEffect(() => {
    handleChange();
  }, [handleChange, width, height]);

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
