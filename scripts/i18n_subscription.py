#!/usr/bin/env python3
"""
i18n script for my-subscription-page.tsx
Namespace: "subscription"
"""

import json

LOCALE_DIR = "/home/z/my-project/src/i18n/locales"

# ── ENGLISH KEYS ──
en = {
  "pageTitle": "Subscription & Payments",
  "pageSubtitle": "Manage your subscription, view plans, and submit payments",
  "btnRefresh": "Refresh",

  # Empty / no subscription
  "noSubFound": "No subscription found",
  "noSubContact": "Contact the administrator",

  # Pricing info banner
  "pricingCalc": "{{cur}}{{price}} per bed/day x {{beds}} bed{{plural}} = {{total}}/day",
  "noRoomsConfigured": "No rooms configured yet. Add rooms to see your subscription pricing.",
  "bedsCalcDescription": "Your subscription is calculated based on {{beds}} total bed{{plural}} across all your rooms.",
  "ratesLocked": "Rates Locked",

  # Status card
  "statusACTIVE": "ACTIVE",
  "statusWARNING": "WARNING",
  "statusEXPIRED": "EXPIRED",
  "statusSUSPENDED": "SUSPENDED",
  "freeTrial": "Free Trial",
  "lblCurrentPlan": "Current Plan",
  "lblAmount": "Amount",
  "lblExpiresOn": "Expires On",
  "lblProvider": "Provider",

  # Penalty alarm
  "penaltyTitle": "PAYMENT OVERDUE",
  "penaltyDesc": "Your subscription expired {{days}} day{{plural}} ago. A {{percent}}% late payment penalty has been applied.",
  "penaltyBase": "Base",
  "penaltyLabel": "Penalty",
  "penaltyTotalDue": "TOTAL DUE",

  # Warning message
  "warningTitle": "Subscription expiring soon!",
  "warningDesc": "Please select a plan below and submit your payment to continue using the service.",

  # Available plans
  "availablePlans": "Available Plans",
  "plansCount_one": "{{count}} plan available",
  "plansCount_other": "{{count}} plans available",
  "noPlansYet": "No plans available yet",
  "noPlansContact": "Contact the administrator for payment instructions",
  "planDays": "{{days}} days",
  "perMonth": "~{{amount}} {{cur}}/month",
  "bedsBreakdown": "{{cur}}{{price}} x {{beds}} beds x {{days}} days",
  "badgeCurrent": "Current",
  "badgeActive": "Active",
  "btnPayNow": "Pay Now",

  # Payment history
  "paymentHistory": "Payment History",
  "noPaymentRecords": "No payment records yet",
  "payStatusChapaPending": "Chapa Pending",
  "payStatusOverdue": "Payment Overdue",
  "payStatusOverdueSoon": "Overdue (Will apply soon)",
  "payStatusPending": "Pending",
  "payStatusVerified": "Verified",

  # Chapa banners
  "chapaVerifyingTitle": "Verifying Payment with Chapa...",
  "chapaVerifyingDesc": "Please wait while we confirm your payment with Chapa. This takes a few seconds.",
  "chapaVerifiedTitle": "Payment Verified & Active",
  "chapaVerifiedDesc": "Your Chapa payment has been confirmed. Your subscription is now active!",
  "chapaDelayedTitle": "Verification Delayed",
  "chapaDelayedDesc": "Could not verify immediately. Don't worry — the payment will be confirmed automatically via our backend. No action needed.",
  "chapaPendingTitle": "Payment Not Yet Confirmed",
  "chapaPendingDesc": "Chapa hasn't confirmed the payment yet. It will be verified automatically once confirmed.",
  "chapaProcessingTitle": "Payment Processing",
  "chapaProcessingDesc": "Your Chapa payment was received. We are verifying it now — your subscription will be activated shortly.",

  # Pay dialog
  "dlgPayTitle": "Pay for Subscription",
  "dlgPayDescChapa": "You will be redirected to Chapa's secure payment page to complete payment online (Telebirr, CBE Birr, bank cards, etc.).",
  "dlgPayDescOffline": "Complete your payment offline, then fill in the details below. Your subscription will be activated after verification.",
  "lblAmount": "Amount",
  "amountAutoCalc": "Auto-calculated based on your total beds and selected plan",
  "lblPaymentMethod": "Payment Method",
  "lblReferenceNumber": "Reference / Transaction Number",
  "referencePlaceholder": "e.g., FT25632i5632k",
  "referenceHint": "Enter the transaction/reference number from your payment receipt",
  "lblAdditionalNotes": "Additional Notes",
  "notesPlaceholder": "Any additional information (optional)",
  "chapaMethodInfo": "Pay securely via Telebirr, CBE Birr, bank cards, and more",
  "chapaRedirectInfo": 'Click \"Pay with Chapa\" below. You\'ll be redirected to Chapa\'s secure checkout to complete your payment. After paying, you\'ll return here and your subscription activates automatically.',
  "btnCancel": "Cancel",
  "btnRedirecting": "Redirecting...",
  "btnSubmitting": "Submitting...",
  "btnPayWithChapa": "Pay with Chapa",
  "btnSubmitPayment": "Submit Payment",

  # Payment method labels (select values)
  "payMethodCHAPA": "Pay Online (Chapa)",
  "payMethodCASH": "Cash",
  "payMethodBANK_TRANSFER": "Bank Transfer",
  "payMethodTELEBIRR": "Telebirr",
  "payMethodCBE_BIRR": "CBE Birr",
  "payMethodOTHER": "Other",

  # Toast messages
  "toastFailedLoad": "Failed to load subscription info",
  "toastChapaCompleted": "Chapa payment completed! Verifying your payment...",
  "toastPaymentVerified": "Your subscription is now active.",
  "toastChapaPending": "Payment not yet confirmed by Chapa. We'll keep checking.",
  "toastVerifyFailed": "Verification failed. The webhook will process it shortly.",
  "toastInvalidPayment": "Invalid payment details",
  "toastNoChapaUrl": "Failed to get Chapa checkout URL",
  "toastChapaInitFailed": "Failed to initiate Chapa payment",
  "toastFillRequired": "Please fill in all required fields",
  "toastRefRequired": "Transfer reference number is required",
  "toastPaymentSubmitted": "Payment submitted! Awaiting verification.",
  "toastSubmitFailed": "Failed to submit",

  # Days remaining (from lib/subscription)
  "daysRemaining_one": "{{count}} day remaining",
  "daysRemaining_other": "{{count}} days remaining",
  "expiresToday": "Expires today",
  "expiredAgo_one": "Expired {{count}} day ago",
  "expiredAgo_other": "Expired {{count}} days ago",

  # Cycle names
  "cycleMONTHLY": "Monthly",
  "cycleQUARTERLY": "Quarterly",
  "cycleSEMI_ANNUAL": "Semi-Annual",
  "cycleYEARLY": "Yearly",
}

# ── AMHARIC KEYS ──
am = {
  "pageTitle": "የምርመራ እና ክፍያ አገልግሎት",
  "pageSubtitle": "የምርመራ አገልግሎትዎን ያስተዳድሩ፣ እቅዶችን ይመልከቱ፣ ክፍያ ያስገቡ",
  "btnRefresh": "አድስ",

  "noSubFound": "የምርመራ አገልግሎት አልተገኘም",
  "noSubContact": "አስተዳዳሪውን ያግኙ",

  "pricingCalc": "{{cur}}{{price}} በመኝቻ/ቀን x {{beds}} መኝቻ{{plural}} = {{total}}/ቀን",
  "noRoomsConfigured": "እራሶች አልተዘጋጁም። የምርመራ ዋጋ ለማየት ክፍሎች ያክሉ።",
  "bedsCalcDescription": "የምርመራ አገልግሎትዎ በሁሉም ክፍሎችዎ ውስጥ {{beds}} ጠቅላላ መኝቻ{{plural}} ላይ ይሰላል።",
  "ratesLocked": "ዋጋዎች ተቆልፈዋል",

  "statusACTIVE": "ንቁ",
  "statusWARNING": "ማንቂ",
  "statusEXPIRED": "ጊዜው ያለፈ",
  "statusSUSPENDED": "ታግዷል",
  "freeTrial": "ነፃ ሙከራ",
  "lblCurrentPlan": "የአሁኑ እቅድ",
  "lblAmount": "መጠን",
  "lblExpiresOn": "የሚያበቃበት",
  "lblProvider": "አቅራቢያ",

  "penaltyTitle": "ክፍያ ጊዜው ያለፈ",
  "penaltyDesc": "የምርመራ አገልግሎትዎ ከ{{days}} ቀናት{{plural}} በፊት ጊዜው ያለፈ። {{percent}}% የዘገየ ክፍያ ቅጠን ተተግብሯል።",
  "penaltyBase": "መሰረት",
  "penaltyLabel": "ቅጠን",
  "penaltyTotalDue": "ጠቅላላ የሚከፈለው",

  "warningTitle": "የምርመራ አገልግሎት በቅርበት ያበቃል!",
  "warningDesc": "እቅድ ይምረጡ እና አገልግሎቱን ለመቀጠል ክፍያ ያስገቡ።",

  "availablePlans": "የሚገኙ እቅዶች",
  "plansCount_one": "{{count}} እቅድ ይገኛል",
  "plansCount_other": "{{count}} እቅዶች ይገኛሉ",
  "noPlansYet": "እቅዶች አልተገኙም",
  "noPlansContact": "ለክፍያ መመሪያ አስተዳዳሪውን ያግኙ",
  "planDays": "{{days}} ቀናት",
  "perMonth": "~{{amount}} {{cur}}/ወር",
  "bedsBreakdown": "{{cur}}{{price}} x {{beds}} መኝቻ x {{days}} ቀናት",
  "badgeCurrent": "የአሁኑ",
  "badgeActive": "ንቁ",
  "btnPayNow": "አሁን ይከፍሉ",

  "paymentHistory": "የክፍያ ታሪክ",
  "noPaymentRecords": "የክፍያ መዝገቦች ገና የሉም",
  "payStatusChapaPending": "ቻፓ በመጠባበቅ ላይ",
  "payStatusOverdue": "ክፍያ ጊዜው ያለፈ",
  "payStatusOverdueSoon": "ዘገየ (በቅርበት ይተገበራል)",
  "payStatusPending": "በመጠባበቅ ላይ",
  "payStatusVerified": "ተረጋግጧል",

  "chapaVerifyingTitle": "ቻፓ ጋር ክፍያ በማረጋገጥ ላይ...",
  "chapaVerifyingDesc": "ቻፓ ጋር ክፍዹን ለማረጋገጥ እባክዎ ይጠብቁ። ይህ ጥቂት ሰከንዶች ይወስዳል።",
  "chapaVerifiedTitle": "ክፍያ ተረጋግጧል እና ንቁ ሆኗል",
  "chapaVerifiedDesc": "የቻፓ ክፍያዎ ተረጋግጧል። የምርመራ አገልግሎትዎ አሁን ንቁ ነው!",
  "chapaDelayedTitle": "ማረጋገጥ ዘገየ",
  "chapaDelayedDesc": "አፈጣጠሙ ሊረጋገጥ አልቻለም። አትጨነቁ — ክፍያው በቅርበት በአስተዳዳሪው ስርዓት በራስ-ሰር ይረጋገጣል።",
  "chapaPendingTitle": "ክፍያ ገና አልተረጋገጠም",
  "chapaPendingDesc": "ቻፓ ክፍያውን ገና አላረጋገጠም። በራስ-ሰር ይረጋገጣል።",
  "chapaProcessingTitle": "ክፍያ በሂደት ላይ",
  "chapaProcessingDesc": "የቻፓ ክፍያው ተቀብሏል። አሁን በማረጋገጥ ላይ ነው — የምርመራ አገልግሎትዎ በቅርበት ይንቀሳቀሳል።",

  "dlgPayTitle": "ለምርመራ አገልግሎት ይከፍሉ",
  "dlgPayDescChapa": "በመስመር ላይ ክፍያ ለማጠናቀቅ ወደ ቻፓ ደህንነቱ የተጠበቀ ገጽ ይመራሉ።",
  "dlgPayDescOffline": "ክፍያውን ከመስመር ውጭ ያጠናቀቁ ከዚያ ዝርዝሩን ያስገቡ። ማረጋገጥ በኋላ ይንቀሳቀሳል።",
  "lblAmount": "መጠን",
  "amountAutoCalc": "በጠቅላላ መኝቻዎ እና የተመረጠው እቅድ ላይ በራስ-ሰር ይሰላል",
  "lblPaymentMethod": "የክፍያ ዘዴ",
  "lblReferenceNumber": "ማመሳከሪያ / የግብይት ቁጥር",
  "referencePlaceholder": "ለምሳሌ FT25632i5632k",
  "referenceHint": "ከክፍያ ደረሰኝዎ የግብይት/ማመሳከሪያ ቁጥሩን ያስገቡ",
  "lblAdditionalNotes": "ተጨማሪ ማስታወሻዎች",
  "notesPlaceholder": "ማንኛውም ተጨማሪ መረጃ (አስተካክል)",
  "chapaMethodInfo": "በቴሌብር፣ ሲቢኤ ብር፣ ባንክ ካርዶች እና ሌሎች ደህንነቱ የተጠበቀ ይከፍሉ",
  "chapaRedirectInfo": "ከታች \"በቻፓ ይከፍሉ\" ጠቅ ያድርጉ። ወደ ቻፓ ደህንነቱ የተጠበቀ ገጽ ይመራሉ። ክፍያ በኋላ ይመለሳሉ እና ምርመራዎ በራስ-ሰር ይንቀሳቀሳል።",
  "btnCancel": "ሰርዝ",
  "btnRedirecting": "በማመላከት ላይ...",
  "btnSubmitting": "በላክ ላይ...",
  "btnPayWithChapa": "በቻፓ ይከፍሉ",
  "btnSubmitPayment": "ክፍያ ያስገቡ",

  "payMethodCHAPA": "በመስመር ይከፍሉ (ቻፓ)",
  "payMethodCASH": "ጥሬ ገንዘብ",
  "payMethodBANK_TRANSFER": "ባንክ ስምምነት",
  "payMethodTELEBIRR": "ቴሌብር",
  "payMethodCBE_BIRR": "ሲቢኤ ብር",
  "payMethodOTHER": "ሌላ",

  "toastFailedLoad": "የምርመራ መረጃ መጫን አልተቻለም",
  "toastChapaCompleted": "የቻፓ ክፍያ ተጠናቀቀ! በማረጋገጥ ላይ...",
  "toastPaymentVerified": "የምርመራ አገልግሎትዎ አሁን ንቁ ነው።",
  "toastChapaPending": "ቻፓ ክፍያውን ገና አላረጋገጠም። እንጨምራለን።",
  "toastVerifyFailed": "ማረጋገጥ አልተቻለም። የዌብሁክ ያስተናግዳል።",
  "toastInvalidPayment": "ልክ ያልሆነ የክፍያ ዝርዝር",
  "toastNoChapaUrl": "የቻፓ ማረጋገጥ URL ማግኘት አልተቻለም",
  "toastChapaInitFailed": "የቻፓ ክፍያ ማስጀመር አልተቻለም",
  "toastFillRequired": "እባክዎ ሁሉንም የሚያስፈልጉ መስኮች ያስተካኩ",
  "toastRefRequired": "የስምምነት ማመሳከሪያ ቁጥር ይፈልጋል",
  "toastPaymentSubmitted": "ክፍያ ተልኳል! ማረጋገጥ በመጠባበቅ ላይ።",
  "toastSubmitFailed": "መላክ አልተቻለም",

  "daysRemaining_one": "{{count}} ቀን ቀሪ",
  "daysRemaining_other": "{{count}} ቀናት ቀሪ",
  "expiresToday": "ዛሬ ያበቃል",
  "expiredAgo_one": "ከ{{count}} ቀን በፊት ጊዜው ያለፈ",
  "expiredAgo_other": "ከ{{count}} ቀናት በፊት ጊዜው ያለፈ",

  "cycleMONTHLY": "ወርሃዊ",
  "cycleQUARTERLY": "ሩብ ዓመታዊ",
  "cycleSEMI_ANNUAL": "ግማሽ ዓመታዊ",
  "cycleYEARLY": "ዓመታዊ",
}

# ── OROMO KEYS ──
om = {
  "pageTitle": "Membareessa fi Kaffaltii",
  "pageSubtitle": "Membareessa keessan haqa'i, plaanii ilaalu, kaffaltii ergaa",
  "btnRefresh": "Haqa",

  "noSubFound": "Membareessa hin argamne",
  "noSubContact": "Bulchiinsa argadhu",

  "pricingCalc": "{{cur}}{{price}} mannii/guyma x {{beds}} mannii{{plural}} = {{total}}/guyma",
  "noRoomsConfigured": "Kam akkamitti hin sirriitti hinqabne. Membareessa fi kaffaltii ilaaluf kam dabalaa.",
  "bedsCalcDescription": "Membareessa keessani kam hunda {{beds}} mannii{{plural}} irratti hundaa'a.",
  "ratesLocked": "Qabiyyee Muchame",

  "statusACTIVE": "HIN BARIKKANNE",
  "statusWARNING": "AKKA JITI",
  "statusEXPIRED": "WAKTI DHAABATE",
  "statusSUSPENDED": "DHIIBAME",
  "freeTrial": "Fayyadama Bilisaa",
  "lblCurrentPlan": "Plaanii Ammaa",
  "lblAmount": "Qabiyyee",
  "lblExpiresOn": "Waqtin Dhaabu",
  "lblProvider": "Kabajaa",

  "penaltyTitle": "KAFFALTII WAKTI DHAABATE",
  "penaltyDesc": "Membareessa keessani guyyaa {{days}}{{plural}} booda dhaabate. Kaffaltii yeroo darbe {{percent}}% itti dabalamu.",
  "penaltyBase": "Qabxii",
  "penaltyLabel": "Kaffisa",
  "penaltyTotalDue": "IDDO HUNDAA TA'E",

  "warningTitle": "Membareessa siya'a dhihootti dhaabataa!",
  "warningDesc": "Plaanii xiqqaa filadhu kaffaltii kanaan tajaajila itti fufi.",

  "availablePlans": "Plaanii Argaman",
  "plansCount_one": "Plaanii {{count}} argama",
  "plansCount_other": "Plaanii {{count}} argamu",
  "noPlansYet": "Plaanii hin argamne",
  "noPlansContact": "Kaffaltii bareeddaaf bulchiinsa argadhu",
  "planDays": "{{days}} guyyaa",
  "perMonth": "~{{amount}} {{cur}}/ji'a",
  "bedsBreakdown": "{{cur}}{{price}} x {{beds}} manii x {{days}} guyyaa",
  "badgeCurrent": "Ammaa",
  "badgeActive": "Haala",
  "btnPayNow": "Amma Kafi",

  "paymentHistory": "Seenaa Kaffaltii",
  "noPaymentRecords": "Galmee kaffaltii hin jiru",
  "payStatusChapaPending": "Chapa Eegaa Jira",
  "payStatusOverdue": "Kaffaltii Yeroo Darbe",
  "payStatusOverdueSoon": "Darbe (Qarsoon Itti Dabalamu)",
  "payStatusPending": "Eegaa Jira",
  "payStatusVerified": "Mirkanaa'e",

  "chapaVerifyingTitle": "Kaffaltii Chapa waliin Mirkanaachuu...",
  "chapaVerifyingDesc": "Chapa waliin kaffaltii mirkanaa'uu danda'utti eegaa. Yeroo gabaabaa fudhata.",
  "chapaVerifiedTitle": "Kaffaltii Mirkanaa'e fi Haala",
  "chapaVerifiedDesc": "Kaffaltii Chapa mirkanaa'eera. Membareessa keessani amma haala!",
  "chapaDelayedTitle": "Mirkanaa'uu Yoo Qarxii",
  "chapaDelayedDesc": "Sa'aatiin mirkanaachuun hin danda'amne. Haqa'a — kaffaltii yaroo sirriitti mirkanaa'ama.",
  "chapaPendingTitle": "Kaffaltii Amma Mirkanaa'ini",
  "chapaPendingDesc": "Chapa kaffaltii amma mirkanaa'etin. Mirkaneeffachuun sirriitti itti fufa.",
  "chapaProcessingTitle": "Kaffaltii Shaakala",
  "chapaProcessingDesc": "Kaffaltii Chapa argameera. Amma mirkanaachuu jira — membareessa keessani yeroo dhiyo shaakala.",

  "dlgPayTitle": "Membareessa Kaffaltii",
  "dlgPayDescChapa": "Kaffaltii intarneetiin galaachuuf Chapa safiyyaa ogeessa sanaatti deemi.",
  "dlgPayDescOffline": "Kaffaltii offline itti fufi ogeessa kana xiqqoo jechiin galmeessi. Mirkanaa'uu booda shaakala.",
  "lblAmount": "Qabiyyee",
  "amountAutoCalc": "Mannii hundaafi plaaniin filame irratti sirriitti shallagama",
  "lblPaymentMethod": "Adeemsa Kaffaltii",
  "lblReferenceNumber": "Riifireensii / Lakkoofsa Galii",
  "referencePlaceholder": "fkn FT25632i5632k",
  "referenceHint": "Kaffaltii keessanii riifireensii/lakkoofsa galii galmeessi",
  "lblAdditionalNotes": "Yaada Dabalataa",
  "notesPlaceholder": "Ogeessa dabalataa (barbaachisa miti)",
  "chapaMethodInfo": "Telebirr, CBE Birr, kaardii baankii fi dabalataan qajeelfamaan kafi",
  "chapaRedirectInfo": "\"Chapaan Kafi\" xiqqoo tuqaa. Chapa safiyyaa sanaatti deemi. Kaffaltii booda deebi'ii membareessa shaakala.",
  "btnCancel": "Haqi",
  "btnRedirecting": "Deemu...",
  "btnSubmitting": "Ergaa...",
  "btnPayWithChapa": "Chapaan Kafi",
  "btnSubmitPayment": "Kaffaltii Ergaa",

  "payMethodCHAPA": "Online Kafi (Chapa)",
  "payMethodCASH": "Qarshii Hanqaaqaa",
  "payMethodBANK_TRANSFER": "Baankii Geessii",
  "payMethodTELEBIRR": "Telebirr",
  "payMethodCBE_BIRR": "CBE Birr",
  "payMethodOTHER": "Kan Bira",

  "toastFailedLoad": "Ogeessa membareessa fudhachuu milkaa'ina",
  "toastChapaCompleted": "Kaffaltii Chapa xumure! Mirkanaachuuf...",
  "toastPaymentVerified": "Membareessa keessani amma haala!",
  "toastChapaPending": "Chapa kaffaltii amma hin mirkanaafne. Yaroo eegan jirra.",
  "toastVerifyFailed": "Mirkanaachuun milkaa'ina. Hookpii biraay taate.",
  "toastInvalidPayment": "Galmee kaffaltii dogoggora",
  "toastNoChapaUrl": "URL Chapa fudhachuu milkaa'ina",
  "toastChapaInitFailed": "Kaffaltii Chapa jalqabuu milkaa'ina",
  "toastFillRequired": "Meeshaalee barbaachisan hunda galmeessi",
  "toastRefRequired": "Lakkoofsa riifireensii barbaachisa",
  "toastPaymentSubmitted": "Kaffaltii ergame! Mirkanaachuuf eegaa jira.",
  "toastSubmitFailed": "Erguu milkaa'ina",

  "daysRemaining_one": "Guyyaa {{count}} hafa",
  "daysRemaining_other": "Guyyaa {{count}} hafu",
  "expiresToday": "Har'a dhaaba",
  "expiredAgo_one": "Guyyaa {{count}} booda dhaabate",
  "expiredAgo_other": "Guyyaa {{count}} booda dhaabate",

  "cycleMONTHLY": "Ji'aati",
  "cycleQUARTERLY": "Qarshii Ji'a",
  "cycleSEMI_ANNUAL": "Torban Ji'a",
  "cycleYEARLY": "Waggaa",
}

# ── WRITE TO LOCALES ──
for lang, data in [("en", en), ("am", am), ("om", om)]:
    path = f"{LOCALE_DIR}/{lang}.json"
    with open(path, "r") as f:
        locale = json.load(f)
    locale["subscription"] = data
    with open(path, "w") as f:
        json.dump(locale, f, indent=2, ensure_ascii=False)
    print(f"Updated {lang}.json — {len(data)} keys in 'subscription' namespace")

print("Done.")
