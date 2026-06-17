"""Export the bundled plant_db.sqlite `plant` table to JSON for the IV/DV
evaluation (tools/eval/ivdv_evaluation.test.ts).

This keeps the thesis evaluation reproducible and traceable: the same SQLite
that ships in the app (android/app/src/main/assets/plant_db.sqlite, built by
tools/export_to_sqlite.py from the frozen Excel evidence) is the single source
of plant data for the evaluation — no hand-entered numbers.

Run:  python tools/eval/export_plants_json.py
Out:  tools/eval/plants_eval.json  (array of PlantDbRow, per src/data/mapPlant.ts)
"""

import json
import os
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DB = os.path.join(ROOT, "android", "app", "src", "main", "assets", "plant_db.sqlite")
OUT = os.path.join(HERE, "plants_eval.json")

# Only the columns the recommendation engine actually consumes (PlantDbRow).
COLS = [
    "plant_id",
    "scientific_name_accepted",
    "common_name_main",
    "family",
    "shade_category",
    "aspect_orientation",
    "direct_sun_tolerance",
    "final_confidence",
    "value_status",
    "maintenance_lux_min",
    "maintenance_lux_max",
    "preferred_lux_min",
    "preferred_lux_max",
]


def main() -> None:
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        f"SELECT {', '.join(COLS)} FROM plant ORDER BY maintenance_lux_min, common_name_main"
    ).fetchall()
    con.close()

    out = [{c: r[c] for c in COLS} for r in rows]
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
    print(f"Wrote {len(out)} plants -> {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
