"""Create a compact list of additional towns from Natural Earth 10m GeoJSON.

Run after downloading ne_10m_populated_places.geojson into data-sources/.
The existing 110m city list is excluded to prevent duplicate markers.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAJOR = ROOT / "public/data/cities-110m.geojson"
OUTPUT = ROOT / "public/data/towns-10m.json"
QID = re.compile(r"Q[1-9][0-9]*")


def identifier(properties):
    value = properties.get("NE_ID")
    if value is None:
        return None
    if isinstance(value, (int, float)) and float(value).is_integer():
        return str(int(value))
    return str(value)


def wikidata_id(properties):
    raw = str(properties.get("WIKIDATAID") or "")
    return raw if QID.fullmatch(raw) else None


def build(source, output=OUTPUT, majors_path=MAJOR):
    majors = json.loads(majors_path.read_text(encoding="utf-8"))["features"]
    known_ids = {identifier(f["properties"]) for f in majors}
    known_qids = {wikidata_id(f["properties"]) for f in majors}
    known_qids.discard(None)

    data = json.loads(source.read_text(encoding="utf-8"))
    towns = []
    for feature in data["features"]:
        if feature.get("geometry", {}).get("type") != "Point":
            continue
        props = feature.get("properties") or {}
        coordinates = feature["geometry"].get("coordinates") or []
        if len(coordinates) < 2:
            continue
        longitude, latitude = coordinates[:2]
        name = props.get("NAME")
        if not isinstance(name, str) or not name.strip():
            continue
        if not isinstance(longitude, (int, float)) or not -180 <= longitude <= 180:
            continue
        if not isinstance(latitude, (int, float)) or not -90 <= latitude <= 90:
            continue

        ne_id = identifier(props)
        qid = wikidata_id(props)
        if (ne_id and ne_id in known_ids) or (qid and qid in known_qids):
            continue

        try:
            rank = int(props.get("SCALERANK", 10))
        except (TypeError, ValueError):
            rank = 10
        try:
            population = max(0, int(float(props.get("POP_MAX") or 0)))
        except (TypeError, ValueError):
            population = 0

        town_id = ne_id or f"{longitude}-{latitude}"
        towns.append({
            "id": f"town-{town_id}",
            "name": name.strip(),
            "latitude": latitude,
            "longitude": longitude,
            "population": population,
            "rank": rank,
            "wikidataId": qid,
            "countryName": props.get("ADM0NAME"),
        })

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(towns, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Created {len(towns)} additional town markers: {output}")
    print(f"With Wikidata ID: {sum(bool(t['wikidataId']) for t in towns)}")
    print(f"File size: {output.stat().st_size / 1024:.1f} KiB")
    return towns


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/build_town_index.py data-sources/ne_10m_populated_places.geojson")
    build(Path(sys.argv[1]))
