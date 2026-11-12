import json
import math
import tempfile
import unittest
from pathlib import Path

from build_admin1_tiles import build_tiles

class TileTests(unittest.TestCase):
    def test_tiles_preserve_segments_and_radius(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source.geojson'
            source.write_text(json.dumps({
                'type': 'FeatureCollection', 'features': [
                    {'type': 'Feature', 'geometry': {'type': 'LineString',
                     'coordinates': [[0, 0], [2, 0]]}, 'properties': {}},
                ],
            }))
            output = root / 'tiles'
            manifest = build_tiles(source, output)
            self.assertGreaterEqual(sum(t['segments'] for t in manifest['tiles']), 2)
            self.assertTrue((output / 'manifest.json').exists())
            from array import array
            for tile in manifest['tiles']:
                f = array('f')
                f.frombytes((output / tile['url'].split('/')[-1]).read_bytes())
                self.assertEqual(len(f), tile['segments'] * 6)
                for i in range(0, len(f), 3):
                    self.assertAlmostEqual(math.hypot(*f[i:i+3]), 1.002, places=5)

if __name__ == '__main__':
    unittest.main()
