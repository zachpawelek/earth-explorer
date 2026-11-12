# 12H — Fast state borders and reliable small-town picking

This replaces the old all-world `Admin1Borders` GPU geometry with **lazy
20° binary boundary chunks**; the source coastlines and country borders remain
untouched. Town selection now uses a 12 px-radius screen-space nearest-town
lookup against the displayed GeoNames markers (the globe receives pointer
click/move events). This removes the extra ~7,500 invisible town hit spheres.

## One-time boundary preprocessing (after applying this patch)

The 12F-generated source is reused; no new download is needed:

```sh
python3 scripts/build_admin1_tiles.py public/data/admin1-boundaries-10m.geojson
ls -lh public/data/admin1-tiles/manifest.json
```

If the source GeoJSON is missing, regenerate it using the 12F instructions:

```sh
python3 scripts/build_admin1_boundaries.py data-sources/ne_10m_admin_1_states_provinces_lines.geojson
```

The new runtime needs `public/data/admin1-tiles/manifest.json` and the
`*.bin` files in the same directory. The previous all-world GeoJSON is
no longer fetched by the browser; keep it as an input to the converter, or
remove it only after you have verified the new tiles are working.

Run:

```sh
node --test src/utils/*.test.js
python3 -m unittest discover -s scripts -p 'test_*.py' -v
npm run lint
npm run build
npm run preview
```

**Browser tests:** Drag and zoom around several countries with Admin-1
boundaries enabled; compare the production preview to 12G. Hover/click
small towns; check that the panel opens for a GeoNames town (even if that town
has no Wikidata match). Verify major-city discovery still works. Opening the
Network tab should show `/data/admin1-tiles/manifest.json` and nearby `.bin`
files instead of loading the entire `/data/admin1-boundaries-10m.geojson`.

If town selection opens a panel with “No Wikidata location linked,” that is a
**data linking limitation**, not a broken marker click. Those cases can be
improved later through a more comprehensive offline GeoNames→Wikidata join.
