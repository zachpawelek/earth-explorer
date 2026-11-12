import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from build_geonames_index import build


class GeoNamesBuildTest(unittest.TestCase):
    def test_parses_zip_and_removes_major_city_duplicates(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            majors = folder / "majors.geojson"
            majors.write_text(json.dumps({"features": [{
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-89.4012, 43.0731]},
                "properties": {"NAME": "Madison"}
            }]}))
            source = folder / "cities500.zip"
            def record(id_, name, lat, lon, pop):
                values = [str(id_), name, name, "", str(lat), str(lon), "P", "PPL", "US", "", "WI", "", "", "", str(pop), "", "", "", "2026-11-11"]
                return "\t".join(values)
            with zipfile.ZipFile(source, "w") as z:
                z.writestr("cities500.txt", "\n".join([
                    record(1, "Madison", 43.0732, -89.402, 280000),
                    record(2, "Smallville", 44, -90, 800),
                    record(3, "Back town", -20, 100, 2500),
                ]))
            output = folder / "towns.json"
            result = build(source, output, majors)
            self.assertEqual(len(result), 2)
            catalog = json.loads(output.read_text())
            self.assertEqual(catalog["places"][0][:2], [2, "Smallville"])


if __name__ == "__main__":
    unittest.main()
