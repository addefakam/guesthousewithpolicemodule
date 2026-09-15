#!/usr/bin/env python3
"""Add the `policeApp` i18n namespace to en/am/om locale files.

Standalone Police App (/police-app) translations.
- Preserves existing formatting (2-space indent, ensure_ascii=False, trailing newline).
- Verifies afterwards that every static t("...") key used by the police-app
  components resolves in all three languages.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project/guesthousewithpolicemodule")
LOCALES = ROOT / "src/i18n/locales"

EN = {
    "appName": "GHMS Police",
    "appTagline": "Guesthouse Monitoring",
    "login": {
        "title": "Police sign in",
        "subtitle": "Access the standalone police module app",
        "username": "Username",
        "usernamePlaceholder": "Enter your username",
        "password": "Password",
        "showPassword": "Show password",
        "hidePassword": "Hide password",
        "signIn": "Sign In",
        "signingIn": "Signing in…",
        "error": "Sign-in failed",
        "notPolice": "This app is for police accounts only.",
        "notPoliceTitle": "Access restricted",
        "switchAccount": "Switch account",
        "footerNote": "Room availability and guest monitoring for authorized police personnel only. All access is logged and audited.",
    },
    "nav": {"home": "Home", "rooms": "Rooms", "guests": "Guests", "more": "More"},
    "home": {
        "title": "Dashboard",
        "subtitle": "City-wide overview",
        "totalProviders": "Guesthouses",
        "totalRooms": "Total Rooms",
        "activeStays": "Active Reservations",
        "totalGuests": "Registered Guests",
        "totalRevenue": "Total Revenue",
        "reservationRevenue": "Reservations",
        "daytimeRevenue": "Daytime Services",
        "busiest": "Busiest guesthouses",
        "viewRooms": "View rooms",
        "activeWord": "active",
    },
    "rooms": {
        "title": "Room Availability",
        "subtitle": "Live status across all guesthouses",
        "searchPlaceholder": "Search guesthouse, phone, address…",
        "filterAll": "All",
        "available": "Available",
        "occupied": "Occupied",
        "reserved": "Reserved",
        "maintenance": "Maintenance",
        "utilization": "Utilization",
        "totalRooms": "Rooms",
        "guesthouses": "Guesthouses",
        "capacity": "Beds",
        "roomsWord": "rooms",
        "matchCount": "{{matched}} of {{total}} rooms",
        "resultGuesthouses": "{{count}} guesthouses",
        "noProviders": "No guesthouses found",
        "noRoomsForFilter": "No rooms with this status right now",
        "tryClearing": "Try clearing the search or status filter",
        "avgPrice": "Avg price",
        "license": "License",
        "roomNum": "Room {{room}}",
        "floor": "Floor {{floor}}",
        "perNight": "/ night",
        "updated": "Updated {{time}}",
    },
    "guests": {
        "title": "Guests & Stays",
        "subtitle": "Active and upcoming reservations city-wide",
        "searchPlaceholder": "Search guest, phone, ID, room…",
        "empty": "No active or upcoming reservations",
        "noMatch": "No guests match your search",
        "showing": "Showing {{count}} reservations",
        "statusActive": "Active",
        "statusUpcoming": "Upcoming",
        "phone": "Phone",
        "idNumber": "ID number",
        "nationality": "Nationality",
        "room": "Room {{room}}",
        "nights": "{{count}} nights",
    },
    "more": {
        "title": "Officer",
        "rolePolice": "Police",
        "language": "Language",
        "about": "About",
        "aboutText": "Standalone police module app for monitoring guesthouse room availability and registered guests across the city.",
        "logout": "Sign Out",
    },
    "rank": {
        "ADMIN": "Police Admin",
        "DETECTIVE": "Detective",
        "OFFICER": "Officer",
        "VIEWER": "Viewer",
    },
    "common": {
        "errorGeneric": "Something went wrong",
        "retry": "Retry",
        "refresh": "Refresh",
    },
}

AM = {
    "appName": "GHMS ፖሊስ",
    "appTagline": "የሆቴሎች ቁጥጥር",
    "login": {
        "title": "የፖሊስ መግቢያ",
        "subtitle": "የፖሊስ ሞዱል መተግበሪያውን ይክፈቱ",
        "username": "የተጠቃሚ ስም",
        "usernamePlaceholder": "የተጠቃሚ ስምዎን ያስገቡ",
        "password": "የይለፍ ቃል",
        "showPassword": "የይለፍ ቃል አሳይ",
        "hidePassword": "የይለፍ ቃል ደብቅ",
        "signIn": "ግባ",
        "signingIn": "በመግባት ላይ…",
        "error": "መግባት አልተሳካም",
        "notPolice": "ይህ መተግበሪያ ለፖሊስ መለያዎች ብቻ ነው።",
        "notPoliceTitle": "መዳረሻ ታግዷል",
        "switchAccount": "መለያ ቀይር",
        "footerNote": "የክፍሎች ዝግጁነትና የእንግዶች ቁጥጥር ለተፈቀደላቸው የፖሊስ ሰራተኞች ብቻ ነው። ሁሉም መዳረሻ ይመዘገባል።",
    },
    "nav": {"home": "መነሻ", "rooms": "ክፍሎች", "guests": "እንግዶች", "more": "ተጨማሪ"},
    "home": {
        "title": "ዳሽቦርድ",
        "subtitle": "ከመላ ከተማ አጠቃላይ እይታ",
        "totalProviders": "አቅራቢዎች",
        "totalRooms": "ጠቅላላ ክፍሎች",
        "activeStays": "ንቁ ቀጠሮዎች",
        "totalGuests": "የተመዘገቡ እንግዶች",
        "totalRevenue": "አጠቃላይ ገቢ",
        "reservationRevenue": "ቀጠሮዎች",
        "daytimeRevenue": "የቀን አገልግሎቶች",
        "busiest": "ብዙ ተጠቃሚ ያላቸው ሆቴሎች",
        "viewRooms": "ክፍሎችን ይመልከቱ",
        "activeWord": "ንቁ",
    },
    "rooms": {
        "title": "የክፍል ዝግጁነት",
        "subtitle": "በሁሉም ሆቴሎች የቅጽበታዊ ሁኔታ",
        "searchPlaceholder": "በሆቴል፣ በስልክ፣ በአድራሻ ይፈልጉ…",
        "filterAll": "ሁሉም",
        "available": "ክፍት",
        "occupied": "የተያዘ",
        "reserved": "ቀድሞ የተያዘ",
        "maintenance": "ጥገና",
        "utilization": "አጠቃቀም",
        "totalRooms": "ክፍሎች",
        "guesthouses": "አቅራቢዎች",
        "capacity": "አልጋዎች",
        "roomsWord": "ክፍሎች",
        "matchCount": "ከ{{total}} ክፍሎች {{matched}}",
        "resultGuesthouses": "{{count}} አቅራቢዎች",
        "noProviders": "አቅራቢዎች አልተገኙም",
        "noRoomsForFilter": "በአሁኑ ጊዜ በዚህ ሁኔታ ክፍሎች የሉም",
        "tryClearing": "ፍለጋውን ወይም ማጣሪያውን ያስወግዱ",
        "avgPrice": "አማካይ ዋጋ",
        "license": "ፍቃድ",
        "roomNum": "ክፍል {{room}}",
        "floor": "ፎት {{floor}}",
        "perNight": "በሌሊት",
        "updated": "የተዘመነው {{time}}",
    },
    "guests": {
        "title": "እንግዶችና ማረፊያዎች",
        "subtitle": "ከመላ ከተማ ንቁና መጪ ቀጠሮዎች",
        "searchPlaceholder": "በእንግዳ፣ በስልክ፣ በመታወቂያ፣ በክፍል ይፈልጉ…",
        "empty": "ንቁ ወይም መጪ ቀጠሮዎች የሉም",
        "noMatch": "ከፍለጋዎ ጋር የሚስማማ እንግዳ አልተገኘም",
        "showing": "{{count}} ቀጠሮዎች ይታያሉ",
        "statusActive": "ንቁ",
        "statusUpcoming": "መጪ",
        "phone": "ስልክ",
        "idNumber": "የመታወቂያ ቁጥር",
        "nationality": "ዜግነት",
        "room": "ክፍል {{room}}",
        "nights": "{{count}} ሌሊቶች",
    },
    "more": {
        "title": "ኦፊሰር",
        "rolePolice": "ፖሊስ",
        "language": "ቋንቋ",
        "about": "ስለ መተግበሪያው",
        "aboutText": "የክፍሎች ዝግጁነትንና የተመዘገቡ እንግዶችን ከመላ ከተማ ለመቆጣጠር የተነደፈ የፖሊስ ሞዱል መተግበሪያ።",
        "logout": "ውጣ",
    },
    "rank": {
        "ADMIN": "የፖሊስ አስተዳዳሪ",
        "DETECTIVE": "ደታክቲቭ",
        "OFFICER": "ኦፊሰር",
        "VIEWER": "ተመልካች",
    },
    "common": {
        "errorGeneric": "የሆነ ስህተት ተከስቷል",
        "retry": "እንደገና ሞክር",
        "refresh": "አድስ",
    },
}

OM = {
    "appName": "GHMS Poolisii",
    "appTagline": "To'annaa Iddoo Jeedinsaa",
    "login": {
        "title": "Seensa Poolisii",
        "subtitle": "Appii mojulaa poolisii banuu",
        "username": "Maqaa fayyadamaa",
        "usernamePlaceholder": "Maqaa fayyadamaa galchi",
        "password": "Jecha icciitii",
        "showPassword": "Jecha icciitii agarsiisi",
        "hidePassword": "Jecha icciitii dhoki",
        "signIn": "Seeni",
        "signingIn": "Seensi…",
        "error": "Seensi hin milkoofne",
        "notPolice": "Appiin kun herrega poolisii qofaatiif.",
        "notPoliceTitle": "Seensi dhorkameera",
        "switchAccount": "Herrega jijjiiri",
        "footerNote": "Haala kutaawwanii fi to'annaa amantaa herrega poolisiiramaaniif qofa. Seensi hundii galmeefama.",
    },
    "nav": {"home": "Jalqaba", "rooms": "Kutaawwan", "guests": "Ammantaa", "more": "Dabalata"},
    "home": {
        "title": "Dasiboodii",
        "subtitle": "Ilaasa guutummaa magaalaa",
        "totalProviders": "Dhiyeessitoonni",
        "totalRooms": "Kutaawwan Waliigalaa",
        "activeStays": "Qabannoo Hojjetan",
        "totalGuests": "Ammantaa Galmeffaman",
        "totalRevenue": "Galii Waliigalaa",
        "reservationRevenue": "Qabannoo",
        "daytimeRevenue": "Tajaajila Guyyaa",
        "busiest": "Iddoolee hojjetan",
        "viewRooms": "Kutaawwan ilaali",
        "activeWord": "hojjetan",
    },
    "rooms": {
        "title": "Haala Kutaawwan",
        "subtitle": "Haala yeroo iddoo jeedinsaa hunda",
        "searchPlaceholder": "Iddoo jeedinsaa, bilbila, teessoo barbaadi…",
        "filterAll": "Hunda",
        "available": "Duwwaa",
        "occupied": "Qabameera",
        "reserved": "Dursee Qabame",
        "maintenance": "Suphaa Irra",
        "utilization": "Itti fayyadama",
        "totalRooms": "Kutaawwan",
        "guesthouses": "Dhiyeessitoonni",
        "capacity": "Kabaasitii",
        "roomsWord": "kutaawwan",
        "matchCount": "{{total}} kutaawwan keessaa {{matched}}",
        "resultGuesthouses": "Dhiyeessitoota {{count}}",
        "noProviders": "Dhiyeessitoonni hin argamne",
        "noRoomsForFilter": "Yeroo ammaa haala kanaan kutaawwan hin jiru",
        "tryClearing": "Barbaacha ykn filannoo haqi",
        "avgPrice": "Gatii giddugaleessa",
        "license": "Hayyama",
        "roomNum": "Kutaa {{room}}",
        "floor": "Darbii {{floor}}",
        "perNight": "halkanii",
        "updated": "Haaromame {{time}}",
    },
    "guests": {
        "title": "Ammantaa fi Jireenya",
        "subtitle": "Qabannoo hojjetan siftuu guutummaa magaalaa",
        "searchPlaceholder": "Ammantaa, bilbila, lakkoofsa eenyummaa, kutaa barbaadi…",
        "empty": "Qabannoon hojjetan ykn siftuu hin jiru",
        "noMatch": "Barbaacha keetiin walsimu ammantaa hin argamne",
        "showing": "Qabannoo {{count}} agarsiifama",
        "statusActive": "Hojjetan",
        "statusUpcoming": "Siftuu",
        "phone": "Bilbila",
        "idNumber": "Lakkoofsa eenyummaa",
        "nationality": "Lammummaa",
        "room": "Kutaa {{room}}",
        "nights": "{{count}} halkan",
    },
    "more": {
        "title": "Offiserii",
        "rolePolice": "Poolisii",
        "language": "Afaan",
        "about": "Waa'ee",
        "aboutText": "Appiin mojulaa poolisii addaa haala kutaawwan iddoo jeedinsaa fi ammantaa galmeffaman guutummaa magaalaa to'achuuf kan qophaa'edha.",
        "logout": "Ba'i",
    },
    "rank": {
        "ADMIN": "Hogganaa Poolisii",
        "DETECTIVE": "Diteektiivii",
        "OFFICER": "Offiserii",
        "VIEWER": "Ilchaaf",
    },
    "common": {
        "errorGeneric": "Dogoggorri uumameera",
        "retry": "Irra deebi'i yaali",
        "refresh": "Haaromsi",
    },
}

TRANSLATIONS = {"en": EN, "am": AM, "om": OM}


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flatten(v, prefix=key + "."))
        else:
            out[key] = v
    return out


def get_at(d, dotted):
    cur = d
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def main():
    # 1. Collect every static t("...") key used by the police-app components
    comp_dirs = [
        ROOT / "src/components/police-app",
        ROOT / "src/app/police-app",
    ]
    used = set()
    pat = re.compile(r"""[\s(\{]t\(\s*["']([A-Za-z0-9_.]+)["']""")
    for d in comp_dirs:
        for f in d.rglob("*.tsx"):
            text = f.read_text(encoding="utf-8")
            for m in pat.finditer(text):
                used.add(m.group(1))
    # dynamic keys set explicitly (rank badges)
    for r in ("ADMIN", "DETECTIVE", "OFFICER", "VIEWER"):
        used.add(f"rank.{r}")

    # keys are relative to the policeApp namespace
    def in_ns(key):
        return key.startswith("policeApp.") or not key.split(".")[0] in {
            "rooms",
            "guests",
            "home",
            "nav",
            "login",
            "more",
            "rank",
            "common",
        }

    ns_keys = sorted(
        k if k.startswith("policeApp.") else f"policeApp.{k}"
        for k in used
        if (k.split(".")[0] in {"rooms", "guests", "home", "nav", "login", "more", "rank", "common"}) or k.startswith("policeApp.")
    )

    print(f"Found {len(ns_keys)} distinct t() keys used by police-app components")

    # 2. Insert namespace into each locale and verify
    failed = False
    for lang, trans in TRANSLATIONS.items():
        path = LOCALES / f"{lang}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["policeApp"] = trans
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        # verify against written file
        reloaded = json.loads(path.read_text(encoding="utf-8"))
        missing = [k for k in ns_keys if get_at(reloaded, k) is None]
        flat = flatten(trans)
        extra = [k for k in flat if f"policeApp.{k}" not in set(ns_keys)]
        if missing:
            failed = True
            print(f"[{lang}] MISSING KEYS: {missing}")
        else:
            print(f"[{lang}] policeApp namespace written; all {len(ns_keys)} keys resolve"
                  + (f" (unused keys: {extra})" if extra else " (no unused keys)"))

    if failed:
        sys.exit(1)
    print("OK: policeApp i18n namespace added to en/am/om with full key coverage")


if __name__ == "__main__":
    main()
