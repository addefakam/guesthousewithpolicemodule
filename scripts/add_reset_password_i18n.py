"""
Add password-reset i18n keys to all three locale files (en, am, om).
Idempotent — only adds keys that don't already exist.

Namespaces touched:
  - login: 'resetPassword' (used on admin login page)
  - mobile: 'resetPassword' (used on operator mobile login)
  - policeApp.login: 'resetPassword' (used on police-app login)

Run:  python3 /home/z/my-project/scripts/add_reset_password_i18n.py
"""

import json
from pathlib import Path

LOCALES_DIR = Path("/home/z/my-project/guesthousewithpolicemodule/src/i18n/locales")

# Keys to add per language
NEW_KEYS = {
    "en": {
        "login": {
            "resetPassword": "Reset Password",
        },
        "mobile": {
            "resetPassword": "Reset Password",
        },
        "policeApp": {
            "login": {
                "resetPassword": "Reset Password",
            },
        },
    },
    "am": {
        "login": {
            "resetPassword": "የይለፍ ቃል ዳግም አስጀምር",
        },
        "mobile": {
            "resetPassword": "የይለፍ ቃል ዳግም አስጀምር",
        },
        "policeApp": {
            "login": {
                "resetPassword": "የይለፍ ቃል ዳግም አስጀምር",
            },
        },
    },
    "om": {
        "login": {
            "resetPassword": "Jecha Darbii Haaromsi",
        },
        "mobile": {
            "resetPassword": "Jecha Darbii Haaromsi",
        },
        "policeApp": {
            "login": {
                "resetPassword": "Jecha Darbii Haaromsi",
            },
        },
    },
}

def merge(target: dict, additions: dict) -> int:
    """Recursively merge additions into target. Returns count of new keys added."""
    added = 0
    for k, v in additions.items():
        if isinstance(v, dict):
            sub = target.setdefault(k, {})
            if not isinstance(sub, dict):
                # Conflict: existing value isn't a dict. Overwrite carefully.
                sub = {}
                target[k] = sub
            added += merge(sub, v)
        else:
            if k not in target:
                target[k] = v
                added += 1
    return added

for lang, namespaces in NEW_KEYS.items():
    f = LOCALES_DIR / f"{lang}.json"
    data = json.loads(f.read_text(encoding="utf-8"))
    total_added = 0
    for ns, keys in namespaces.items():
        ns_obj = data.setdefault(ns, {})
        total_added += merge(ns_obj, keys)
    f.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"{lang}.json: added {total_added} new key(s)")

print("Done.")
