import { Quaternion, Vector3 } from "three";
import { latLonToCartesian } from "./coordinates.js";

export const SEARCH_ARRIVAL_DISTANCE = 1.14;

export function interpolateGlobeFlight(startPosition, destination, fraction) {
  const t = Math.max(0, Math.min(1, fraction));
  const eased = t * t * (3 - 2 * t); // gentle start and stop
  const start = new Vector3(startPosition.x, startPosition.y, startPosition.z);
  const startDistance = start.length();
  const arrival = new Vector3(...latLonToCartesian(
    destination.latitude, destination.longitude, 1
  ));
  const direction = start.normalize();
  const arc = new Quaternion().setFromUnitVectors(direction, arrival);
  const partialArc = new Quaternion().identity().slerp(arc, eased);
  const distance = startDistance +
    (SEARCH_ARRIVAL_DISTANCE - startDistance) * eased;

  return direction.applyQuaternion(partialArc).multiplyScalar(distance);
}
