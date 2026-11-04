
import { DoubleSide } from "three";
import { latLonToCartesian } from "../utils/coordinates.js";

// Three geographic positions forming our test triangle.
// GeoJSON ordering: [longitude, latitude].
const TRIANGLE_COORDINATES = [
    [-20, -15],
    [20, -15],
    [0, 25],
  ];

// Convert each geographic position into Cartesian coordinates.
// A radius of 1.x puts the triangle slightly above our globe.
const positions = new Float32Array(
  TRIANGLE_COORDINATES.flatMap(([longitude, latitude]) =>
    latLonToCartesian(latitude, longitude, 1.12)
  )
);

export default function TestLandTriangle() {
  return (
    <mesh renderOrder={10}>
      <bufferGeometry>
        
        {/* Every vertex contains X, Y, and Z values. */}
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      {/* Use a solid green material to fill our triangle. */}
      <meshBasicMaterial
        color="#ffff00"
        side={DoubleSide}
        depthTest={false}
      />
    </mesh>
  );
}
