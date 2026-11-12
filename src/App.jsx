
import { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import Coastlines from "./components/Coastlines.jsx";
import "./index.css";
import GlobeSurface from "./components/GlobeSurface.jsx";
import TrackedOrbitControls from "./components/TrackedOrbitControls.jsx";
import ViewHUD from "./components/ViewHUD.jsx";
import { getViewMetrics } from "./utils/viewMetrics.js";
import { getViewScale } from "./utils/viewScale.js";
import { GEOGRAPHY_SOURCES } from "./utils/geographySources.js";
import { useGeographyLayers } from "./hooks/useGeographyLayers.js";
import CountryBorders from "./components/CountryBorders.jsx";
import Admin1Borders from "./components/Admin1Borders.jsx";
import { loadGeoJSON } from "./utils/geographyCache.js";
import { findCountryName } from "./utils/countryLookup.js";
import CityMarkers from "./components/CityMarkers.jsx";
import TownMarkers from "./components/TownMarkers.jsx";
import CityDiscoveryPanel from "./components/CityDiscoveryPanel.jsx";
import PlaceSearch from "./components/PlaceSearch.jsx";


function App() {
  const globeRef = useRef(null);
  const townPickerRef = useRef(null);


const [countries, setCountries] = useState(null);
const [countryLoadError, setCountryLoadError] = useState(false);
const [selectedCountry, setSelectedCountry] = useState(undefined);
const [selectedCity, setSelectedCity] = useState(null);
const [focusTarget, setFocusTarget] = useState(null);

useEffect(() => {
  let active = true;

  loadGeoJSON("/data/countries-50m.geojson")
    .then((data) => {
      if (active) setCountries(data.features);
    })
    .catch((error) => {
      console.error("Country lookup data failed:", error);
      if (active) setCountryLoadError(true);
    });

  return () => {
    active = false;
  };
}, []);


  const [view, setView] = useState(() =>
    getViewMetrics({ x: 0, y: 0, z: 3 })
  );
  // Determine which datasets correspond to the current camera scale.
    const viewScale = getViewScale(view.distance);
    const geographySource = GEOGRAPHY_SOURCES[viewScale];

    // Prepare land and coastline data as one coordinated pair.
  const {
    rendered,
    isLoading,
    error,
    } = useGeographyLayers(geographySource);



    function handleGlobeClick(event) {
      // Pick the nearest visible town using screen pixels, even when its
      // rendered dot is only 2–3 pixels wide.
      if (event.delta > 5) return;
      const pickedTown = townPickerRef.current?.pick(event);
      if (pickedTown) {
        event.stopPropagation();
        handleCitySelect(pickedTown);
        return;
      }
      if (!countries) return;
    
      const { x, y, z } = event.point;
      const radius = Math.hypot(x, y, z);
    
      const latitude =
        Math.asin(y / radius) * 180 / Math.PI;
    
      const longitude =
        Math.atan2(x, z) * 180 / Math.PI;
    
      const countryName = findCountryName(
        countries,
        longitude,
        latitude
      );
    
      setSelectedCountry(countryName);
      setSelectedCity(null);
    }

    function handleCitySelect(city) {
      const countryName = countries
        ? findCountryName(countries, city.longitude, city.latitude)
        : city.countryName;
      setSelectedCity({ ...city, countryName: countryName || city.countryName });
      setSelectedCountry(countryName);
    }

    function handleSearchSelect(place) {
      // Use the exact GeoNames identifier for small-place discovery rather
      // than guessing a Wikidata entity from a potentially shared name.
      handleCitySelect(place);
      setFocusTarget({ latitude: place.latitude, longitude: place.longitude });
    }

  return (
    <div className="globe-layout">
    <Canvas
      camera={{ position: [0, 0, 3], near: 0.002, far: 30 }}
      frameloop="demand"
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.5} />

      <directionalLight
        position={[2, 3, 4]}
        intensity={2}
      />

      <GlobeSurface
        globeRef={globeRef}
        texture={rendered?.texture ?? null}
        onGlobeClick={handleGlobeClick}
        onGlobePointerMove={(event) => townPickerRef.current?.hover(event)}
        onGlobePointerOut={() => townPickerRef.current?.clearHover()}
      />
      

      {/* Components */}

      {/* <FirstTriangle /> */}
      {/* <ContinentFill />  */}
      <Coastlines
        positions={rendered?.positions ?? null}
      />
      <CityMarkers onCitySelect={handleCitySelect} />
      <TownMarkers view={view} viewScale={viewScale} pickerRef={townPickerRef} />

      <Admin1Borders view={view} />
      <CountryBorders />




      {/* Coming from Drei  */}
      <TrackedOrbitControls onViewChange={setView} focusTarget={focusTarget} />
    </Canvas>


    <PlaceSearch onSelect={handleSearchSelect} />

    <CityDiscoveryPanel
    city={selectedCity}
    onClose={() => setSelectedCity(null)}
    />


    {/* OUTSIDE of Canvas -> bc HUD is ordinary HTML rather than a 3d Object   */}
    <ViewHUD
      view={view}
      datasetResolution={rendered?.detail ?? "—"}
      isLoading={isLoading}
      loadError={error}
      selectedCountry={selectedCountry}
      countryDataReady={countries !== null}
      countryLoadError={countryLoadError}
      selectedCity={selectedCity}
    />
      <div className="data-attribution">
        Additional populated places: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a>
        {" · "}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
        {" · "}Modified for Earth Explorer
      </div>
    </div>
  );
}

export default App;
