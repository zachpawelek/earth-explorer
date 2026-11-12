"""Strip display-only 10m Natural Earth Admin-1 linework into compact GeoJSON.

No geographic simplification is performed: retaining the original line vertices
avoids reshaping small boundaries at close zoom. Coordinate rounding is limited
to 5 decimal places (~1 m in latitude).
"""

import json
import math
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT_ROOT / "public" / "data" / "admin1-boundaries-10m.geojson"


def valid_point(coordinates):
    if not isinstance(coordinates, (list, tuple)) or len(coordinates) < 2:
        return None

    longitude, latitude = coordinates[:2]
    if (not isinstance(longitude, (int, float))
            or not isinstance(latitude, (int, float))
            or isinstance(longitude, bool)
            or isinstance(latitude, bool)
            or not math.isfinite(longitude)
            or not math.isfinite(latitude)
            or not -180 <= longitude <= 180
            or not -90 <= latitude <= 90):
        return None

    return [round(longitude, 5), round(latitude, 5)]


def compact_boundaries(data):
    if data.get("type") != "FeatureCollection":
        raise ValueError("Expected a GeoJSON FeatureCollection")

    paths = []
    for feature in data.get("features", []):
        geometry = feature.get("geometry") or {}
        kind = geometry.get("type")
        if kind == "LineString":
            lines = [geometry.get("coordinates", [])]
        elif kind == "MultiLineString":
            lines = geometry.get("coordinates", [])
        else:
            continue

        for line in lines:
            cleaned = []
            for raw_point in line:
                point = valid_point(raw_point)
                if point is None:
                    if len(cleaned) >= 2:
                        paths.append(cleaned)
                    cleaned = []
                elif not cleaned or point != cleaned[-1]:
                    cleaned.append(point)
            if len(cleaned) >= 2:
                paths.append(cleaned)

    if not paths:
        raise ValueError("No valid Admin-1 boundary lines were found")

    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiLineString",
                "coordinates": paths,
            },
        }],
    }, len(paths)


def build_index(source, output=OUTPUT):
    with source.open("r", encoding="utf-8") as stream:
        data = json.load(stream)

    compact, line_count = compact_boundaries(data)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(compact, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Saved {line_count:,} internal boundary paths")
    print(f"Output: {output} ({output.stat().st_size / 1024 / 1024:.2f} MiB)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: python3 scripts/build_admin1_boundaries.py "
            "data-sources/ne_10m_admin_1_states_provinces_lines.geojson"
        )
    build_index(Path(sys.argv[1]))
