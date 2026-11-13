# Milestone 12M — Detailed local basemap (roads, parks, lakes)

This optional close-up layer adds OpenStreetMap-based geography beneath the existing clickable Earth Explorer place labels.
It uses CARTO Voyager **without** built-in map labels, so no extra location names appear unpaired with a dot.

## Setup

1. Get your own CARTO basemap API key: https://carto.com/basemaps/apikey/
2. In the project root, create `.env.local` (already git-ignored):

   ```
   VITE_CARTO_BASEMAP_KEY=your_key_here
   ```

3. Restart the Vite development server, then zoom closer than camera distance 1.20. The layer fades in gradually.
4. Check browser Network for `basemaps.cartocdn.com/rastertiles/voyager_nolabels/…` and a 200 image response.

The API key is visible in the browser. Restrict it to your deployed origins using the provider's key settings. Do not put private server credentials in Vite variables. The provider may limit or charge for tile traffic beyond its current allowance.

## Architecture

- `src/utils/localMapTiles.js`: pure Web Mercator conversion, bounded viewport selection, adaptive detail, curved geometry, tests.
- `src/components/LocalBasemap.jsx`: loads only the visible tile images and disposes their GPU resources when they leave view.
- `src/App.jsx`: mounts the basemap between the globe surface and existing place labels, and provides visible CARTO/OSM attribution when enabled.

This is a *raster visual layer*, not a road-routing dataset or a new navigation engine. It does not change the already working country, state, name/dot pairing, portraits, or famous-person discovery.

## Performance and policy

- Maximum 72 requested tiles per view; resolution falls back when necessary.
- Requests are triggered only for the currently viewed area; no bulk downloading or prefetching.
- At global zoom the layer is disabled entirely.
- Web browser caching handles previously fetched imagery; each unmounted tile's GPU texture is disposed.
- Avoid using OSM Foundation's donated `tile.openstreetmap.org` service for bulk/high-load production use.

## Verification

```bash
node --test src/utils/*.test.js
npm run lint
npm run build
npm run dev
```

Check: global globe unchanged; at local zoom see roads, green areas and waters; clicking city names and dots still opens discovery; border lines remain visible; globe remains responsive; map data appears only after adding a key.
