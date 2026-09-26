#!/usr/bin/env python3
"""Add 'Rooms' i18n key to the 'sidebar' namespace in all locale files.
'Reservations' already exists in the sidebar namespace. Idempotent.
"""
import json
from pathlib import Path

VALUES = {
    "en": "Rooms",
    "am": "ክፍሎች",
    "om": "Kutaa",
}

for lang, value in VALUES.items():
    path = Path(f"src/i18n/locales/{lang}.json")
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    if "sidebar" not in data:
        print(f"⚠️  no 'sidebar' namespace in {lang}.json — skipping")
        continue
    if "Rooms" in data["sidebar"]:
        print(f"✓ {lang}.json — 'Rooms' already present")
        continue
    data["sidebar"]["Rooms"] = value
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"✓ {lang}.json — added Rooms = {value!r}")
