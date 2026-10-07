#!/usr/bin/env python3
"""Generate site-wide statistics from the central JSON catalogs."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "assets" / "data"
OUTPUT = DATA_DIR / "site-stats.json"


def load(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def main() -> None:
    levels = load("levels.json")
    subjects = load("subjects.json")
    resources = load("resources.json")

    items = resources.get("resources", [])
    corrected = sum(1 for item in items if item.get("corrected"))
    level_count = sum(len(cycle.get("levels", [])) for cycle in levels.get("cycles", []))
    html_files = [path for path in ROOT.rglob("*.html") if ".git" not in path.parts]

    stats = {
        "resources": len(items),
        "correctedResources": corrected,
        "correctionRate": round(corrected / len(items) * 100) if items else 0,
        "levels": level_count,
        "subjects": len(subjects.get("subjects", [])),
        "pages": len(html_files),
        "generatedFrom": "central JSON catalogs",
    }

    OUTPUT.write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
