
import bz2
import csv
import json
import math
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "public/data/pantheon-index.json"


def build_index(source_path):
    people = {}

    # Read the compressed Pantheon CSV without extracting it manually.
    with bz2.open(source_path, "rt", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        columns = reader.fieldnames or []

        print("Dataset columns:", columns)

        def find_column(*names):
            return next((name for name in names if name in columns), None)

        id_column = find_column("wd_id", "wikidata_id", "wikidataid")
        hpi_column = find_column("hpi", "HPI")
        birthplace_column = find_column(
            "bplace_name", "birth_place", "birthplace", "birthcity"
        )

        if not id_column or not hpi_column:
            raise ValueError(
                "Could not locate Wikidata ID and HPI columns. "
                f"Available columns: {columns}"
            )

        for row in reader:
            person_id = (row.get(id_column) or "").strip()

            if not re.fullmatch(r"Q[1-9]\d*", person_id):
                continue

            try:
                hpi = float(row.get(hpi_column) or "")
            except ValueError:
                continue

            if not math.isfinite(hpi):
                continue

            birthplace = (
                (row.get(birthplace_column) or "").strip()
                if birthplace_column
                else ""
            )

            people[person_id] = {
                "hpi": round(hpi, 2),
                "birthplace": birthplace or None,
            }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as output:
        json.dump({
            "source": "Pantheon 2025",
            "people": people,
        }, output, separators=(",", ":"))

    print(f"Successfully indexed {len(people)} people")
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: python3 scripts/build_pantheon_index.py <dataset.csv.bz2>"
        )

    build_index(Path(sys.argv[1]))
