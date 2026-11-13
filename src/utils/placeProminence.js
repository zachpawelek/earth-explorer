// A stable, global measure of geographic prominence.  Population and civic
// roles determine relative importance; camera distance controls zoom scaling.
// The label and its dot always share one clickable PlacePairs element.
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function quantizeHalf(value) {
  return Math.round(value * 2) / 2;
}

export function getPlaceImportance(place) {
  const rawPopulation = Number(place?.population);
  const population = Number.isFinite(rawPopulation)
    ? Math.max(0, rawPopulation)
    : 0;

  // A logarithmic baseline: ~100 residents = 0; ~10 million = 1.
  // This never makes a city 100,000 times bigger than a village.
  const populationImportance = clamp01(
    (Math.log10(population + 1) - 2) / 5
  );

  // Capitals and administrative seats matter beyond their population.
  const civicImportance = place?.prominence === "major" ||
    place?.featureCode === "PPLC" ? 0.92 :
    place?.prominence === "medium" ||
    place?.featureCode === "PPLA" ? 0.76 :
    place?.featureCode === "PPLA2" ? 0.60 :
    place?.featureCode === "PPLA3" ? 0.45 :
    place?.featureCode === "PPLA4" ? 0.30 : 0;

  return Math.max(populationImportance, civicImportance);
}

export function getPlaceVisuals(place, cameraDistance) {
  const importance = getPlaceImportance(place);
  // A gentle non-linear curve pushes smaller places into the background
  // without making medium and major cities indistinguishable.
  const emphasis = Math.pow(importance, 1.35);
  const distance = Number.isFinite(cameraDistance)
    ? cameraDistance
    : 3;
  const altitude = Math.max(0.018, distance - 1);
  const zoom = clamp01(
    Math.log(3 / altitude) / Math.log(3 / 0.018)
  );

  return {
    // Deep zoom: ~10 px for a tiny village, ~18.5 px for a megacity.
    // Every label still grows as the camera approaches the surface.
    fontSize: quantizeHalf(7.5 + 6.5 * emphasis +
      (2.5 + 2 * emphasis) * zoom),
    // Deep zoom: ~3 px for tiny places, ~14.5 px for major cities.
    // Visual dot size does not control the clickable pair's padding.
    dotSize: quantizeHalf(2.5 + 10.5 * emphasis +
      1.5 * zoom * (0.3 + 0.7 * emphasis)),
    fontWeight: importance >= 0.75 ? 700 : importance >= 0.4 ? 600 : 400,
    tone: importance >= 0.75 ? "prominent" : importance < 0.35 ? "subtle" : "normal",
  };
}
