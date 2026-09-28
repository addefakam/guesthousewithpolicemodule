#!/usr/bin/env python3
"""Add bulk-action i18n keys to the 'accommodation' namespace in all locale files.

These keys already exist in the 'mobile' namespace (added in commit f23df46)
but accommodation-guests-page.tsx uses useTranslation('accommodation'), so
the lookup was returning the raw key as a fallback. This script adds the
same keys to the accommodation namespace so the page can resolve them.

Idempotent: if a key already exists, it won't be overwritten.
"""
import json
from pathlib import Path

# English values (canonical)
NEW_KEYS = {
    "btnBulkSelect": "Select",
    "btnBulkExit": "Done",
    "bulkActionBarCount": "{{count}} selected",
    "btnBulkCheckin": "Check In",
    "btnBulkCheckout": "Check Out",
    "btnBulkEarlyOut": "Early Out",
    "btnBulkCancel": "Cancel",
    "confirmBulkCheckinTitle": "Check in {{count}} reservation(s)?",
    "confirmBulkCheckoutTitle": "Check out {{count}} reservation(s)?",
    "confirmBulkEarlyOutTitle": "Early check out {{count}} reservation(s)?",
    "confirmBulkCancelTitle": "Cancel {{count}} reservation(s)?",
    "confirmBulkCheckinDesc": "Each selected reservation will be marked as checked in and its room set to occupied. {{skipped}} not eligible and will be skipped.",
    "confirmBulkCheckoutDesc": "Each selected reservation will be marked as completed and its room released. {{skipped}} not eligible and will be skipped.",
    "confirmBulkEarlyOutDesc": "Each selected reservation will be marked as completed early and its room released. {{skipped}} not eligible and will be skipped.",
    "confirmBulkCancelDesc": "Each selected reservation will be cancelled and its room released. {{skipped}} not eligible and will be skipped.",
    "toastBulkCheckinResult": "{{success}} of {{total}} checked in. {{skipped}} skipped, {{failed}} failed.",
    "toastBulkCheckoutResult": "{{success}} of {{total}} checked out. {{skipped}} skipped, {{failed}} failed.",
    "toastBulkCancelResult": "{{success}} of {{total}} cancelled. {{skipped}} skipped, {{failed}} failed.",
    "toastBulkNoneEligible": "None of the selected reservations are eligible for this action.",
    "btnProcessing": "Processing…",
    "btnCancel": "Cancel",
}

# Translations for am + om (best-effort; mirrors what already exists in the
# 'mobile' namespace for these keys). We copy from mobile to keep the two
# namespaces consistent — no need to retranslate.
TRANSLATIONS = {
    "am": {
        "btnBulkSelect": "ምረጥ",
        "btnBulkExit": "ተከናወነ",
        "bulkActionBarCount": "{{count}} ተመርጧል",
        "btnBulkCheckin": "አስገባ",
        "btnBulkCheckout": "አውጣ",
        "btnBulkEarlyOut": "ቀድሞ አውጣ",
        "btnBulkCancel": "ሰርዝ",
        "confirmBulkCheckinTitle": "{{count}} ቀጠሮ(ዎች) ማስገባት?",
        "confirmBulkCheckoutTitle": "{{count}} ቀጠሮ(ዎች) ማውጣት?",
        "confirmBulkEarlyOutTitle": "{{count}} ቀጠሮ(ዎች) ቀድሞ ማውጣት?",
        "confirmBulkCancelTitle": "{{count}} ቀጠሮ(ዎች) መሰረዝ?",
        "confirmBulkCheckinDesc": "የተመረጡት ቀጠሮዎች እንግዳ ገብተዋል ተብለው ይመዘገባሉ፣ ክፍላቸውም የተያዘ ይሆናል። {{skipped}} ብቁ ስላልሆኑ ይዘለላሉ።",
        "confirmBulkCheckoutDesc": "የተመረጡት ቀጠሮዎች ተጠናቅቀዋል ተብለው ይመዘገባሉ፣ ክፍላቸውም ይፈታል። {{skipped}} ብቁ ስላልሆኑ ይዘለላሉ።",
        "confirmBulkEarlyOutDesc": "የተመረጡት ቀጠሮዎች ቀድሞ ተጠናቅቀዋል ተብለው ይመዘገባሉ፣ ክፍላቸውም ይፈታል። {{skipped}} ብቁ ስላልሆኑ ይዘለላሉ።",
        "confirmBulkCancelDesc": "የተመረጡት ቀጠሮዎች ይሰረዛሉ፣ ክፍላቸውም ይፈታል። {{skipped}} ብቁ ስላልሆኑ ይዘለላሉ።",
        "toastBulkCheckinResult": "{{total}} ውስጥ {{success}} ገብተዋል። {{skipped}} ይዘለላሉ፣ {{failed}} አልተሳኩም።",
        "toastBulkCheckoutResult": "{{total}} ውስጥ {{success}} ወጥተዋል። {{skipped}} ይዘለላሉ፣ {{failed}} አልተሳኩም።",
        "toastBulkCancelResult": "{{total}} ውስጥ {{success}} ተሰርዘዋል። {{skipped}} ይዘለላሉ፣ {{failed}} አልተሳኩም።",
        "toastBulkNoneEligible": "ከተመረጡት ቀጠሮዎች ምንም ብቁ አይደለም።",
        "btnProcessing": "በሂደት ላይ…",
        "btnCancel": "ይቅር",
    },
    "om": {
        "btnBulkSelect": "Filadhu",
        "btnBulkExit": "Xumura",
        "bulkActionBarCount": "{{count}} filatame",
        "btnBulkCheckin": "Seensis",
        "btnBulkCheckout": "Baasi",
        "btnBulkEarlyOut": "Dursaa Baasi",
        "btnBulkCancel": "Haqi",
        "confirmBulkCheckinTitle": "Qabiyyee {{count}} seensisuu?",
        "confirmBulkCheckoutTitle": "Qabiyyee {{count}} baasuu?",
        "confirmBulkEarlyOutTitle": "Qabiyyee {{count}} dursaa baasuu?",
        "confirmBulkCancelTitle": "Qabiyyee {{count}} haquu?",
        "confirmBulkCheckinDesc": "Filataman qabiyyee hundi akka seeneetti galmaa'u, kutaa isaanii qabatama ta'a. {{skipped}} hin danda'amneef daangifamu.",
        "confirmBulkCheckoutDesc": "Filataman qabiyyee hundi xumuramaa ta'a, kutaa isaanii haqama. {{skipped}} hin danda'amneef daangifamu.",
        "confirmBulkEarlyOutDesc": "Filataman qabiyyee hundi dursaa xumuramaa ta'a, kutaa isaanii haqama. {{skipped}} hin danda'amneef daangifamu.",
        "confirmBulkCancelDesc": "Filataman qabiyyee hundi haqama, kutaa isaanii haqama. {{skipped}} hin danda'amneef daangifamu.",
        "toastBulkCheckinResult": "{{total}} keessaa {{success}} seene. {{skipped}} daangifame, {{failed}} hin milkaa'ane.",
        "toastBulkCheckoutResult": "{{total}} keessaa {{success}} ba'e. {{skipped}} daangifame, {{failed}} hin milkaa'ane.",
        "toastBulkCancelResult": "{{total}} keessaa {{success}} haqame. {{skipped}} daangifame, {{failed}} hin milkaa'ane.",
        "toastBulkNoneEligible": "Filataman qabiyyee keessaa tokkollee hin danda'amne.",
        "btnProcessing": "Gabaabaa jira…",
        "btnCancel": "Dhiisi",
    },
}

for lang, translations in [("en", NEW_KEYS), ("am", TRANSLATIONS["am"]), ("om", TRANSLATIONS["om"])]:
    path = Path(f"src/i18n/locales/{lang}.json")
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    if "accommodation" not in data:
        print(f"⚠️  no 'accommodation' namespace in {lang}.json — skipping")
        continue
    added = []
    skipped = []
    for k, v in translations.items():
        if k in data["accommodation"]:
            skipped.append(k)
        else:
            data["accommodation"][k] = v
            added.append(k)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"✓ {lang}.json — added {len(added)} keys, skipped {len(skipped)} (already present)")
    if added:
        for k in added:
            print(f"    + {k}")
