#!/usr/bin/env python3
"""Merge i18n patch files into locale files."""
import json, os

LOCALE_DIR = "/home/z/my-project/src/i18n/locales"
PATCH_DIR = "/home/z/my-project/scripts/patches"

# (namespace, locale_file_suffix, patch_file_suffix)
MERGE_MAP = [
    ("accommodation", "en", "en"),
    ("accommodation", "am", "am"),
    ("accommodation", "om", "om"),
    ("rooms", "en", "en"),
    ("rooms", "am", "am"),
    ("rooms", "om", "om"),
    ("daytime", "en", "en"),
    ("daytime", "am", "am"),
    ("daytime", "om", "om"),
]

for namespace, locale_suffix, patch_suffix in MERGE_MAP:
    locale_path = os.path.join(LOCALE_DIR, f"{locale_suffix}.json")
    patch_path = os.path.join(PATCH_DIR, f"{namespace}_{patch_suffix}.json")
    
    with open(locale_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    with open(patch_path, "r", encoding="utf-8") as f:
        patch = json.load(f)
    
    # Ensure namespace exists
    if namespace not in data:
        data[namespace] = {}
    
    # Merge patch into namespace (don't overwrite existing keys)
    added = 0
    for key, value in patch.items():
        if key not in data[namespace]:
            data[namespace][key] = value
            added += 1
    
    with open(locale_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    
    print(f"{locale_suffix}.json / {namespace}: +{added} keys (total: {len(data[namespace])})")

print("\nDone!")
