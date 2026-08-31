const fs = require('fs');

const amTranslations = {
  pageTitle: "የፖሊስ ሪፖርቶች",
  pageSubtitle: "በከተማ ደረጃ የእንግዳ ክትትል እና የደህንነት ትንተና",
  errorLoad: "ሪፖርት መጫን አልተሳካም",
  successCsvExport: "CSV ተላከ",
  periodDaily: "በየቀኑ",
  periodMonthly: "በየወሩ",
  periodYearly: "በየዓመቱ",
  allProviders: "ሁሉም አቅራቢያን",
  refresh: "አድስ",
  csv: "CSV",
  tabOverview: "አጠቃላይ እይታ",
  tabOccupancy: "የመጠገን ድርሻ",
  tabDemographics: "የሕዝብ እዝ",
  tabProviders: "አቅራቢያን",
  kpiRegisteredGuests: "የተመዘገቡ እንግዳዎች",
  kpiInSelectedProvider: "በተመረጠው አቅራቢያ ውስጥ",
  kpiAcrossProviders: "በ {{count}} አቅራቢያን ውስጥ",
  kpiCheckIns: "የግቤቶች",
  kpiCurrentlyActive: "አሁን ንቁ",
  kpiCheckOuts: "የውጪ መውጫዎች",
  kpiTotalReservations: "ጠቅላላ ምርመራዎች",
  kpiSuspectMatches: "የጥፋት ግኝቶች",
  kpiRequiresAttention: "ትኩረት ይጠይቃል",
  kpiNoAlerts: "ምንም ማንቂ የለም",
  reservationStatus: "የምርመራ ሁኔታ",
  emptyReservations: "በዚህ ጊዜ ውስጥ ምርመራ የለም",
  peakCheckInHours: "የከፍተኛ ግቤት ሰዓቶች",
  checkInSummary: "የግቤት ማጠቃለያ",
  emptyHourlyData: "ለዚህ ጊዜ በሰዓት ውስጥ ውሂብ የለም",
  frequentStayAlerts: "የተደጋጋሚ ቆይታ ማንቂዎች",
  kpiTotalProviders: "ጠቅላላ አቅራቢያን",
  kpiTotalRooms: "ጠቅላላ ክፍሎች",
  kpiActiveGuests: "ንቁ እንግዳዎች",
  kpiCurrentlyCheckedIn: "አሁን ያለ መግቢት",
  occupancyByProvider: "በአቅራቢያ መሰረት የመጠገን ድርሻ",
  occupancyProviderHint: 'የአቅራቢያ ደረጃ የመጠገን ድርሻ የ "ሁሉም አቅራቢያን" ሲተመርጠው ይታያል',
  roomStatusBreakdown: "የክፍል ሁኔታ ማበረታቻ",
  nationalityDistribution: "የዜግነት ስርጭት",
  emptyNationality: "የዜግነት ውሂብ የለም",
  idTypeDistribution: "የመለያ አይነት ስርጭት",
  emptyIdType: "የመለያ አይነት ውሂብ የለም",
  nationalityBreakdown: "የዜግነት ማበረታቻ",
  providerActivitySummary: "የአቅራቢያ እንቅስቃሴ ማጠቃለያ",
  emptyProviderData: "የአቅራቢያ ውሂብ የለም",
  guestsByProvider: "በአቅራቢያ መሰረት እንግዳዎች",
  legendGuests: "እንግዳዎች",
  legendCheckIns: "የግቤቶች",
  legendSuspectMatches: "የጥፋት ግኝቶች",
  csvHeaders: "አቅራቢያ,የተመዘገቡ እንግዳዎች,የግቤቶች,የውጪ መውጫዎች,የጥፋት ግኝቶች,ክፍሎች",
  csvNationalityHeader: "ዜግነት,ብዛት",
  csvSeverityHeader: "ክብደት,ብዛት",
  csvProvider: "አቅራቢያ",
  csvRegisteredGuests: "የተመዘገቡ እንግዳዎች",
  csvCheckIns: "የግቤቶች",
  csvCheckOuts: "የውጪ መውጫዎች",
  csvSuspectMatches: "የጥፋት ግኝቶች",
  csvRooms: "ክፍሎች",
  csvNationality: "ዜግነት",
  csvCount: "ብዛት",
  csvSeverity: "ክብደት",
  occupancyPercent: "የመጠገን ድርሻ %",
  risk_HIGH: "ከፍተኛ",
  risk_MEDIUM: "መካከለኛ",
  risk_LOW: "ዝቅተኛ"
};

const omTranslations = {
  pageTitle: "Rippoorota Polisii",
  pageSubtitle: "Magaalaa guutuu qorannoo deeggarsa fi gabaabummaa tajaajilaa dhugaa",
  errorLoad: "Rippoorrii fudhaachuun hin milkaa'ine",
  successCsvExport: "CSV ergame",
  periodDaily: "Guyaattii",
  periodMonthly: "Ji'aattii",
  periodYearly: "Waggaa",
  allProviders: "Tajaajiltoota Hunda",
  refresh: "Haqa",
  csv: "CSV",
  tabOverview: "Waliigala",
  tabOccupancy: "Qabiyyee Iddoo",
  tabDemographics: "Adda addummaa Demograafikaa",
  tabProviders: "Tajaajiltoota",
  kpiRegisteredGuests: "Deeggarsaonni Galmeessaman",
  kpiInSelectedProvider: "Tajaajiltoota filatame keessatti",
  kpiAcrossProviders: "Tajaajiltoota {{count}} keessatti",
  kpiCheckIns: "Seeneen",
  kpiCurrentlyActive: "Amma haala ho'a",
  kpiCheckOuts: "Ba'een",
  kpiTotalReservations: "Qabiyyee hordoffii waliigalaa",
  kpiSuspectMatches: "Walsimsiisuu Boruu",
  kpiRequiresAttention: "Xiyyeeffannoo barbaada",
  kpiNoAlerts: "Beeksisa hin jiru",
  reservationStatus: "Haala Qabiyyee",
  emptyReservations: "Yeroo kanaa qabiyyee hin jiru",
  peakCheckInHours: "Sa'aatii Seensicha Guddaa",
  checkInSummary: "Waliigaltee Seensicha",
  emptyHourlyData: "Yeroo kanaa daataa sa'aatii hin jiru",
  frequentStayAlerts: "Beeksisa Iddoo Qabannee",
  kpiTotalProviders: "Tajaajiltoota Waliigalaa",
  kpiTotalRooms: "Kamooonni Waliigalaa",
  kpiActiveGuests: "Deeggarsaonni Haala Ho'a",
  kpiCurrentlyCheckedIn: "Amma seene",
  occupancyByProvider: "Qabiyyee Iddoo Tajaajiltootaan",
  occupancyProviderHint: "Qabiyyee iddoo tajaajiltaa yoo 'Tajaajiltoota Hunda' filatame ni mul'ata",
  roomStatusBreakdown: "Qaama Haala Kamira",
  nationalityDistribution: "Bifa Lammii Ummataa",
  emptyNationality: "Daataa ummataa hin jiru",
  idTypeDistribution: "Bifa Galmee Id",
  emptyIdType: "Daataa galmee id hin jiru",
  nationalityBreakdown: "Qaama Lammii Ummataa",
  providerActivitySummary: "Waliigaltee Sochii Tajaajilaa",
  emptyProviderData: "Daataa tajaajilaa hin jiru",
  guestsByProvider: "Deeggarsaonni Tajaajiltootaan",
  legendGuests: "Deeggarsaonni",
  legendCheckIns: "Seeneen",
  legendSuspectMatches: "Walsimsiisuu Boruu",
  csvHeaders: "Tajaajilaa,Deeggarsaonni Galmeessaman,Seeneen,Ba'een,Walsimsiisuu Boruu,Kamoonni",
  csvNationalityHeader: "Lammii, lakkoofsa",
  csvSeverityHeader: "Cimaa, lakkoofsa",
  csvProvider: "Tajaajilaa",
  csvRegisteredGuests: "Deeggarsaonni Galmeessaman",
  csvCheckIns: "Seeneen",
  csvCheckOuts: "Ba'een",
  csvSuspectMatches: "Walsimsiisuu Boruu",
  csvRooms: "Kamoonni",
  csvNationality: "Lammii",
  csvCount: "Lakkoofsa",
  csvSeverity: "Cimaa",
  occupancyPercent: "Qabiyyee Iddoo %",
  risk_HIGH: "Guddaa",
  risk_MEDIUM: "Gidduugala",
  risk_LOW: "Xiqqaa"
};

// Read locale files
const amPath = '/home/z/my-project/src/i18n/locales/am.json';
const omPath = '/home/z/my-project/src/i18n/locales/om.json';

const am = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const om = JSON.parse(fs.readFileSync(omPath, 'utf8'));

// Apply translations
const ns = 'policeReports';
let amChanged = 0;
let omChanged = 0;

for (const [key, value] of Object.entries(amTranslations)) {
  if (am[ns][key] !== value) {
    am[ns][key] = value;
    amChanged++;
  }
}

for (const [key, value] of Object.entries(omTranslations)) {
  if (om[ns][key] !== value) {
    om[ns][key] = value;
    omChanged++;
  }
}

// Write back
fs.writeFileSync(amPath, JSON.stringify(am, null, 2) + '\n', 'utf8');
fs.writeFileSync(omPath, JSON.stringify(om, null, 2) + '\n', 'utf8');

console.log(`AM: ${amChanged} keys updated`);
console.log(`OM: ${omChanged} keys updated`);

// Verify
const amVerify = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const omVerify = JSON.parse(fs.readFileSync(omPath, 'utf8'));

const amEnglish = Object.entries(amVerify[ns]).filter(([k, v]) => /^[A-Za-z]/.test(v));
const omEnglish = Object.entries(omVerify[ns]).filter(([k, v]) => /^[A-Za-z]/.test(v));

console.log(`\nAM remaining English values: ${amEnglish.length}`);
if (amEnglish.length) amEnglish.forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log(`OM remaining English values: ${omEnglish.length}`);
if (omEnglish.length) omEnglish.forEach(([k, v]) => console.log(`  ${k}: ${v}`));