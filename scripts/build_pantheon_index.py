
import bz2
import csv
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/data/pantheon-index.json"
QID = re.compile(r"Q[1-9]\d*")


def build_index(source, destination=OUTPUT):
    people = {}

    with bz2.open(
        source, "rt", encoding="utf-8-sig", newline=""
    ) as stream:
        reader = csv.DictReader(stream)
        columns = set(reader.fieldnames or [])

        required = {"wd_id", "hpi", "bplace_name", "l"}
        missing = required - columns

        if missing:
            raise ValueError(
                f"Pantheon CSV missing columns: {sorted(missing)}"
            )

        for row in reader:
            person_id = (row.get("wd_id") or "").strip()

            if not QID.fullmatch(person_id):
                continue

            try:
                hpi = float(row["hpi"])
            except (ValueError, TypeError):
                continue

            if not math.isfinite(hpi) or not 0 <= hpi <= 100:
                continue

            try:
                languages = float(row["l"])
                languages = (
                    int(languages)
                    if math.isfinite(languages) and languages >= 0
                    else None
                )
            except (ValueError, TypeError):
                languages = None

            people[person_id] = {
                "hpi": round(hpi, 2),
                "birthplace": (
                    row.get("bplace_name") or ""
                ).strip() or None,
                "languages": languages,
            }

    destination.parent.mkdir(
        parents=True, exist_ok=True
    )

    destination.write_text(
        json.dumps(
            {
                "source": "Pantheon 2025",
                "people": people,
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    print(
        f"Indexed {len(people)} people: {destination}"
    )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: python3 scripts/build_pantheon_index.py "
            "<dataset.csv.bz2>"
        )

    build_index(Path(sys.argv[1]))
