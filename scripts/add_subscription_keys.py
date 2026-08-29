#!/usr/bin/env python3
"""Add new subscription i18n keys for banner and lockout page to all 3 locale files."""
import json

NEW_KEYS = {
    "en": {
        # Banner keys
        "bannerExpiredTitle": "SUBSCRIPTION EXPIRED — PAYMENT OVERDUE",
        "bannerWarningTitle": "Subscription Expiring Soon",
        "bannerExpiredDesc": "Your subscription expired {{days}} day{{plural}} ago. A late payment penalty of {{percent}}% has been applied. Please pay immediately to avoid service suspension.",
        "bannerWarningDesc": "{{days}} day{{plural}} remaining. Please renew before expiry to avoid penalties.",
        "bannerDaysOverdue": "{{days}}d overdue",
        "bannerDaysLeft": "{{days}}d left",
        # Lockout keys
        "lockoutTitleSuspended": "Service Suspended",
        "lockoutTitleExpired": "Subscription Expired",
        "lockoutDescSuspended": "Your guesthouse management service has been suspended due to unpaid subscription. Please contact the administrator to renew your subscription.",
        "lockoutDescExpired": "Your guesthouse management service has expired and is in the grace period. Please contact the administrator to renew your subscription.",
        "lockoutSuspendedFor_one": "Suspended for {{days}} day",
        "lockoutSuspendedFor_other": "Suspended for {{days}} days",
        "lockoutExpiredRemaining_one": "Expired: {{days}} day remaining",
        "lockoutExpiredRemaining_other": "Expired: {{days}} days remaining",
        "lockoutLblGuesthouse": "Guesthouse:",
        "lockoutLblOwner": "Owner:",
        "lockoutLblCycle": "Cycle:",
        "lockoutLblAmountDue": "Amount Due:",
        "lockoutContactAdmin": "Contact admin",
        "lockoutLblExpired": "Expired:",
        "lockoutContact": "Contact your administrator to renew: <strong>{{phone}}</strong>",
        "lockoutDefaultAdmin": "system admin",
    },
    "am": {
        # Banner keys
        "bannerExpiredTitle": "የይዞታ ጊዜው አልፎ ነበር — ክፍያ ጊዜው አልፏል",
        "bannerWarningTitle": "ይዞታው በቅርቡ ይዞታው ይጨርሳል",
        "bannerExpiredDesc": "ይዞታዎ ከ{{days}} ቀናት በፊት አልፏል። {{percent}}% የዘገየ ክፍያ ተቀጥሯል። አገልግሎቱን ለመቀጠል አስቸኳይ ይከፍሉ።",
        "bannerWarningDesc": "{{days}} ቀናት ቀርቷል። ቅጣት ለመቀነሳ ከጊዜው በፊት ይገነቡ።",
        "bannerDaysOverdue": "{{days}}ቀ አልፏል",
        "bannerDaysLeft": "{{days}}ቀ ቀርቷል",
        # Lockout keys
        "lockoutTitleSuspended": "አገልግሎቱ ተቋርጧል",
        "lockoutTitleExpired": "ይዞታው አልፏል",
        "lockoutDescSuspended": "የበጎ አድራጊ አገልግሎትዎ ምንም ክፍያ ያልተከፈለበት ይዞታ ምክንያት ተቋርጧል። እባክዎ አስተዳዳሪውን ያነጋግሩ ይዞታዎን ለማዘመን።",
        "lockoutDescExpired": "የበጎ አድራጂ አገልግሎትዎ አልፎ በጸጥታ ጊዜ ውስጥ ነው። እባክዎ አስተዳዳሪውን ያነጋግሩ ይዞታዎን ለማዘመን።",
        "lockoutSuspendedFor_one": "ከ{{days}} ቀን በፊት ተቋርጧል",
        "lockoutSuspendedFor_other": "ከ{{days}} ቀናት በፊት ተቋርጧል",
        "lockoutExpiredRemaining_one": "አልፏል: {{days}} ቀን ቀርቷል",
        "lockoutExpiredRemaining_other": "አልፏል: {{days}} ቀናት ቀርቷል",
        "lockoutLblGuesthouse": "በጎ አድራጂ:",
        "lockoutLblOwner": "ባለቤት:",
        "lockoutLblCycle": "ዑደት:",
        "lockoutLblAmountDue": "የሚከፈል መጠን:",
        "lockoutContactAdmin": "አስተዳዳሪውን ያነጋግሩ",
        "lockoutLblExpired": "የተወለደበት:",
        "lockoutContact": "አስተዳዳሪዎን ለማዘመን ያነጋግሩ: <strong>{{phone}}</strong>",
        "lockoutDefaultAdmin": "ስርአተ አስተዳዳሪ",
    },
    "om": {
        # Banner keys
        "bannerExpiredTitle": "Qabiyyee Dhufe — Kabajii Hafe",
        "bannerWarningTitle": "Qabiyyee Si'a Dhufaa Jira",
        "bannerExpiredDesc": "Qabiyyeen kee {{days}} guyya dura dhufeera. {{percent}}% kaffaltii dhiphinaa baay'ee ni kennameefi, tajaajila itti fufaachuuf sa'aatii dhiphinaa guutuufi eegaa.",
        "bannerWarningDesc": "{{days}} guyyaa hafe. Dhiphinaa haqaachuuf sa'aatii dhufuun qabannee eegaa.",
        "bannerDaysOverdue": "{{days}}g hafe",
        "bannerDaysLeft": "{{days}}g hafe",
        # Lockout keys
        "lockoutTitleSuspended": "Tajaajili Dhiibameera",
        "lockoutTitleExpired": "Qabiyyee Dhufeera",
        "lockoutDescSuspended": "Tajaajila bunaa tokkummaa keenya kabajii hin qabneef dhiibameera. Qabiyyee kee haaraachuuuf bulchiinsaa gaaffii deebii sirraa haa gargaaru.",
        "lockoutDescExpired": "Tajaajila bunaa tokkummaa keenya dhufeefi yeroo ajaa'ibsiisaa keessatti jira. Qabiyyee kee haaraachuuuf bulchiinsaa gaaffii deebii sirraa haa gargaaru.",
        "lockoutSuspendedFor_one": "{{days}} guyyaa dhiibameera",
        "lockoutSuspendedFor_other": "{{days}} guyyaa dhiibameera",
        "lockoutExpiredRemaining_one": "Dhufe: {{days}} guyyaa hafe",
        "lockoutExpiredRemaining_other": "Dhufe: {{days}} guyyaa hafe",
        "lockoutLblGuesthouse": "Buna Tokkummaa:",
        "lockoutLblOwner": "Mataa Dhaabbii:",
        "lockoutLblCycle": "Muddee:",
        "lockoutLblAmountDue": "Kabajii Qabdu:",
        "lockoutContactAdmin": "Bulchiinsaa gaaffii deebii",
        "lockoutLblExpired": "Dhufeera:",
        "lockoutContact": "Bulchiinsaa kee haaraachuuuf gaaffii deebii: <strong>{{phone}}</strong>",
        "lockoutDefaultAdmin": "sistemaa bulchiinsa",
    },
}

LOCALE_FILES = {
    "en": "src/i18n/locales/en.json",
    "am": "src/i18n/locales/am.json",
    "om": "src/i18n/locales/om.json",
}

for lang, path in LOCALE_FILES.items():
    with open(path, "r") as f:
        data = json.load(f)
    
    if "subscription" not in data:
        data["subscription"] = {}
    
    added = []
    for key, value in NEW_KEYS[lang].items():
        if key not in data["subscription"]:
            data["subscription"][key] = value
            added.append(key)
    
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"{lang}: Added {len(added)} keys: {added}")

print("Done!")
