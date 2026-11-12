# Milestone 12F — State/province boundaries

Source: Natural Earth 1:10m Admin-1 state/province **boundary lines**.

https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/

The original full GeoJSON source contains attributes and fine line geometry. The
converter strips attributes but does not simplify boundary paths. Natural Earth
is public-domain cartographic data and should not be treated as a legal survey.

## Setup

```sh
mkdir -p data-sources
curl -fL \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces_lines.geojson \
  -o data-sources/ne_10m_admin_1_states_provinces_lines.geojson

python3 scripts/build_admin1_boundaries.py \
  data-sources/ne_10m_admin_1_states_provinces_lines.geojson

ls -lh public/data/admin1-boundaries-10m.geojson
node --test src/utils/*.test.js
python3 -m unittest discover -s scripts -p 'test_*.py' -v
npm run lint
npm run build
npm run dev
```

The generated file `public/data/admin1-boundaries-10m.geojson` is loaded only
when the user approaches a regional/close-up viewing distance. The request is
cached after the first load. Existing country borders remain gold; Admin-1 lines
are thinner-looking pale blue, using standard WebGL 1px lines. Admin-1 lines
are for geographic context only; clicking still selects countries and towns.

## Limitations

- This source covers most but not all first-order divisions. Some small or
  contested regions are absent or represented according to a cartographic
  convention; these are not authoritative legal boundaries.
- Natural Earth Admin-2 is primarily US counties, so worldwide districts
  and counties would need a separate data source.
- The 10m linework may not perfectly align with the app's existing 50m country
  borders and 1024px land texture at extreme close-up.
- This release adds lines, not state name labels or state polygon selection.
