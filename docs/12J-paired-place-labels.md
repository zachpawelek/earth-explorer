# 12J — One visible dot for every visible name

Replace the independent CityMarkers and TownMarkers layers with `PlacePairs`.
Every rendered place is a **single clickable HTML button** containing its own
small marker and attached name. The two halves cannot be independently hidden
or mis-selected.

The shared `layoutPlacePairs` function sorts major cities first (or a selected
location first), projects places into screen coordinates and accepts a pair
only if its entire label fits on-screen without overlapping a previously
accepted pair. An excluded place has no visible dot. More places become
eligible as zoom increases. The full GeoNames catalog remains searchable.

Benefits:
- No anonymous orange dots and no unattached name labels.
- One collision policy across major cities and GeoNames, eliminating separate
  label-layer conflicts.
- Clicking either the dot or the text selects the exact associated place.
- Maximum 22/42/52–85 visible pairs at global/regional/local zoom;
  no thousands of DOM labels or separate invisible hit meshes.
- Existing search, fly-to, country borders and notable-person panel stay intact.

Tradeoff: showing only named places means some markers are hidden when their
labels cannot fit. Users can zoom farther in or use place search to discover
those locations. The labels may briefly change during fast camera motion as
the collision layout refreshes approximately every 100 ms.

Check after applying:

```sh
node --test src/utils/*.test.js
npm run lint
npm run build
npm run preview
```

Zoom in and out over densely populated areas, verify every shown dot has its
adjacent name, click both dot and name, and confirm no doubled major-city and
GeoNames labels. Check that searching for a town still flies to it and opens
its existing discovery panel even if its marker was previously hidden.
