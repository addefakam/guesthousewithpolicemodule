"""
Add certificate-related i18n keys to all three locale files (en, am, om).
Idempotent — only adds keys that don't already exist.
"""
import json
from pathlib import Path

LOCALES_DIR = Path("/home/z/my-project/guesthousewithpolicemodule/src/i18n/locales")

NEW_KEYS = {
    "en": {
        "certButton": "Certificate",
        "certButtonLoading": "Generating...",
        "certToastSuccess": "Certificate downloaded",
        "certToastError": "Failed to generate certificate",
        "certToastPending": "Cannot issue certificate for a non-approved guesthouse",
        "certColumnHeader": "Certificate",
        "certHelpText": "Generate a downloadable PDF certificate of registration",
    },
    "am": {
        "certButton": "ማረጋገጫ",
        "certButtonLoading": "በማመንጃ ላይ...",
        "certToastSuccess": "ማረጋገጫ ወርዷል",
        "certToastError": "ማረጋገጫ ማመን አልተሳካም",
        "certToastPending": "ለተፈቀደ እንግድ ቤት ብቻ ማረጋገጫ መስጠት ይቻላል",
        "certColumnHeader": "ማረጋገጫ",
        "certHelpText": "የሚማረጋገጥ የምዝገባ ማረጋገጫ PDF ይፍጠሩ",
    },
    "om": {
        "certButton": "Marsariisa",
        "certButtonLoading": "Hojjetama...",
        "certToastSuccess": "Marsariisa ni galmameera",
        "certToastError": "Marsariisa uumuu hin danda'ame",
        "certToastPending": "Mana gaazee kan hin hayyamneef marsariisa kennuu hin danda'u",
        "certColumnHeader": "Marsariisa",
        "certHelpText": "PDF marsariisa mirgansa ni galmateessaa uumi",
    },
}

for lang, keys in NEW_KEYS.items():
    f = LOCALES_DIR / f"{lang}.json"
    data = json.loads(f.read_text(encoding="utf-8"))
    ns = data.setdefault("ownerAccounts", {})
    added = 0
    for k, v in keys.items():
        if k not in ns:
            ns[k] = v
            added += 1
    f.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{lang}.json: added {added} new key(s) to ownerAccounts namespace")

print("Done.")
