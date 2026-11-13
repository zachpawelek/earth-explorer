# Milestone 12N — Smooth CARTO basemap, readable detail, and request guard

No new packages or datasets are needed. Keep the CARTO API key in `.env.local` as
`VITE_CARTO_BASEMAP_KEY=...`, **not** in source files or Git. A Vite browser
variable is visible to visitors; protect it by using CARTO dashboard Referer
restrictions. Use a separate, restricted key for localhost where practical.
Since a key appeared in a chat, rotate it before public deployment.

## What changed

- The green/blue globe remains visible while the first nearby image set loads.
- The completed local map is **fully opaque**; roads and water are no longer
  washed out by the underlying simple globe.
- The old tile set remains visible while a replacement is loading. Once every
  replacement tile is ready, the two sets crossfade over ~0.42 seconds.
- New tile plans are calculated only after a 420ms pause in camera updates,
  preventing bursts of downloads during quick rotation or wheel zoom.
- Small zoom steps avoid the old jump from zoom 8 directly to zoom 10.
- Each settled view requests at most **48 tiles**; the selector falls back to
  a coarser level in wider views.
- At most **3 tile requests** start concurrently. Completed textures are reused
  and the cache retains at most **96 entries**, disposing only unpinned textures.
- An additional **180 attempted tile loads per browser tab session** are
  allowed by the local guard. Reloading the page in the same tab keeps the count
  in `sessionStorage`. When exhausted, the basic globe and labels still work,
  but new road tiles are not requested in that tab session.

These numbers are intentionally conservative, and can be tuned in
`src/utils/mapTileCache.js` and `src/utils/localMapTiles.js`.

## Check session usage

In Chrome DevTools > Console, run:

```js
Number(sessionStorage.getItem('earth-explorer.carto-tile-attempts.v1') || 0)
```

This is a local **attempt count**, not a precise measurement of CARTO's billable
requests. Browser caching and other visitors affect the provider's totals.
The code does **not** guarantee an account-wide monthly cap, because each user
has their own browser session and key usage is aggregated across your account.

Go to https://dashboard.basemaps.carto.com/ to review account-level usage and
key restrictions. According to CARTO's published terms in November 2026,
noncommercial free use is limited to 5,000,000 requests per UTC calendar month;
commercial free use is limited to 1,000,000. The key owner's e-mail says usage
is aggregated across keys and CARTO sends a warning at 80%.
If you expect significant traffic, set up server-side or provider-side quota
controls before a public launch; frontend limits alone aren't sufficient.

A rough, **upper-bound** calculation if every session used all 180 attempts:
5,000,000 / 180 ≈ 27,700 sessions/month noncommercial, or
1,000,000 / 180 ≈ 5,500 sessions/month commercial. These are *not traffic
forecasts* or a guarantee of staying within quota, since other key usage
counts too and multiple browser tabs can have separate counters.

## Verify

```bash
node --test src/utils/*.test.js
npm run lint
npm run build
npm run preview
```

In the browser, test initial zoom-in, camera motion, zooming back out, and
returning to the same town. The old map should remain until replacement imagery
is available, and returning to a visited region should reuse cached textures.
Inspect Network > Img (filter `cartocdn`) to watch requests. Avoid sharing the
full tile URLs because the query string contains the browser-exposed key.

CARTO/OpenStreetMap attribution remains in `App.jsx` and must remain visible.
