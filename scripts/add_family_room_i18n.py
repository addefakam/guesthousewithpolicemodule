"""
Add i18n keys for the Family Room feature to all 3 locale files.
Idempotent — only adds keys that don't already exist.

Keys added to the 'mobile' namespace:
  - roomTypeFAMILY: 'Family Room' label
  - familyStep1: 'Step 1 — Family Leader' heading
  - familyStep2: 'Step 2 — Companions' heading
  - numFamily: 'Number of family members'
  - numSecurity: 'Number of security personnel'
  - numServant: 'Number of servants'
  - roleLEADER / roleFAMILY / roleSECURITY / roleSERVANT: role labels
  - companionsRequired: error if zero companions entered
  - companionName / companionId / companionPhone: per-companion labels
  - familyRoomTitle / familyRoomDesc: dialog headings

Run:  python3 /home/z/my-project/scripts/add_family_room_i18n.py
"""

import json
from pathlib import Path

LOCALES_DIR = Path("/home/z/my-project/guesthousewithpolicemodule/src/i18n/locales")

NEW_KEYS = {
    "en": {
        "mobile": {
            "roomTypeFAMILY": "Family Room",
            "familyRoomTitle": "Family Reservation",
            "familyRoomDesc": "This is a Family Room. Record the family leader and all companions (family members, security, servants).",
            "familyLeader": "Family Leader",
            "companions": "Companions",
            "numFamily": "Number of family members",
            "numSecurity": "Number of security personnel",
            "numServant": "Number of servants",
            "roleLEADER": "Family Leader",
            "roleFAMILY": "Family Member",
            "roleSECURITY": "Security",
            "roleSERVANT": "Servant",
            "companionName": "Full name",
            "companionId": "ID number",
            "companionIdType": "ID type",
            "companionPhone": "Phone (optional)",
            "companionNationality": "Nationality",
            "companionRequired": "At least one companion is required for a Family Room reservation.",
            "familyRoomSummary": "Leader + {{total}} companions ({{family}} family, {{security}} security, {{servant}} servants)",
            "addCompanions": "Add companions",
            "reviewCompanions": "Review companions",
            "editCompanions": "Edit",
            "companion": "Companion {{i}}",
        },
    },
    "am": {
        "mobile": {
            "roomTypeFAMILY": "የቤተሰብ ክፍል",
            "familyRoomTitle": "የቤተሰብ ቀጠሮ",
            "familyRoomDesc": "ይህ የቤተሰብ ክፍል ነው። የቤተሰቡን መሪ እና ሁሉንም አብረዋቸው የሚጓዙ ሰዎች (የቤተሰብ አባላት፣ ጥበቃ፣ አገልጋዮች) መዝግቡ።",
            "familyLeader": "የቤተሰብ መሪ",
            "companions": "አብረዋቸው የሚጓዙ ሰዎች",
            "numFamily": "የቤተሰብ አባላት ብዛት",
            "numSecurity": "የጥበቃ ቡድን ብዛት",
            "numServant": "የአገልጋዮች ብዛት",
            "roleLEADER": "የቤተሰብ መሪ",
            "roleFAMILY": "የቤተሰብ አባል",
            "roleSECURITY": "ጥበቃ",
            "roleSERVANT": "አገልጋይ",
            "companionName": "ሙሉ ስም",
            "companionId": "የመለያ ቁጥር",
            "companionIdType": "የመለያ አይነት",
            "companionPhone": "ስልክ (አማራጭ)",
            "companionNationality": "ዜግነት",
            "companionRequired": "ለቤተሰብ ክፍል ቀጠሮ ቢያንስ አንድ አብረዋቸው የሚጓዝ ሰው መመዝገብ ያስፈልጋል።",
            "familyRoomSummary": "መሪ + {{total}} አብረዋቸው የሚጓዙ ({{family}} ቤተሰብ፣ {{security}} ጥበቃ፣ {{servant}} አገልጋዮች)",
            "addCompanions": "አብረዋቸው የሚጓዙን ያክሉ",
            "reviewCompanions": "አብረዋቸው የሚጓዙን ያረጋግጡ",
            "editCompanions": "አስተካክል",
            "companion": "አብረዋቸው የሚጓዝ {{i}}",
        },
    },
    "om": {
        "mobile": {
            "roomTypeFAMILY": "Mana Maatii",
            "familyRoomTitle": "Qabiyyee Maatii",
            "familyRoomDesc": "Kun mana maatii dha. Bulaa maatiifi hunda waliin deeman (maatii, eegumsa, tajaajiltootaa) galmeessi.",
            "familyLeader": "Bulaa Maatii",
            "companions": "Waliin deeman",
            "numFamily": "Lakkoofsa miseensa maatii",
            "numSecurity": "Lakkoofsa eegumsa",
            "numServant": "Lakkoofsa tajaajilaa",
            "roleLEADER": "Bulaa Maatii",
            "roleFAMILY": "Miseensa Maatii",
            "roleSECURITY": "Eegumsa",
            "roleSERVANT": "Tajaajilaa",
            "companionName": "Maqaa guutuu",
            "companionId": "Lakkoofsa qubeessa",
            "companionIdType": "Akaakuu qubeessa",
            "companionPhone": "Bilbila (filata)",
            "companionNationality": "Lammummaa",
            "companionRequired": "Qabiyyee mana maatii qabuuf ohoowwan xiqqaan tokko waliin deemu galmeessuu qabda.",
            "familyRoomSummary": "Bulaa + {{total}} waliin deeman ({{family}} maatii, {{security}} eegumsa, {{servant}} tajaajilaa)",
            "addCompanions": "Waliin deeman dabi",
            "reviewCompanions": "Waliin deeman mirkaneessi",
            "editCompanions": "Gulaali",
            "companion": "Waliin deemuu {{i}}",
        },
    },
}

def merge(target: dict, additions: dict) -> int:
    added = 0
    for k, v in additions.items():
        if isinstance(v, dict):
            sub = target.setdefault(k, {})
            if not isinstance(sub, dict):
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
