"""Convert existing compact Admin-1 GeoJSON into small, on-demand binary tiles.

No web request or external Python dependency required. Each segment is
interpolated along the sphere (at most 1 degree) as in coastlineGeometry.js.
The app fetches only nearby tiles instead of uploading every global border.
"""

from array import array
import json
import math
from pathlib import Path
import sys

RADIUS = 1.002
TILE_DEGREES = 20
MAX_SEGMENT_ANGLE = math.pi / 180
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "public/data/admin1-boundaries-10m.geojson"
DEFAULT_OUTPUT = ROOT / "public/data/admin1-tiles"


def direction(latitude, longitude):
    lat = math.radians(latitude)
    lon = math.radians(longitude)
    return (
        math.cos(lat) * math.sin(lon),
        math.sin(lat),
        math.cos(lat) * math.cos(lon),
    )


def normalize(v):
    length = math.sqrt(sum(x * x for x in v))
    return tuple(x / length for x in v)


def interpolate(a, b, t):
    return normalize(tuple((1 - t) * x + t * y for x, y in zip(a, b)))


def tile_for_direction(vector, degrees=TILE_DEGREES):
    x, y, z = vector
    lat = math.degrees(math.asin(max(-1, min(1, y))))
    lon = math.degrees(math.atan2(x, z))
    return (
        min(math.ceil(180 / degrees) - 1, max(0, math.floor((lat + 90) / degrees))),
        min(math.ceil(360 / degrees) - 1, max(0, math.floor((lon + 180) / degrees))),
    )


def paths_from_geojson(data):
    for feature in data.get('features', []):
        geometry = feature.get('geometry') or {}
        if geometry.get('type') == 'LineString':
            yield geometry['coordinates']
        elif geometry.get('type') == 'MultiLineString':
            yield from geometry['coordinates']


def build_tiles(source=DEFAULT_SOURCE, output=DEFAULT_OUTPUT, degrees=TILE_DEGREES):
    data = json.loads(Path(source).read_text(encoding='utf-8'))
    if data.get('type') != 'FeatureCollection':
        raise ValueError('Expected a GeoJSON FeatureCollection')

    buckets = {}
    total = 0
    for path in paths_from_geojson(data):
        for i in range(len(path) - 1):
            lon1, lat1 = path[i][:2]
            lon2, lat2 = path[i + 1][:2]
            a = direction(lat1, lon1)
            b = direction(lat2, lon2)
            angle = math.acos(max(-1, min(1, sum(x * y for x, y in zip(a, b)))))
            subdivisions = max(1, math.ceil(angle / MAX_SEGMENT_ANGLE))
            for step in range(subdivisions):
                p = interpolate(a, b, step / subdivisions)
                q = interpolate(a, b, (step + 1) / subdivisions)
                center = normalize(tuple((x + y) * .5 for x, y in zip(p, q)))
                key = tile_for_direction(center, degrees)
                buckets.setdefault(key, array('f')).extend(
                    [v * RADIUS for v in (*p, *q)]
                )
                total += 1

    if not total:
        raise ValueError('No Admin-1 line segments found')

    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    tiles = []
    for (row, col), floats in sorted(buckets.items()):
        filename = f'{row}-{col}.bin'
        (output / filename).write_bytes(floats.tobytes())
        tiles.append({
            'key': f'{row}-{col}',
            'lat': min(90, -90 + (row + .5) * degrees),
            'lon': min(180, -180 + (col + .5) * degrees),
            'url': f'/data/admin1-tiles/{filename}',
            'segments': len(floats) // 6,
        })

    (output / 'manifest.json').write_text(
        json.dumps({'tileDegrees': degrees, 'tiles': tiles}, separators=(',', ':')),
        encoding='utf-8',
    )
    print(f'Created {len(tiles)} Admin-1 tiles ({total:,} line segments)')
    print(f'Wrote {output / "manifest.json"}')
    return {'tileDegrees': degrees, 'tiles': tiles}


if __name__ == '__main__':
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    build_tiles(source)
