export default function Coastlines({
  positions,
  color = "#8fe0c0",
}) {
  if (!positions) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}