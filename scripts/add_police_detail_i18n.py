#!/usr/bin/env python3
"""Add policeDashboard.detail drill-down keys to en/am/om locale files (Task 13 redo).
Idempotent: skips locales that already have the detail block."""
import json, sys

BASE = "/home/z/my-project/guesthousewithpolicemodule/src/i18n/locales"

DETAIL = {
    "en": {
        "hint": "Click any card to see the details behind the number",
        "providersTitle": "All Guesthouses",
        "approvedTitle": "Approved Guesthouses",
        "pendingTitle": "Guesthouses Pending Approval",
        "roomsTitle": "Room Availability",
        "activeTitle": "Active & Upcoming Stays",
        "revenueTitle": "Revenue Breakdown",
        "subtitleProviders": "{{count}} guesthouses registered city-wide",
        "subtitleApproved": "{{count}} guesthouses currently approved",
        "subtitlePending": "{{count}} guesthouses awaiting police approval",
        "subtitleRoomsCount": "Live status of {{count}} rooms across all guesthouses",
        "subtitleActiveCount": "{{count}} reservations currently checked in or upcoming",
        "searchPlaceholder": "Search by guesthouse name...",
        "searchGuestPlaceholder": "Search by guest, phone, ID, room or guesthouse...",
        "filterAll": "All",
        "filterActive": "Active",
        "filterUpcoming": "Upcoming",
        "colActive": "Active",
        "colAvailable": "Available",
        "colOccupied": "Occupied",
        "colReserved": "Reserved",
        "colMaintenance": "Maintenance",
        "colUtilization": "Utilization",
        "colNights": "Nights",
        "colRoom": "Room",
        "statusActive": "Active",
        "statusUpcoming": "Upcoming",
        "secondGuest": "+ {{name}}",
        "roomsSummaryLabel": "City-wide room status",
        "byProviderLabel": "By guesthouse",
        "totalRevenueLabel": "Total city-wide revenue",
        "perProviderLabel": "Revenue by guesthouse",
        "emptyProviders": "No guesthouses match your search",
        "emptyRooms": "No room data available",
        "emptyActive": "No active or upcoming reservations right now",
        "emptyRevenue": "No revenue recorded yet",
    },
    "am": {
        "hint": "ቁጥሩ የሚያመለክተውን ዝርዝር ለማየት ማንኛውንም ካርድ ይንኩ",
        "providersTitle": "ሁሉም ሆቴሎች",
        "approvedTitle": "የጸደቁ ሆቴሎች",
        "pendingTitle": "የፖሊስ ፈቃድ በመጠባበቅ ላይ ያሉ ሆቴሎች",
        "roomsTitle": "የክፍል ዝግጁነት",
        "activeTitle": "ንቁና መጪ ማረፊያዎች",
        "revenueTitle": "የገቢ መከፋፈል",
        "subtitleProviders": "በመላ ከተማ የተመዘገቡ {{count}} ሆቴሎች",
        "subtitleApproved": "በአሁኑ ጊዜ የጸደቁ {{count}} ሆቴሎች",
        "subtitlePending": "የፖሊስ ፈቃድ በመጠባበቅ ላይ ያሉ {{count}} ሆቴሎች",
        "subtitleRoomsCount": "በሁሉም ሆቴሎች ውስጥ ያሉ {{count}} ክፍሎች የቅጽበታዊ ሁኔታ",
        "subtitleActiveCount": "አሁን የገቡወይም መጪ የሆኑ {{count}} ቀጠሮዎች",
        "searchPlaceholder": "በሆቴል ስም ይፈልጉ...",
        "searchGuestPlaceholder": "በእንግዳ፣ በስልክ፣ በመታወቂያ፣ በክፍል ወይም በሆቴል ይፈልጉ...",
        "filterAll": "ሁሉም",
        "filterActive": "ንቁ",
        "filterUpcoming": "መጪ",
        "colActive": "ንቁ",
        "colAvailable": "ክፍት",
        "colOccupied": "የተያዘ",
        "colReserved": "ቀድሞ የተያዘ",
        "colMaintenance": "ጥገና",
        "colUtilization": "አጠቃቀም",
        "colNights": "ሌሊቶች",
        "colRoom": "ክፍል",
        "statusActive": "ንቁ",
        "statusUpcoming": "መጪ",
        "secondGuest": "+ {{name}}",
        "roomsSummaryLabel": "የክፍሎች ሁኔታ በመላ ከተማ",
        "byProviderLabel": "በሆቴል",
        "totalRevenueLabel": "በመላ ከተማ ጠቅላላ ገቢ",
        "perProviderLabel": "ገቢ በሆቴል",
        "emptyProviders": "ከፍለጋዎ ጋር የሚስማማ ሆቴል አልተገኘም",
        "emptyRooms": "የክፍል መረጃ የለም",
        "emptyActive": "አሁን ንቁ ወይም መጪ ቀጠሮዎች የሉም",
        "emptyRevenue": "እስካሁን ገቢ አልተመዘገበም",
    },
    "om": {
        "hint": "Lakkoofsi maanaa isaa qabu argachuuf kaardii kamiyyuu tuqi",
        "providersTitle": "Hooteelota Hunda",
        "approvedTitle": "Hooteelota Hayyamaman",
        "pendingTitle": "Hayyama Poolisii Eegachaa Jiran",
        "roomsTitle": "Haala Kutaawwan",
        "activeTitle": "Qabannoo Hojjetan fi Siftuu",
        "revenueTitle": "Qooda Galii",
        "subtitleProviders": "Magaalaa guutuutti galmeessaman {{count}} hooteelota",
        "subtitleApproved": "Amma hayyamaman {{count}} hooteelota",
        "subtitlePending": "Hayyama Poolisii eegachaa jiran {{count}} hooteelota",
        "subtitleRoomsCount": "Haala ammaa kutaawwan {{count}} hooteelota hunda keessaa",
        "subtitleActiveCount": "Qabannoo {{count}} amma seenani ykn siftuu",
        "searchPlaceholder": "Maqaa hooteelaa barbaadi...",
        "searchGuestPlaceholder": "Ammantaa, bilbila, lakkoofsa eenyummaa, kutaa ykn hooteelaan barbaadi...",
        "filterAll": "Hunda",
        "filterActive": "Hojjetan",
        "filterUpcoming": "Siftuu",
        "colActive": "Hojjetan",
        "colAvailable": "Duwwaa",
        "colOccupied": "Qabameera",
        "colReserved": "Dursee Qabame",
        "colMaintenance": "Suphaa Irra",
        "colUtilization": "Itti fayyadama",
        "colNights": "Halkan",
        "colRoom": "Kutaa",
        "statusActive": "Hojjetan",
        "statusUpcoming": "Siftuu",
        "secondGuest": "+ {{name}}",
        "roomsSummaryLabel": "Haala kutaawwan magaalaa guutuutti",
        "byProviderLabel": "Hooteelaa qabee",
        "totalRevenueLabel": "Galii waliigalaa magaalaa",
        "perProviderLabel": "Galii hooteelaa qabee",
        "emptyProviders": "Barbaacha keetiin walsimu hooteelaa hin argamne",
        "emptyRooms": "Odeeffannoo kutaa hin jiru",
        "emptyActive": "Ammatti qabannoo hojjetan ykn siftuu hin jiru",
        "emptyRevenue": "Hanga ammaatti galii galmeeffame hin jiru",
    },
}

REQUIRED = set(DETAIL["en"].keys())

for loc, block in DETAIL.items():
    path = f"{BASE}/{loc}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    pd = data.setdefault("policeDashboard", {})
    if "detail" in pd and set(pd["detail"].keys()) >= REQUIRED:
        print(f"{loc}: detail block already present — skip")
        continue
    pd["detail"] = block
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{loc}: added {len(block)} detail keys")

# ── Verify every detail.* key referenced in components resolves in all locales ──
import re, glob
used = set()
for fp in glob.glob(f"{BASE}/../../../src/components/**/*.tsx", recursive=True):
    with open(fp, encoding="utf-8") as f:
        src = f.read()
    if 'useTranslation("policeDashboard")' in src or '"policeDashboard"' in src:
        used |= {m for m in re.findall(r't\("detail\.([a-zA-Z]+)"', src)}
missing = []
for loc in DETAIL:
    d = json.load(open(f"{BASE}/{loc}.json", encoding="utf-8"))
    have = d.get("policeDashboard", {}).get("detail", {})
    missing += [f"{loc}:{k}" for k in used if k not in have]
if missing:
    print("MISSING:", missing)
    sys.exit(1)
print(f"verified: all {len(used)} used detail.* keys resolve in en/am/om")
