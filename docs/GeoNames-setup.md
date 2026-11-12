# GeoNames cities500 — Earth Explorer

## Build the local catalog

1. `mkdir -p data-sources`
2. `curl -fL https://download.geonames.org/export/dump/cities500.zip -o data-sources/cities500.zip`
3. `python3 scripts/build_geonames_index.py data-sources/cities500.zip`
4. Verify `public/data/geonames-cities500.json` exists and run `npm run dev`.

The original `cities500.zip` is intentionally ignored by Git. The JSON output is part of the app's build assets and should be committed when publishing, if repository size limits allow.

The existing Natural Earth 110m city layer remains. The old `towns-10m.json` is no longer needed; the new GeoNames catalog replaces that separate town layer.

## Display policy

Global scale: existing labeled cities only. Regional scale: up to 3,000 places near the camera, excluding places below population 10,000 except administrative seats. Close-up scale: up to 7,500 nearby places including small towns. The entire GeoNames list is available for spatial selection, but is never rendered as 185,000 meshes.

The full JSON is fetched once on first regional/close-up zoom. It can be relatively large; a future enhancement could split it into independently fetched geographic tiles.

## Notable people

GeoNames does not include Wikidata identifiers. On selection, the app tries to resolve `GeoNames geonameid` to Wikidata `P1566` via a single exact-ID SPARQL query. If the identifier has no matching item or resolves to multiple items, the app will not guess. For an unambiguous result, the existing birthplace query is reused.

## Data license

Populated-place data: © GeoNames, https://www.geonames.org/ — Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/ . The app uses a modified derived dataset and displays attribution. GeoNames data is provided as-is with no guarantee of accuracy, timeliness or completeness. This implementation omits alternate names and does not include every village or suburb.
