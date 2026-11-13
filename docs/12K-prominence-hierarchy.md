# 12K — Population-aware dot and name sizes

The 12J one-dot/one-name rule remains unchanged. The only difference is that
both elements now share a zoom-aware *visual prominence* value derived from
population and GeoNames administrative-seat roles.

- Larger populations produce larger visible dots and label text.
- National and administrative capitals receive a prominence floor even when
  their recorded population is small.
- Smaller towns remain legible and clickable; a place is still either shown
  as one complete pair or not shown at all.
- All labels grow smoothly with zoom; even the smallest locations get a
  readable ~10.5 px label at close-up.
- Collision checks reserve the correct variable-sized name/dot footprint;
  searching, flying to a place, country borders, and notable-person discovery
  remain untouched.

Only the following files change: `PlacePairs.jsx`, `placePairLayout.js`,
`placeProminence.js`, CSS, and relevant tests. No new dependencies or datasets.

Run `node --test src/utils/*.test.js`, `npm run lint`, and `npm run build`.

If you want to fine-tune appearance, adjust the four constants in
`getPlaceVisuals()` in `placeProminence.js` rather than changing the
renderer. No changes to data or selection logic are required.
