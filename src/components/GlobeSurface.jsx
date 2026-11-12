
export default function GlobeSurface({ globeRef, texture, onGlobeClick, onGlobePointerMove, onGlobePointerOut }) {
    return (
      <mesh
        ref={globeRef}
        onClick={onGlobeClick}
        onPointerMove={onGlobePointerMove}
        onPointerOut={onGlobePointerOut}
        rotation={[0, -Math.PI / 2, 0]}
      >
        {/* Our spherical globe geometry. */}
        <sphereGeometry args={[1, 64, 48]} />
  
        {texture ? (
          // Display the prepared geographic texture.
          <meshStandardMaterial
            key="land"
            map={texture}
            color="#ffffff"
          />
        ) : (
          // Blue fallback during initial loading.
          <meshStandardMaterial
            key="ocean"
            color="#287e9b"
          />
        )}
      </mesh>
    );
  }
  