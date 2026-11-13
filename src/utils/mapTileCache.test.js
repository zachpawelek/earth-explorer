import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSessionTileBudget,
  createTileTextureCache,
  MAX_TILE_ATTEMPTS_PER_SESSION,
} from './mapTileCache.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

test('session budget persists across recreated guards and rejects over limit', () => {
  const storage = fakeStorage();
  const one = createSessionTileBudget({ limit: 2, storage });
  assert.equal(one.claim(), true);
  const two = createSessionTileBudget({ limit: 2, storage });
  assert.equal(two.used, 1);
  assert.equal(two.claim(), true);
  assert.equal(two.claim(), false);
  assert.equal(two.used, 2);
  assert.equal(MAX_TILE_ATTEMPTS_PER_SESSION, 180);
});

test('cache reuses an existing texture without claiming another request', async () => {
  let calls = 0;
  const budget = createSessionTileBudget({ limit: 2, storage: fakeStorage() });
  const cache = createTileTextureCache({
    budget,
    load: async () => { calls += 1; return { dispose() {} }; },
  });
  const [a, b] = await Promise.all([
    cache.get('a', 'url'), cache.get('a', 'url'),
  ]);
  assert.equal(a, b);
  assert.equal(await cache.get('a', 'url'), a);
  assert.equal(calls, 1);
  assert.equal(cache.used, 1);
});

test('queue never exceeds concurrency and aborted queued requests spend no budget', async () => {
  const pending = [];
  let active = 0;
  let peak = 0;
  const budget = createSessionTileBudget({ limit: 10, storage: fakeStorage() });
  const cache = createTileTextureCache({
    budget,
    maxConcurrent: 1,
    load: () => new Promise(resolve => {
      active++;
      peak = Math.max(peak, active);
      pending.push(() => { active--; resolve({ dispose() {} }); });
    }),
  });

  const first = cache.get('one', 'url1');
  const controller = new AbortController();
  const cancelled = cache.get('two', 'url2', { signal: controller.signal });
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  await new Promise(resolve => setTimeout(resolve, 0));
  pending.shift()();
  await first;
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(peak, 1);
  assert.equal(budget.used, 1);
});

test('LRU evicts unused textures but never a pinned texture', async () => {
  const disposed = [];
  const cache = createTileTextureCache({
    maxEntries: 2,
    budget: createSessionTileBudget({ limit: 10, storage: fakeStorage() }),
    load: async url => ({ dispose: () => disposed.push(url) }),
  });
  await cache.get('a', 'a');
  cache.pin('a');
  await cache.get('b', 'b');
  await cache.get('c', 'c');
  assert.ok(!disposed.includes('a'));
  assert.ok(disposed.includes('b'));
  cache.unpin('a');
  await cache.get('d', 'd');
  assert.ok(cache.cached <= 2);
});

test('request guard prevents additional tile loads after quota', async () => {
  const cache = createTileTextureCache({
    budget: createSessionTileBudget({ limit: 1, storage: fakeStorage() }),
    load: async () => ({ dispose() {} }),
  });
  await cache.get('a', 'a');
  await assert.rejects(cache.get('b', 'b'), /guard reached/);
  assert.equal(cache.used, 1);
});
