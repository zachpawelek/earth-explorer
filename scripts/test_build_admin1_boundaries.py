import unittest
from build_admin1_boundaries import compact_boundaries


class AdminBoundaryConverterTests(unittest.TestCase):
    def test_lines_are_preserved_without_attributes(self):
        source = {
            "type": "FeatureCollection",
            "features": [
                {"properties": {"unused": "very large"}, "geometry": {
                    "type": "LineString", "coordinates": [[-90.123456, 43.123456], [-90.123456, 43.123456], [-91, 44]]
                }},
                {"geometry": {"type": "MultiLineString", "coordinates": [
                    [[1, 2], [2, 3]], [[5, 6]], [[7, 8], [8, 9]]
                ]}},
                {"geometry": {"type": "Polygon", "coordinates": [[[1, 1], [2, 2], [1, 1]]]}}
            ]
        }
        result, count = compact_boundaries(source)
        self.assertEqual(count, 3)
        self.assertEqual(result["features"][0]["properties"], {})
        self.assertEqual(result["features"][0]["geometry"]["coordinates"][0],
                         [[-90.12346, 43.12346], [-91, 44]])

    def test_bad_vertices_do_not_connect_unrelated_segments(self):
        source = {"type": "FeatureCollection", "features": [{"geometry": {
            "type": "LineString", "coordinates": [[1, 1], [2, 2], [None, 3], [3, 3], [4, 4]]
        }}]}
        result, count = compact_boundaries(source)
        self.assertEqual(count, 2)
        self.assertEqual(result["features"][0]["geometry"]["coordinates"][1], [[3, 3], [4, 4]])

    def test_empty_geometry_is_reported(self):
        with self.assertRaisesRegex(ValueError, "No valid"):
            compact_boundaries({"type": "FeatureCollection", "features": []})


if __name__ == "__main__":
    unittest.main()
