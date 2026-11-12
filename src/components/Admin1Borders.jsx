import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { getAdmin1Opacity } from '../utils/adminBoundaryVisibility.js';
import {
  selectAdminTiles,
  loadAdminTileManifest,
  loadAdminTilePositions,
} from '../utils/adminBoundaryTiles.js';

function BoundaryTile({ positions, opacity }) {
  return (
    <lineSegments raycast={() => {}} frustumCulled>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#a9c4d9" transparent opacity={opacity}
        depthTest depthWrite={false} />
    </lineSegments>
  );
}

// Load and draw only the few geographic border tiles in the current view.
// No worldwide Admin-1 line geometry is sent to the GPU at once.
export default function Admin1Borders({ view }) {
  const fov = useThree(state => state.camera.fov ?? 75);
  const width = useThree(state => state.size.width);
  const height = useThree(state => state.size.height);
  const [manifest, setManifest] = useState(null);
  const [loaded, setLoaded] = useState({ key: '', tiles: [] });
  const opacity = getAdmin1Opacity(view.distance);
  const visible = opacity > 0;

  useEffect(() => {
    if (!visible || manifest) return;
    let active = true;
    loadAdminTileManifest().then(value => {
      if (active) setManifest(value);
    }).catch(error => {
      if (active) console.error('Could not load tiled Admin-1 boundaries:', error);
    });
    return () => { active = false; };
  }, [visible, manifest]);

  const selected = useMemo(() => selectAdminTiles(manifest, view, fov,
    width / Math.max(1, height)), [manifest, view, fov, width, height]);
  const key = selected.map(tile => tile.key).join(',');

  useEffect(() => {
    if (!visible || selected.length === 0) return;
    let active = true;
    Promise.allSettled(selected.map(async tile => ({
      key: tile.key,
      positions: await loadAdminTilePositions(tile.url),
    }))).then(results => {
      if (!active) return;
      const tiles = results.filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      setLoaded({key, tiles});
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('Could not load Admin-1 boundary tile:', result.reason);
        }
      }
    });
    return () => { active = false; };
  // `key` identifies the tile set; view changes within the same set need no reload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, key]);

  // Retain the previous nearby tiles while the next set downloads, avoiding
  // blank/flickering border outlines during a camera movement.
  if (!visible || selected.length === 0) return null;
  return (
    <group>
      {loaded.tiles.map(tile => (
        <BoundaryTile key={tile.key} positions={tile.positions} opacity={opacity}/>
      ))}
    </group>
  );
}
