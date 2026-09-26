"""Clean the Functional Fitness Exercise Database CSV into a catalog-ready file."""

from __future__ import annotations

import csv
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "Functional+Fitness+Exercise+Database+(version+2.9) - Exercises (2).csv"
OUT = ROOT / "data" / "exercise-catalog.csv"

TYPOS = {
    "vastus mediais": "Vastus Medialis",
}

# Odd value that already has a real counterpart in the same column.
VALUE_FIXES = {
    "order": "Other",
}

JUNK = {"unsorted", "unsorted*", "none", "n/a", "na", "null"}

LEVEL_MAP = {
    "beginner": "beginner",
    "novice": "beginner",
    "intermediate": "intermediate",
    "advanced": "advanced",
    "expert": "advanced",
    "master": "advanced",
    "grand master": "advanced",
    "legendary": "advanced",
}

EQUIP_MAP = {
    "bodyweight": "bodyweight",
    "dumbbell": "dumbbells",
    "resistance band": "bands",
    "superband": "bands",
    "miniband": "bands",
}

COLUMNS = [
    "slug",
    "name",
    "demo",
    "explanation",
    "difficulty",
    "app_level",
    "target_muscle_group",
    "prime_mover_muscle",
    "secondary_muscles",
    "primary_equipment",
    "primary_item_count",
    "secondary_equipment",
    "secondary_item_count",
    "equipment",
    "app_equipment",
    "posture",
    "arm_use",
    "arm_rhythm",
    "grip",
    "load_position",
    "leg_rhythm",
    "foot_elevation",
    "combination",
    "movement_patterns",
    "planes_of_motion",
    "body_region",
    "force_type",
    "mechanics",
    "laterality",
    "classification",
]


def cell(row: dict[str, str], *names: str) -> str:
    for name in names:
        if name in row:
            return (row.get(name) or "").strip()
    # Headers in the source have trailing spaces; match loosely.
    wanted = {n.rstrip().lower() for n in names}
    for key, value in row.items():
        if key.rstrip().lower() in wanted:
            return (value or "").strip()
    return ""


def tidy(value: str, *, keep_junk: bool = False) -> str:
    text = re.sub(r"\s+", " ", (value or "").strip())
    if not text:
        return ""
    key = text.lower().rstrip("*")
    if key in TYPOS:
        return TYPOS[key]
    if key in VALUE_FIXES:
        return VALUE_FIXES[key]
    if not keep_junk and key in JUNK:
        return ""
    return text


def join(values: list[str]) -> str:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        item = tidy(value)
        if not item:
            continue
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return "|".join(out)


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "exercise"


def app_level(difficulty: str) -> str:
    return LEVEL_MAP.get(difficulty.lower(), "intermediate")


def map_equipment(name: str) -> str:
    if not name:
        return ""
    return EQUIP_MAP.get(name.lower(), "gym")


def app_equipment_for(primary: str, secondary: str) -> str:
    tags: list[str] = []
    for name in (primary, secondary):
        mapped = map_equipment(name)
        if mapped and mapped not in tags:
            tags.append(mapped)
    # A full gym can do bodyweight, dumbbell and band work.
    if any(tag in tags for tag in ("bodyweight", "dumbbells", "bands")) and "gym" not in tags:
        tags.append("gym")
    if "gym" in tags and "gym" != tags[0]:
        tags = [t for t in tags if t != "gym"] + ["gym"]
    return "|".join(tags)


def int_or_blank(value: str) -> str:
    text = tidy(value)
    if text.isdigit():
        return text
    return ""


def main() -> None:
    with SRC.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    slugs: Counter[str] = Counter()
    out_rows: list[dict[str, str]] = []

    for row in rows:
        name = tidy(cell(row, "Exercise"))
        if not name:
            continue

        difficulty = tidy(cell(row, "Difficulty Level"))
        primary = tidy(cell(row, "Primary Equipment"))
        secondary = tidy(cell(row, "Secondary Equipment"))

        slug = slugify(name)
        slugs[slug] += 1
        if slugs[slug] > 1:
            slug = f"{slug}-{slugs[slug]}"

        out_rows.append(
            {
                "slug": slug,
                "name": name,
                "demo": tidy(cell(row, "Short YouTube Demonstration"), keep_junk=True),
                "explanation": tidy(cell(row, "In-Depth YouTube Explanation"), keep_junk=True),
                "difficulty": difficulty,
                "app_level": app_level(difficulty),
                "target_muscle_group": tidy(cell(row, "Target Muscle Group")),
                "prime_mover_muscle": tidy(cell(row, "Prime Mover Muscle")),
                "secondary_muscles": join(
                    [cell(row, "Secondary Muscle"), cell(row, "Tertiary Muscle")]
                ),
                "primary_equipment": primary,
                "primary_item_count": int_or_blank(cell(row, "# Primary Items")),
                "secondary_equipment": secondary,
                "secondary_item_count": int_or_blank(cell(row, "# Secondary Items")),
                "equipment": join([primary, secondary]),
                "app_equipment": app_equipment_for(primary, secondary),
                "posture": tidy(cell(row, "Posture")),
                "arm_use": tidy(cell(row, "Single or Double Arm")),
                "arm_rhythm": tidy(cell(row, "Continuous or Alternating Arms")),
                "grip": tidy(cell(row, "Grip")),
                "load_position": tidy(cell(row, "Load Position (Ending)")),
                "leg_rhythm": tidy(cell(row, "Continuous or Alternating Legs")),
                "foot_elevation": tidy(cell(row, "Foot Elevation")),
                "combination": tidy(cell(row, "Combination Exercises")),
                "movement_patterns": join(
                    [
                        cell(row, "Movement Pattern #1"),
                        cell(row, "Movement Pattern #2"),
                        cell(row, "Movement Pattern #3"),
                    ]
                ),
                "planes_of_motion": join(
                    [
                        cell(row, "Plane Of Motion #1"),
                        cell(row, "Plane Of Motion #2"),
                        cell(row, "Plane Of Motion #3"),
                    ]
                ),
                "body_region": tidy(cell(row, "Body Region")),
                "force_type": tidy(cell(row, "Force Type")),
                "mechanics": tidy(cell(row, "Mechanics")),
                "laterality": tidy(cell(row, "Laterality")),
                "classification": tidy(cell(row, "Primary Exercise Classification")),
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(out_rows)

    levels = Counter(r["app_level"] for r in out_rows)
    gear = Counter()
    for row in out_rows:
        for tag in row["app_equipment"].split("|"):
            if tag:
                gear[tag] += 1
    blanks = {col: sum(1 for r in out_rows if not r[col]) for col in COLUMNS}

    print(f"wrote {len(out_rows)} rows -> {OUT}")
    print("app_level", dict(levels))
    print("app_equipment coverage", dict(gear))
    print("blank counts", {k: v for k, v in blanks.items() if v})


if __name__ == "__main__":
    main()
