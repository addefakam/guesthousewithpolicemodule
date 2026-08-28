import json, os, re

BASE = "/home/z/my-project/src/i18n/locales"

# New English keys for reports namespace
new_en = {
  # Buttons (top bar)
  "btnActiveGuests": "Active Guests",
  "btnServedGuests": "Served Guests",
  "btnExportPdf": "Export PDF",

  # Date range picker
  "lblperiod": "Period",
  "lblfrom": "From",
  "lblto": "To",
  "btnApply": "Apply",
  "placeholderSelectPeriod": "Select period",
  "presetToday": "Today",
  "presetThisWeek": "This Week",
  "presetLastWeek": "Last Week",
  "presetCustomRange": "Custom Range",

  # Active Guests section
  "titleActiveUpcomingGuests": "Active & Upcoming Guests",
  "placeholderSearchActive": "Search by name, ID, phone, room...",
  "noActiveGuests": "No active or upcoming guests in this period.",
  "room": "Room",
  "paid": "Paid",
  "lblEmail": "Email",
  "lblID": "ID",
  "lblNationality": "Nationality",
  "lblAddress": "Address",
  "lblNotes": "Notes",
  "summaryActiveGuests": "{{count}} active guest(s) \u00b7 {{staying}} currently staying \u00b7 {{upcoming}} upcoming",

  # Served Guests section
  "titleGuestsServed": "Guests Served ({{from}} to {{to}})",
  "placeholderSearchServed": "Search by name, ID, phone, email...",
  "noServedGuests": "No guests served in this period.",
  "visits_one": "{{count}} visit",
  "visits_other": "{{count}} visits",
  "lastVisitLabel": "Last",
  "guestSince": "Guest since {{date}}",
  "roomHistory": "Room History ({{count}})",
  "stays_one": "{{count}} stay",
  "stays_other": "{{count}} stays",
  "idTypeNumber": "ID Type / Number",
  "summaryServedGuests": "{{count}} unique guest(s) served \u00b7 Total spent: {{total}}",
  "vip": "VIP",

  # Summary cards
  "cardTotalRevenue": "Total Revenue",
  "cardTotalExpenses": "Total Expenses",
  "cardNetProfit": "Net Profit",
  "cardAvgOccupancy": "Avg Occupancy",

  # Charts section
  "titleRevenueVsExpenses": "Revenue vs Expenses (Daily)",
  "noDailyData": "No daily data available for this range.",
  "titleExpenseBreakdown": "Expense Breakdown",
  "noExpensesRecorded": "No expenses recorded.",
  "titleReservationsByStatus": "Reservations by Status",
  "noReservations": "No reservations in this period.",
  "titleDailyRevenueTrend": "Daily Revenue Trend",
  "noDailyDataShort": "No daily data available.",

  # Table headers
  "thguestName": "Guest Name",
  "thphone": "Phone",
  "throom": "Room",
  "thstatus": "Status",
  "thcheckin": "Check-In",
  "thcheckout": "Check-Out",
  "thpaid": "Paid",
  "thidNumber": "ID Number",
  "thnationality": "Nationality",
  "thvip": "VIP",
  "thvisits": "Visits",
  "thlastVisit": "Last Visit",
  "thtotalSpent": "Total Spent",
  "thcount": "Count",
  "threvenue": "Revenue",
  "thdate": "Date",

  # Empty state
  "noReportData": "No report data",
  "noReportDataHint": "Select a date range and click Apply.",

  # Toast / error messages
  "failedLoadReports": "Failed to load reports",
  "allowPopups": "Please allow popups to export PDF",
  "reportOpenedPdf": "Report opened for PDF export",
  "defaultProviderName": "Guest House",

  # PDF export labels
  "pdfTitle": "Financial Report",
  "pdfTotalRevenue": "Total Revenue",
  "pdfTotalExpenses": "Total Expenses",
  "pdfNetProfit": "Net Profit",
  "pdfAvgOccupancy": "Avg Occupancy",
  "pdfReservationsByStatus": "Reservations by Status",
  "pdfStatus": "Status",
  "pdfCount": "Count",
  "pdfRevenue": "Revenue",
  "pdfDailyRevenueTrend": "Daily Revenue Trend",
  "pdfDate": "Date",
  "pdfExpenseBreakdown": "Expense Breakdown",
  "pdfCategory": "Category",
  "pdfAmount": "Amount",
  "pdfSaveAsPdf": "Save as PDF",
  "pdfGeneratedOn": "Generated on {{datetime}} \u00b7 GHMS Report",
  "pdfRevenueTooltip": "Revenue",
}

# Amharic translations
new_am = {
  "btnActiveGuests": "\u12a0\u1201\u1295 \u12eb\u1209 \u12a5\u1295\u130d\u12f6\u127d",
  "btnServedGuests": "\u12cb\u1235\u12a8\u129b \u12eb\u1209 \u12a5\u1295\u130d\u12f6\u127d",
  "btnExportPdf": "PDF \u12cb\u132d \u120b\u12ad",

  "lblperiod": "\u12cb\u120b\u12c8\u1218\u12f6",
  "lblfrom": "\u12a0\u1290\u1308",
  "lblto": "\u12a5\u1235",
  "btnApply": "\u12e8\u121c\u133d\u1202",
  "placeholderSelectPeriod": "\u12cb\u120b\u12c8\u1218\u12f6 \u12e8\u120d\u12ce\u1275",
  "presetToday": "\u12e8\u12a0\u1295",
  "presetThisWeek": "\u12cb\u1215 \u12f3\u1235\u12ea",
  "presetLastWeek": "\u12cb\u12f0\u129b\u12cb \u12f3\u1235\u12ea",
  "presetCustomRange": "\u12eb\u1218\u127d\u12c8\u1218 \u12cb\u120b\u12c8\u1218\u12f6",

  "titleActiveUpcomingGuests": "\u12a0\u1201\u1295 \u12a5\u1293 \u12e8\u1218\u12c8\u121d \u12eb\u1209 \u12a5\u1295\u130d\u12f6\u127d",
  "placeholderSearchActive": "\u12a0\u1290\u1208\u1209\u121d\u121d\u129b\u1275\u121d\u129b\u1215 \u1295\u120d\u1275\u134d...",
  "noActiveGuests": "\u12a5\u1293 \u12cb\u120b\u12c8\u1218\u12f6 \u12a0\u1295\u1291\u12c8\u1291 \u12a0\u1201\u1295 \u121b\u1290 \u12e8\u1218\u12c8\u121d \u12eb\u1209 \u12a5\u1295\u130d\u12f6\u127d \u1320\u1208\u121d\u12f6\u12f0\u12eb\u12f0\u1281\u1308\u127d \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295\u127d \u12a0\u12c8\u1293\u1291\u12eb\u12f0\u127d \u12a5\u1295\u120d\u12ce\u127d.",
  "room": "\u12a4\u122d",
  "paid": "\u12cb\u1270\u120b\u127d",
  "lblEmail": "\u12a8\u12b5\u1263\u12ab\u1275",
  "lblID": "\u1206\u12d3\u12f6",
  "lblNationality": "\u12a5\u12af\u1260\u1260\u129b",
  "lblAddress": "\u1232\u12f0\u1272\u1235",
  "lblNotes": "\u12eb\u1218\u12d3\u12f6\u127d",
  "summaryActiveGuests": "{{count}} \u12a0\u1201\u1295 \u12eb\u1209 \u12a5\u1295\u130d\u12f6(\u12e1) \u00b7 {{staying}} \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295 \u12a5\u1293\u1293\u12cd \u12a0\u1290\u1295\u12eb\u129b\u12f0 \u00b7 {{upcoming}} \u12e8\u1218\u12c8\u121d",

  "titleGuestsServed": "\u12cb\u1235\u12a8\u129b \u12eb\u1209 \u12a5\u1295\u130d\u12f6\u127d ({{from}} \u12a0\u1290\u1308 {{to}})",
  "placeholderSearchServed": "\u12a0\u1290\u1208\u1209\u121d\u121d\u129b\u1275\u121d\u129b\u1215 \u1295\u120d\u1275\u134d...",
  "noServedGuests": "\u12a5\u1293 \u12cb\u120b\u12c8\u1218\u12f6 \u12a0\u1295\u1291\u12c8\u1291 \u12cb\u1235\u12a8\u129b \u12eb\u1209 \u12a5\u1295\u130d\u12f6\u127d \u1320\u1208\u121d\u12f6\u12f0\u12eb\u12f0\u1281\u1308\u127d \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295\u127d \u12a0\u12c8\u1293\u1291\u12eb\u12f0\u127d \u12a5\u1295\u120d\u12ce\u127d.",
  "visits_one": "{{count}} \u12eb\u121c\u1290\u12b8\u12f6",
  "visits_other": "{{count}} \u12eb\u121c\u1290\u12b8\u12f6\u127d",
  "lastVisitLabel": "\u12cb\u12f0\u129b\u12cb",
  "guestSince": "\u12a0\u1290\u1308 {{date}} \u12cb\u1209 \u12a5\u1295\u130d\u12f6",
  "roomHistory": "\u12e8\u12a4\u122d \u1295\u12ce\u127d ({{count}})",
  "stays_one": "{{count}} \u12eb\u1272\u12ca\u1276",
  "stays_other": "{{count}} \u12eb\u1272\u12ca\u1276\u127d",
  "idTypeNumber": "\u12e8\u1206\u12d3\u12f6 \u12cb\u120b/\u1295\u12b0\u1273\u12eb\u1275",
  "summaryServedGuests": "{{count}} \u12cb\u1293\u12cc \u12eb\u1209 \u12a5\u1295\u130d\u12f6(\u12e1) \u12cb\u1235\u12a8\u129b\u127d \u00b7 \u1320\u1245\u120b\u120b \u12cb\u1270\u120b: {{total}}",
  "vip": "VIP",

  "cardTotalRevenue": "\u1320\u1245\u120b\u120b \u1308\u1262",
  "cardTotalExpenses": "\u1320\u1245\u120b\u120b \u12c8\u132a",
  "cardNetProfit": "\u12e8\u1270\u1323\u122b \u1275\u122d\u134d",
  "cardAvgOccupancy": "\u12e1\u12b5\u12eb\u12ea \u12e8\u1218\u1235\u1270\u1295\u130d\u12f6",

  "titleRevenueVsExpenses": "\u1308\u1262 \u12a5\u1293 \u12c8\u132a (\u12e8\u12a5\u1295\u121d\u129b\u12f6)",
  "noDailyData": "\u12a5\u1293 \u12cb\u120b\u12c8\u1218\u12f6 \u12cb\u1215\u12f3\u12eb\u12f0 \u12e0\u12f0\u12c8\u1275 \u12a0\u12c8\u1298\u12f0\u12f0\u1295 \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295\u127d \u12a0\u12c8\u1293\u1291\u12eb\u12f0\u127d \u12a5\u1295\u120d\u12ce\u127d.",
  "titleExpenseBreakdown": "\u12e8\u12c8\u132a \u12cb\u1234\u12f0\u122d\u127d",
  "noExpensesRecorded": "\u12c8\u132a \u12a0\u12c8\u1298\u12f0\u12f0\u1295 \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295\u127d \u12a0\u12c8\u1293\u1291\u12eb\u12f0\u127d.",
  "titleReservationsByStatus": "\u12a0\u1290\u1295\u12eb\u129b\u12f6 \u12a5\u1293 \u121b\u1235\u12eb\u12e3\u12ce\u127d",
  "noReservations": "\u12a5\u1293 \u12cb\u120b\u12c8\u1218\u12f6 \u12a0\u1295\u1291\u12c8\u1291 \u121b\u1235\u12eb\u12e3\u12ce\u127d \u1320\u1208\u121d\u12f6\u12f0\u12eb\u12f0\u1281\u1308\u127d \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295\u127d \u12a0\u12c8\u1293\u1291\u12eb\u12f0\u127d.",
  "titleDailyRevenueTrend": "\u12e8\u12a5\u1295\u121d\u129b\u12f6 \u1308\u1262 \u1295\u12ce\u12f6",
  "noDailyDataShort": "\u12e0\u12f0\u12c8\u1275 \u12a0\u12c8\u1298\u12f0\u12f0\u1295 \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295\u127d \u12a0\u12c8\u1293\u1291\u12eb\u12f0\u127d.",

  "thguestName": "\u12e8\u12ab\u1209 \u12a5\u1295\u130d\u12f6 \u1295\u12b0\u1273\u12eb\u1275",
  "thphone": "\u1241\u1209\u12eb\u1275",
  "throom": "\u12a4\u122d",
  "thstatus": "\u12cb\u1290\u1295\u12eb\u129b\u12f6",
  "thcheckin": "\u12eb\u1233\u1235\u127d",
  "thcheckout": "\u12cb\u1233\u1235 \u12a8\u1295\u120b",
  "thpaid": "\u12cb\u1270\u120b\u127d",
  "thidNumber": "\u12e8\u1206\u12d3\u12f6 \u1295\u12b0\u1273\u12eb\u1275",
  "thnationality": "\u12a5\u12af\u1260\u1260\u129b",
  "thvip": "VIP",
  "thvisits": "\u12eb\u121c\u1290\u12b8\u12f6\u127d",
  "thlastVisit": "\u12cb\u12f0\u129b\u12cb \u12eb\u121c\u1290\u12b8\u12f6",
  "thtotalSpent": "\u1320\u1245\u120b\u120b \u12cb\u1270\u120b",
  "thcount": "\u1295\u12b0\u1273\u12eb\u1275",
  "threvenue": "\u1308\u1262",
  "thdate": "\u1295\u12cd\u1262\u12f6",

  "noReportData": "\u122a\u1356\u122d\u1276 \u12a0\u12c8\u1298\u12f0\u12f0\u1295 \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295",
  "noReportDataHint": "\u12cb\u120b\u12c8\u1218\u12f6 \u12e8\u120d\u12ce\u1275 \u12a5\u1293 \u12e8\u121c\u133d\u1202 \u12cb\u1243\u1295\u1295\u1295\u1295\u1295 \u12a0\u1243\u1295\u1295\u1295 \u12a4\u1243\u1295\u1295\u1295.",

  "failedLoadReports": "\u122a\u1356\u122d\u1276\u127d \u12a5\u1295\u1255\u1275 \u12a0\u12c8\u1298\u12f0\u12f0\u1295 \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u12f0\u1295",
  "allowPopups": "PDF \u12cb\u132d \u12cb\u1208\u129b\u12f6 \u1261\u1272\u1276\u12eb\u1263 \u12e8\u120d\u12ce\u1275",
  "reportOpenedPdf": "\u122a\u1356\u122d\u1276 PDF \u12cb\u132d \u12cb\u1208\u129b\u12f6 \u12a5\u1290\u1295\u12eb\u129b\u12f6 \u12a0\u12c8\u1298\u12f0\u12f0\u1295",
  "defaultProviderName": "\u12cb\u1209 \u12a4\u122d",

  "pdfTitle": "\u12e8\u1306\u12a8\u1296\u1281 \u122a\u1356\u122d\u1276",
  "pdfTotalRevenue": "\u1320\u1245\u120b\u120b \u1308\u1262",
  "pdfTotalExpenses": "\u1320\u1245\u120b\u120b \u12c8\u132a",
  "pdfNetProfit": "\u12e8\u1270\u1323\u122b \u1275\u122d\u134d",
  "pdfAvgOccupancy": "\u12e1\u12b5\u12eb\u12ea \u12e8\u1218\u1235\u1270\u1295\u130d\u12f6",
  "pdfReservationsByStatus": "\u12a0\u1290\u1295\u12eb\u129b\u12f6 \u12a5\u1293 \u121b\u1235\u12eb\u12e3\u12ce\u127d",
  "pdfStatus": "\u12cb\u1290\u1295\u12eb\u129b\u12f6",
  "pdfCount": "\u1295\u12b0\u1273\u12eb\u1275",
  "pdfRevenue": "\u1308\u1262",
  "pdfDailyRevenueTrend": "\u12e8\u12a5\u1295\u121d\u129b\u12f6 \u1308\u1262 \u1295\u12ce\u12f6",
  "pdfDate": "\u1295\u12cd\u1262\u12f6",
  "pdfExpenseBreakdown": "\u12e8\u12c8\u132a \u12cb\u1234\u12f0\u122d\u127d",
  "pdfCategory": "\u121b\u12c8\u1228",
  "pdfAmount": "\u1295\u12b0\u1273\u12eb\u1275",
  "pdfSaveAsPdf": "PDF \u12a0\u1295\u1270\u127d",
  "pdfGeneratedOn": "\u12cb\u1298\u12f0\u12f0\u1295 \u12a0\u12c8\u1291\u12f0\u12eb\u12f0\u1295 {{datetime}} \u00b7 GHMS \u122a\u1356\u122d\u1276",
  "pdfRevenueTooltip": "\u1308\u1262",
}

# Oromo translations
new_om = {
  "btnActiveGuests": "Keessummoota Ammaa",
  "btnServedGuests": "Keessummoota Nabame",
  "btnExportPdf": "PDF Bansiisa",

  "lblperiod": "Yeroo",
  "lblfrom": "Kan",
  "lblto": "Haa",
  "btnApply": "Itti hojjeti",
  "placeholderSelectPeriod": "Yeroo filadhu",
  "presetToday": "Har'aa",
  "presetThisWeek": "Torban Kana",
  "presetLastWeek": "Torban Darbe",
  "presetCustomRange": "Baay'ee Filachu",

  "titleActiveUpcomingGuests": "Keessummoota Ammaa fi Dhoobaa",
  "placeholderSearchActive": "Maqaa, ID, bilbila, qubee...hangaadin",
  "noActiveGuests": "Yeroon kana keessatti keessumoota ammaa ykn dhoobaa hin jiru.",
  "room": "Qubee",
  "paid": "Kan paida ta'e",
  "lblEmail": "Eemeelii",
  "lblID": "ID",
  "lblNationality": "Biyya",
  "lblAddress": "Teessoo",
  "lblNotes": "Yaadachiisa",
  "summaryActiveGuests": "{{count}} keessummootta(ota) \u00b7 {{staying}} amma taa'ani \u00b7 {{upcoming}} dhoobaa",

  "titleGuestsServed": "Keessummoota Nabame ({{from}} hanga {{to}})",
  "placeholderSearchServed": "Maqaa, ID, bilbila, eemeelii...hangaadin",
  "noServedGuests": "Yeroon kana keessatti keessumoota nabame hin jiru.",
  "visits_one": "{{count}} deemsa",
  "visits_other": "{{count}} deemsa",
  "lastVisitLabel": "Dhumarratti",
  "guestSince": "Gooftuu {{date}} irraa eegalee",
  "roomHistory": "Seenaa Qubee ({{count}})",
  "stays_one": "{{count}} taa'umsa",
  "stays_other": "{{count}} taa'umsa",
  "idTypeNumber": "Gosa ID / Lakkoofsa",
  "summaryServedGuests": "{{count}} keessummootta adda addaa(ota) nabame \u00b7 Galii waliigalaa: {{total}}",
  "vip": "VIP",

  "cardTotalRevenue": "Galii Waliigalaa",
  "cardTotalExpenses": "Baasii Waliigalaa",
  "cardNetProfit": "Bu'aa Qulqulluu",
  "cardAvgOccupancy": "Harkisa Waliigalaa",

  "titleRevenueVsExpenses": "Galii vs Baasii (Guyyaa",
  "noDailyData": "Rangii kanaaf odeeffannoo guyyaa hin jiru.",
  "titleExpenseBreakdown": "Qorannoo Baasii",
  "noExpensesRecorded": "Baasii galmeessanii hin jiru.",
  "titleReservationsByStatus": "Beellama Sataa Itti Base",
  "noReservations": "Yeroon kana keessatti beellama hin jiru.",
  "titleDailyRevenueTrend": "Sirrii Galii Guyyaa",
  "noDailyDataShort": "Odeeffannoo guyyaa hin jiru.",

  "thguestName": "Maqaa Gooftuu",
  "thphone": "Bilbila",
  "throom": "Qubee",
  "thstatus": "Haalli",
  "thcheckin": "Seenuu",
  "thcheckout": "Bahi",
  "thpaid": "Kan Paida Ta'e",
  "thidNumber": "Lakkoofsa ID",
  "thnationality": "Biyya",
  "thvip": "VIP",
  "thvisits": "Deemsa",
  "thlastVisit": "Seena Dhumaa",
  "thtotalSpent": "Galii Waliigalaa",
  "thcount": "Lakkoofsa",
  "threvenue": "Galii",
  "thdate": "Guyyaa",

  "noReportData": "Odeeffannoo gabaasaa hin jiru",
  "noReportDataHint": "Rangii yeroo filadhu, Itti hojjeti cuunfaa.",

  "failedLoadReports": "Gabaasa loads goomii",
  "allowPopups": "PDF baniisuuf popup ebisi",
  "reportOpenedPdf": "Gabaasa PDF baniisuuf banameera",
  "defaultProviderName": "Mana Qubee",

  "pdfTitle": "Gabaasa Finansii",
  "pdfTotalRevenue": "Galii Waliigalaa",
  "pdfTotalExpenses": "Baasii Waliigalaa",
  "pdfNetProfit": "Bu'aa Qulqulluu",
  "pdfAvgOccupancy": "Harkisa Waliigalaa",
  "pdfReservationsByStatus": "Beellama Sataa Itti Base",
  "pdfStatus": "Haalli",
  "pdfCount": "Lakkoofsa",
  "pdfRevenue": "Galii",
  "pdfDailyRevenueTrend": "Sirrii Galii Guyyaa",
  "pdfDate": "Guyyaa",
  "pdfExpenseBreakdown": "Qorannoo Baasii",
  "pdfCategory": "Gosa",
  "pdfAmount": "Lakkoofsa",
  "pdfSaveAsPdf": "PDF Akka Gahaatti Olkaa'i",
  "pdfGeneratedOn": "Argame {{datetime}} \u00b7 Gabaasa GHMS",
  "pdfRevenueTooltip": "Galii",
}

for lang, new_keys in [("en", new_en), ("am", new_am), ("om", new_om)]:
    path = os.path.join(BASE, f"{lang}.json")
    with open(path, "r") as f:
        data = json.load(f)
    
    if "reports" not in data:
        data["reports"] = {}
    
    added = 0
    for k, v in new_keys.items():
        if k not in data["reports"]:
            data["reports"][k] = v
            added += 1
    
    # Remove fallback anti-patterns if any exist in the component references
    # (the t('key', 'Fallback') pattern is being replaced with just t('key'))
    
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"{lang}: {added} new keys added, total reports keys: {len(data['reports'])}")

print("Done!")
