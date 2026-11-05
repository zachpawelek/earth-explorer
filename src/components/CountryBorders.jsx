
import { useEffect, useState } from "react";
import Coastlines from "./Coastlines.jsx";
import { loadCoastlinePositions } from "../utils/coastlinePositionsCache.js";

const BORDERS_URL = "/data/country-borders-50m.geojson";

export default function CountryBorders() {
  const [positions, setPositions] = useState(null);

  useEffect(() => {
    let active = true;

    loadCoastlinePositions(BORDERS_URL)
      .then((data) => {
        if (active) setPositions(data);
      })
      .catch((error) => {
        console.error("Could not load country borders:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  return <Coastlines positions={positions} color="#ffd166" />;
}
