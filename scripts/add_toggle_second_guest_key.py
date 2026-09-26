#!/usr/bin/env python3
"""Add the 'btnToggleSecondGuest' i18n key to the 'accommodation' namespace
in all locale files (en, am, om). Idempotent — re-running is a no-op.
"""
import json
from pathlib import Path

VALUES = {
    "en": "Second Guest",
    "am": "ሁለተኛ እንግዳ",
    "om": "Keessummaa Lammaffaa",
}

for lang, value in VALUES.items():
    path = Path(f"src/i18n/locales/{lang}.json")
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    if "accommodation" not in data:
        print(f"⚠️  no 'accommodation' namespace in {lang}.json — skipping")
        continue
    if "btnToggleSecondGuest" in data["accommodation"]:
        print(f"✓ {lang}.json — btnToggleSecondGuest already present")
        continue
    data["accommodation"]["btnToggleSecondGuest"] = value
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"✓ {lang}.json — added btnToggleSecondGuest = {value!r}")
