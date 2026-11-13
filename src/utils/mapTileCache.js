// Small, bounded raster-tile cache and browser-session usage guard.
// Session counts are local estimates, NOT provider-account billing totals.
export const TILE_BUDGET_STORAGE_KEY = 'earth-explorer.carto-tile-attempts.v1';
export const MAX_TILE_ATTEMPTS_PER_SESSION = 180;
export const MAX_CACHED_TILE_TEXTURES = 96;
export const MAX_CONCURRENT_TILE_REQUESTS = 3;

function abortError() {
  const error = new Error('Tile request no longer needed');
  error.name = 'AbortError';
  return error;
}

export function createSessionTileBudget({
  limit = MAX_TILE_ATTEMPTS_PER_SESSION,
  storage = typeof sessionStorage === 'undefined' ? null : sessionStorage,
  storageKey = TILE_BUDGET_STORAGE_KEY,
} = {}) {
  let used = 0;
  try {
    const stored = Number(storage?.getItem(storageKey));
    if (Number.isSafeInteger(stored) && stored > 0) used = stored;
  } catch {
    // Browsers can disable session storage. Keep the in-memory guard.
  }

  return {
    get used() { return used; },
    get remaining() { return Math.max(0, limit - used); },
    get limit() { return limit; },
    claim() {
      if (used >= limit) return false;
      used += 1;
      try { storage?.setItem(storageKey, String(used)); } catch { /* storage disabled */ }
      return true;
    },
  };
}

// load(url) returns a Promise<THREE.Texture>. The cache owns texture disposal;
// mounted meshes pin their textures so an LRU eviction cannot dispose them.
export function createTileTextureCache({
  load,
  budget = createSessionTileBudget(),
  maxEntries = MAX_CACHED_TILE_TEXTURES,
  maxConcurrent = MAX_CONCURRENT_TILE_REQUESTS,
} = {}) {
  if (typeof load !== 'function') throw new TypeError('A tile texture loader is required');

  const entries = new Map();
  const queue = [];
  let active = 0;

  function touch(key, entry) {
    entries.delete(key);
    entries.set(key, entry);
  }

  function evictUnused() {
    if (entries.size <= maxEntries) return;
    for (const [key, entry] of entries) {
      if (entries.size <= maxEntries) break;
      if (entry.status !== 'ready' || entry.pins !== 0 || entry.waiters !== 0) continue;
      entries.delete(key);
      entry.texture?.dispose?.();
    }
  }

  function pump() {
    while (active < maxConcurrent && queue.length) {
      const entry = queue.shift();
      if (entry.waiters === 0) {
        entries.delete(entry.key);
        entry.reject(abortError());
        continue;
      }
      if (!budget.claim()) {
        entries.delete(entry.key);
        entry.reject(new Error('CARTO tile request guard reached for this browser session'));
        continue;
      }

      active += 1;
      entry.status = 'loading';
      Promise.resolve()
        .then(() => load(entry.url))
        .then((texture) => {
          entry.status = 'ready';
          entry.texture = texture;
          entry.resolve(texture);
        })
        .catch((error) => {
          if (entries.get(entry.key) === entry) entries.delete(entry.key);
          entry.reject(error);
        })
        .finally(() => {
          active -= 1;
          evictUnused();
          pump();
        });
    }
  }

  function get(key, url, { signal } = {}) {
    if (signal?.aborted) return Promise.reject(abortError());

    let entry = entries.get(key);
    if (!entry) {
      entry = {
        key, url, status: 'queued', pins: 0, waiters: 0, texture: null,
      };
      entry.promise = new Promise((resolve, reject) => {
        entry.resolve = resolve;
        entry.reject = reject;
      });
      entries.set(key, entry);
      queue.push(entry);
    } else {
      touch(key, entry);
    }

    entry.waiters += 1;
    const promise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', cancel);
        entry.waiters -= 1;
        callback(value);
      };
      const cancel = () => finish(reject, abortError());
      signal?.addEventListener('abort', cancel, { once: true });
      entry.promise.then(
        (texture) => finish(resolve, texture),
        (error) => finish(reject, error),
      );
      if (signal?.aborted) cancel();
    });
    pump();
    return promise;
  }

  function pin(key) {
    const entry = entries.get(key);
    if (!entry || entry.status !== 'ready') return;
    entry.pins += 1;
    touch(key, entry);
  }

  function unpin(key) {
    const entry = entries.get(key);
    if (!entry) return;
    entry.pins = Math.max(0, entry.pins - 1);
    evictUnused();
  }

  return {
    get, pin, unpin,
    get used() { return budget.used; },
    get remaining() { return budget.remaining; },
    get cached() { return entries.size; },
  };
}
