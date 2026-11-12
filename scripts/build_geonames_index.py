"""Create a compact GeoNames cities500 JSON catalog for the globe.

Input: data-sources/cities500.zip from https://download.geonames.org/export/dump/
Output: public/data/geonames-cities500.json
Source data © GeoNames, CC BY 4.0. This output is a modified derivative.
"""

import csv
import json
import math
import sys
import unicodedata
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAJOR = ROOT / "public/data/cities-110m.geojson"
OUTPUT = ROOT / "public/data/geonames-cities500.json"


def normalized_name(value):
    folded = unicodedata.normalize("NFKD", value.casefold())
    return "".join(character for character in folded if character.isalnum())


def major_city_coordinates(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    names = {}
    for feature in data["features"]:
        if feature.get("geometry", {}).get("type") != "Point":
            continue
        name = feature.get("properties", {}).get("NAME")
        coords = feature["geometry"].get("coordinates", [])
        if not name or len(coords) < 2:
            continue
        names.setdefault(normalized_name(name), []).append((coords[1], coords[0]))
    return names


def near_existing_major(name, latitude, longitude, majors):
    for other_lat, other_lon in majors.get(normalized_name(name), []):
        dy = (latitude - other_lat) * 111.2
        delta_lon = (longitude - other_lon + 180) % 360 - 180
        dx = delta_lon * 111.2 * math.cos(
            math.radians((latitude + other_lat) / 2)
        )
        if math.hypot(dx, dy) <= 8:
            return True
    return False


def build(source, output=OUTPUT, majors_path=MAJOR):
    majors = major_city_coordinates(majors_path)
    rows = []
    seen_ids = set()
    excluded = 0

    with zipfile.ZipFile(source) as archive:
        members = [name for name in archive.namelist() if name.endswith("cities500.txt")]
        if len(members) != 1:
            raise ValueError("Expected one cities500.txt inside the GeoNames ZIP")

        # GeoNames provides a UTF-8, 19-column, tab-separated table.
        import io
        with archive.open(members[0]) as raw:
            reader = csv.reader(io.TextIOWrapper(raw, encoding="utf-8"), delimiter="\t")
            for columns in reader:
                if len(columns) < 19:
                    continue
                geoname_id, name = columns[0], columns[1].strip()
                if not geoname_id.isdecimal() or not name:
                    continue
                if geoname_id in seen_ids:
                    continue
                if columns[6] != "P":
                    continue

                try:
                    latitude = float(columns[4])
                    longitude = float(columns[5])
                    population = max(0, int(columns[14]))
                except ValueError:
                    continue
                if not (
                    math.isfinite(latitude) and math.isfinite(longitude)
                    and -90 <= latitude <= 90 and -180 <= longitude <= 180
                ):
                    continue

                if near_existing_major(name, latitude, longitude, majors):
                    excluded += 1
                    continue

                seen_ids.add(geoname_id)
                rows.append([
                    int(geoname_id), name, round(latitude, 5), round(longitude, 5),
                    population, columns[8], columns[10], columns[7],
                ])

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps({
            "source": "GeoNames cities500",
            "license": "CC BY 4.0",
            "fields": ["geonameId", "name", "latitude", "longitude", "population", "countryCode", "admin1", "featureCode"],
            "places": rows,
        }, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"GeoNames places: {len(rows):,}; skipped near existing major cities: {excluded:,}")
    print(f"Output: {output} ({output.stat().st_size / 1048576:.1f} MiB)")
    return rows


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/build_geonames_index.py data-sources/cities500.zip")
    build(Path(sys.argv[1]))
