#!/usr/bin/env python3
"""Add 'confirmCancelDesc' i18n key to the 'accommodation' namespace.
Used by the single-action Cancel confirm dialog. Idempotent.
"""
import json
from pathlib import Path

VALUES = {
    "en": "Cancel reservation for {{guest}} in Room {{room}}?",
    "am": "ለ {{guest}} በክፍል {{room}} ያለውን ቀጠሮ መሰረዝ ይፈልጋሉ?",
    "om": "Qabiyyee {{guest}} kan Kutaa {{room}} jiru haquu barbaaddaa?",
}

for lang, value in VALUES.items():
    path = Path(f"src/i18n/locales/{lang}.json")
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    if "accommodation" not in data:
        print(f"⚠️  no 'accommodation' namespace in {lang}.json — skipping")
        continue
    if "confirmCancelDesc" in data["accommodation"]:
        print(f"✓ {lang}.json — confirmCancelDesc already present")
        continue
    data["accommodation"]["confirmCancelDesc"] = value
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"✓ {lang}.json — added confirmCancelDesc = {value!r}")
