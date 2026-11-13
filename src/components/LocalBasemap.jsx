import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferGeometry, Float32BufferAttribute,
  SRGBColorSpace, TextureLoader,
} from 'three';
import {
  createLocalMapTileMeshData,
  localMapTileUrl,
  selectLocalMapTiles,
} from '../utils/localMapTiles.js';
import { createTileTextureCache } from '../utils/mapTileCache.js';

const API_KEY = import.meta.env.VITE_CARTO_BASEMAP_KEY?.trim();
const SETTLE_MS = 420;
const FADE_SECONDS = 0.42;
const loader = new TextureLoader();
loader.setCrossOrigin('anonymous');

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      resolve(texture);
    }, undefined, reject);
  });
}

// One store across the whole app lifetime: revisiting a location reuses GPU
// textures, and the store evicts only unused textures when its LRU is full.
const store = createTileTextureCache({ load: loadTexture });

function RasterTile({ item, renderOrder }) {
  const { tile, texture } = item;
  const geometry = useMemo(() => {
    const data = createLocalMapTileMeshData(tile);
    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(data.positions, 3));
    result.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
    result.setIndex(Array.from(data.indices));
    result.computeBoundingSphere();
    return result;
  }, [tile]);

  useEffect(() => {
    store.pin(tile.key);
    return () => store.unpin(tile.key);
  }, [tile.key]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} raycast={() => {}} renderOrder={renderOrder}>
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0}
        toneMapped={false}
        depthTest
        depthWrite={false}
      />
    </mesh>
  );
}

function TileLayer({ plan, groupRef, renderOrder }) {
  if (!plan) return null;
  return (
    <group ref={groupRef}>
      {plan.items.map(item => (
        <RasterTile key={item.tile.key} item={item} renderOrder={renderOrder} />
      ))}
    </group>
  );
}

function setGroupOpacity(group, opacity) {
  group?.traverse((child) => {
    if (child.isMesh && child.material) child.material.opacity = opacity;
  });
}

// Renders a complete settled tile view before swapping it onto the sphere.
// During a transition the old map stays underneath until the new one is ready.
export default function LocalBasemap({ view }) {
  const camera = useThree(state => state.camera);
  const size = useThree(state => state.size);
  const invalidate = useThree(state => state.invalidate);

  const [settledView, setSettledView] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSettledView({
        ...view,
        fov: camera.fov ?? 75,
        aspect: size.width / Math.max(1, size.height),
      });
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [view, camera.fov, size.width, size.height]);

  const requestedTiles = useMemo(
    () => API_KEY && settledView
      ? selectLocalMapTiles(settledView, {
        fov: settledView.fov,
        aspect: settledView.aspect,
      })
      : [],
    [settledView],
  );
  const requestedKey = requestedTiles.map(tile => tile.key).join('|');
  const requestedTilesRef = useRef(requestedTiles);
  useEffect(() => { requestedTilesRef.current = requestedTiles; }, [requestedTiles]);

  const [layers, setLayers] = useState({ front: null, back: null });
  const layersRef = useRef(layers);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const transitionRef = useRef(1);

  // This function is only called from effects / completed requests.
  function promote(plan) {
    const old = layersRef.current;
    if (old.front?.key === plan?.key) return;
    layersRef.current = { front: plan, back: old.front };
    transitionRef.current = 0;
    setLayers(layersRef.current);
    invalidate();
  }

  useEffect(() => {
    const controller = new AbortController();
    const tiles = requestedTilesRef.current;
    if (!API_KEY) return () => controller.abort();
    if (tiles.length === 0) {
      promote(null);
      return () => controller.abort();
    }

    const key = requestedKey;
    Promise.allSettled(tiles.map(async tile => ({
      tile,
      texture: await store.get(tile.key, localMapTileUrl(tile, API_KEY), {
        signal: controller.signal,
      }),
    }))).then((results) => {
      if (controller.signal.aborted) return;
      const items = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      // An incomplete replacement would create holes. Keep the previous view
      // instead; the ordinary globe remains usable if an API request fails.
      if (items.length !== tiles.length) {
        const limitHit = store.remaining === 0;
        console.warn(limitHit
          ? 'Local map browser-session request guard reached. Check CARTO dashboard for account totals.'
          : 'Some CARTO map tiles were unavailable; keeping the previous map view.');
        return;
      }
      promote({ key, items });
    });
    return () => controller.abort();
    // requestedKey is stable while moving within the same tile coverage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedKey, invalidate]);

  useFrame((_state, delta) => {
    if (transitionRef.current >= 1) return;
    transitionRef.current = Math.min(1,
      transitionRef.current + Math.min(0.05, delta) / FADE_SECONDS);
    const fraction = transitionRef.current;
    const eased = fraction * fraction * (3 - 2 * fraction);
    setGroupOpacity(frontRef.current, eased);
    setGroupOpacity(backRef.current, 1 - eased);
    if (fraction < 1) {
      invalidate();
    } else if (layersRef.current.back) {
      layersRef.current = { front: layersRef.current.front, back: null };
      setLayers(layersRef.current);
    }
  });

  useEffect(() => {
    setGroupOpacity(frontRef.current, transitionRef.current);
    setGroupOpacity(backRef.current, 1 - transitionRef.current);
    invalidate();
  }, [layers, invalidate]);

  return (
    <group>
      <TileLayer plan={layers.back} groupRef={backRef} renderOrder={-2} />
      <TileLayer plan={layers.front} groupRef={frontRef} renderOrder={-1} />
    </group>
  );
}
