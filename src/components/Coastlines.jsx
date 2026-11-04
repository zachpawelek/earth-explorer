
export default function Coastlines({ positions }) {

  // No geometry is available during the initial load.
  if (!positions) {
    return null;
  }

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      <lineBasicMaterial color="#8fe0c0" />
    </lineSegments>
  );
}
