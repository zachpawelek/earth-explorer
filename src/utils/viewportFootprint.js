
import {
    Raycaster,
    Sphere,
    Vector2,
    Vector3,
  } from "three";


  /*

  24 point approximation with binary search

  */
  
  // Match the radius of our existing globe.
  const GLOBE = new Sphere(new Vector3(0, 0, 0), 1);
  
  // Number of directions sampled around the screen.
  const BOUNDARY_SAMPLES = 24;
  
  // Accuracy of the search for each boundary.
  const SEARCH_STEPS = 16;
  
  const RAD_TO_DEG = 180 / Math.PI;
  
  // Convert a 3D surface point back to geographic coordinates.
  // This is the inverse of our existing latLonToCartesian().
  function pointToGeographic(point) {
    const length = point.length();
  
    return {
      latitude: Math.asin(point.y / length) * RAD_TO_DEG,
      longitude: Math.atan2(point.x, point.z) * RAD_TO_DEG,
    };
  }
  
  /*
   * Approximate the visible surface boundary using
   * screen-space rays.
   *
   * Assumption for this first implementation:
   * The camera points at the center of the globe.
   */
  export function getViewportFootprint(camera) {
    // Ensure the camera's position and orientation
    // are reflected in its world transformation matrix.
    camera.updateMatrixWorld(true);
  
    const raycaster = new Raycaster();
    const screenPoint = new Vector2();
    const intersection = new Vector3();
  
    // Cast a ray from the camera through a screen position.
    //
    // Screen coordinates are normalized:
    // x = -1 left, +1 right
    // y = -1 bottom, +1 top
    //
    // Returns true when the ray intersects Earth.
    function shootRay(x, y) {
      screenPoint.set(x, y);
  
      raycaster.setFromCamera(screenPoint, camera);
  
      return (
        raycaster.ray.intersectSphere(
          GLOBE,
          intersection
        ) !== null
      );
    }
  
    // STEP 1: Find the geographic point at screen center.
    if (!shootRay(0, 0)) {
      return {
        center: null,
        boundary: [],
        screenEdgeCount: 0,
        framing: "Off-globe",
      };
    }
  
    const center = pointToGeographic(intersection);
  
    const boundary = [];
    let screenEdgeCount = 0;
  
    // STEP 2: Look outward from screen center in
    // several directions, searching for the boundary
    // of visible geography.
    for (let i = 0; i < BOUNDARY_SAMPLES; i++) {
      const angle =
        (i / BOUNDARY_SAMPLES) * Math.PI * 2;
  
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
  
      // Maximum distance along this direction before
      // reaching the rectangular screen boundary.
      const edgeRadius = 1 / Math.max(
        Math.abs(dx),
        Math.abs(dy)
      );
  
      let radius = edgeRadius;
      let boundaryType = "screen";
  
      if (!shootRay(dx * radius, dy * radius)) {
        // The screen edge misses the globe.
        // Search between the center and the edge
        // for the last ray that still hits Earth.
        boundaryType = "horizon";
  
        let low = 0;
        let high = edgeRadius;
  
        for (let step = 0; step < SEARCH_STEPS; step++) {
          const middle = (low + high) / 2;
  
          if (shootRay(dx * middle, dy * middle)) {
            low = middle;
          } else {
            high = middle;
          }
        }
  
        radius = low;
  
        // Recalculate the actual intersection for
        // the final boundary position.
        shootRay(dx * radius, dy * radius);
  
      } else {
        // Geographic surface is still visible
        // at the edge of the screen.
        screenEdgeCount++;
      }
  
      // Store this boundary point in latitude/longitude.
      boundary.push({
        ...pointToGeographic(intersection),
        boundaryType,
      });
    }
  
    return {
      center,
      boundary,
      screenEdgeCount,
      framing:
        screenEdgeCount > 0
          ? "Screen-clipped"
          : "Horizon-limited",
    };
  }
  