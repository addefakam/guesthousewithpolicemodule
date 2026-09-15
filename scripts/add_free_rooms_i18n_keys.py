#!/usr/bin/env python3
"""Add free-rooms tab i18n keys to the reservations namespace (en/am/om)."""
import json
import sys

KEYS = {
    "tabFreeRooms": {"en": "Free Rooms", "am": "ነጻ ክፍሎች", "om": "Kutaawwan Bilisaa"},
    "frColRoom": {"en": "Room", "am": "ክፍል", "om": "Kutaa"},
    "frColType": {"en": "Type", "am": "ዓይነት", "om": "Gosa"},
    "frColPrice": {"en": "Price / Night", "am": "ዋጋ / ማምሽት", "om": "Gatii / halkan"},
    "frColStatus": {"en": "Status", "am": "ሁኔታ", "om": "Haala"},
    "frAvailable": {"en": "Available", "am": "ክፍት", "om": "Duwwaa"},
    "frEmpty": {"en": "No free rooms", "am": "ነጻ ክፍል የለም", "om": "Kutaa bilisaa hin jiru"},
    "frNight": {"en": "night", "am": "ማምሽት", "om": "halkan"},
}

MARKER = '  "reservations": {\n'

ok = True
for loc in ["en", "am", "om"]:
    path = f"src/i18n/locales/{loc}.json"
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    try:
        marker_idx = lines.index(MARKER)
    except ValueError:
        print(f"[{loc}] marker not found"); ok = False; continue

    existing = set()
    data = json.load(open(path, encoding="utf-8"))
    existing = set(data.get("reservations", {}).keys())

    inserts = []
    for key, vals in KEYS.items():
        if key in existing:
            print(f"[{loc}] {key} already present — skip")
            continue
        inserts.append(f'    "{key}": {json.dumps(vals[loc], ensure_ascii=False)},\n')

    if inserts:
        lines[marker_idx + 1:marker_idx + 1] = inserts
        with open(path, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print(f"[{loc}] inserted {len(inserts)} keys")

    # validate
    d = json.load(open(path, encoding="utf-8"))
    missing = [k for k in KEYS if k not in d.get("reservations", {})]
    if missing:
        print(f"[{loc}] MISSING after write: {missing}"); ok = False
    else:
        print(f"[{loc}] JSON valid, all keys present")

sys.exit(0 if ok else 1)
