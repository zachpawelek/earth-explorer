import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import {
  getViewMetrics,
  MIN_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  getRotationSpeed,
  getZoomSpeed,
} from "../utils/viewMetrics.js";
import { interpolateGlobeFlight } from "../utils/globeFlight.js";

const FLIGHT_SECONDS = 1.2;
// Camera motion runs at full speed; React/UI updates can be much less frequent.
const VIEW_REPORT_INTERVAL_MS = 90;

export default function TrackedOrbitControls({ onViewChange, focusTarget }) {
  const { camera, invalidate } = useThree();
  const controlsRef = useRef(null);
  const flightRef = useRef(null);
  const lastReport = useRef(-Infinity);
  const trailingReport = useRef(null);

  const reportView = useCallback((force = false) => {
    const now = performance.now();
    if (force || now - lastReport.current >= VIEW_REPORT_INTERVAL_MS) {
      if (trailingReport.current !== null) {
        clearTimeout(trailingReport.current);
        trailingReport.current = null;
      }
      lastReport.current = now;
      onViewChange(getViewMetrics(camera.position));
    } else if (trailingReport.current === null) {
      trailingReport.current = setTimeout(() => {
        trailingReport.current = null;
        lastReport.current = performance.now();
        onViewChange(getViewMetrics(camera.position));
      }, Math.max(0, VIEW_REPORT_INTERVAL_MS - (now - lastReport.current)));
    }
  }, [camera, onViewChange]);

  const handleChange = useCallback(() => {
    const distance = camera.position.length();
    if (controlsRef.current) {
      controlsRef.current.rotateSpeed = getRotationSpeed(distance);
      controlsRef.current.zoomSpeed = getZoomSpeed(distance);
    }
    reportView();
  }, [camera, reportView]);

  useEffect(() => {
    reportView(true);
    return () => {
      if (trailingReport.current !== null) {
        clearTimeout(trailingReport.current);
        trailingReport.current = null;
      }
    };
  }, [reportView]);

  // Search results trigger a short, controlled move to the selected location.
  // User mouse/touch interaction immediately cancels the animation.
  useEffect(() => {
    if (!focusTarget) return;
    flightRef.current = {
      start: camera.position.clone(),
      destination: focusTarget,
      elapsed: 0,
    };
    invalidate();
  }, [focusTarget, camera, invalidate]);

  // The Canvas runs on-demand; request the next frame only while flying.
  useFrame((_, delta) => {
    const flight = flightRef.current;
    if (!flight) return;

    flight.elapsed = Math.min(FLIGHT_SECONDS, flight.elapsed + delta);
    camera.position.copy(interpolateGlobeFlight(
      flight.start, flight.destination, flight.elapsed / FLIGHT_SECONDS
    ));
    controlsRef.current?.update();

    if (flight.elapsed >= FLIGHT_SECONDS) {
      flightRef.current = null;
    } else {
      invalidate();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0, 0]}
      enablePan={false}
      enableDamping={false}
      rotateSpeed={getRotationSpeed(camera.position.length())}
      zoomSpeed={getZoomSpeed(camera.position.length())}
      minDistance={MIN_CAMERA_DISTANCE}
      maxDistance={MAX_CAMERA_DISTANCE}
      onStart={() => { flightRef.current = null; }}
      onChange={handleChange}
      onEnd={() => reportView(true)}
    />
  );
}
