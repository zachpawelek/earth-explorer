
// Geographic datasets available to Earth Explorer.
//
// Global uses the simplified 110m data.
// Regional and Close-up currently share the 50m data.
//
// Later, Close-up will use more detailed datasets.

export const GEOGRAPHY_SOURCES = {
    Global: {
      detail: "110m",
      landUrl: "/data/land.geojson",
      coastlineUrl: "/data/coastlines.geojson",
    },
  
    Regional: {
      detail: "50m",
      landUrl: "/data/land-50m.geojson",
      coastlineUrl: "/data/coastlines-50m.geojson",
    },
  
    "Close-up": {
      detail: "50m",
      landUrl: "/data/land-50m.geojson",
      coastlineUrl: "/data/coastlines-50m.geojson",
    },
  };
  