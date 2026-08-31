const fs = require('fs');

const amTranslations = {
  pageTitle: 'ደህንነት እና ውቅር',
  pageSubtitle: 'የግብረ መልስ ምዝገባ, የጂዮፌንስ ምርመራ, እና የኦፊሰር አስተዳደር',
  tabsAudit: 'የግብረ መልስ ምዝገባ',
  tabsGeofence: 'የጂዮፌንስ ምርመራ',
  tabsOfficers: 'ኦፊሰሮች',
  errorLoadAudit: 'የግብረ መልስ ምዝገቦችን መጫን አልተሳካም',
  errorLoadGeofences: 'የጂዮፌንስ ምርመራ መጫን አልተሳካም',
  errorNameRequired: 'ስም ያስፈልጋል',
  successGeofenceCreated: 'የጂዮፌንስ ምርመራ ተፈጥሯል',
  errorCreateGeofence: 'የጂዮፌንስ ምርመራ ፍጠር አልተሳካም',
  successGeofenceDeleted: 'የጂዮፌንስ ምርመራ ተሰርዟል',
  errorDelete: 'ማስወገድ አልተሳካም',
  errorLoadOfficers: 'ኦፊሰሮችን መጫን አልተሳካም',
  errorAllFieldsRequired: 'ሁሉም መስኮቶች ያስፈልጋል',
  successOfficerCreated: 'ኦፊሰር ተፈጥሯል',
  errorCreateOfficer: 'ኦፊሰር ፍጠር አልተሳካም',
  successRankUpdated: 'ደረጃ ተዘምኗል',
  errorUpdateRank: 'ደረጃ ማዘመን አልተሳካም',
  confirmDeleteOfficer: 'ይህን ኦፊሰር ይሰርዛሉ?',
  successOfficerDeleted: 'ኦፊሰር ተሰርዟል',
  errorDeleteOfficer: 'ኦፊሰር ማስወገድ አልተሳካም',
  filterAction: 'ተግባር አጣራ',
  allActions: 'ሁሉም ተግባሮች',
  login: 'ግባ',
  system: 'ስርዓት',
  cancel: 'ሰርዝ',
  addZone: 'ዞን አክል',
  newGeofenceTitle: 'አዲስ የጂዮፌንስ ዞን',
  placeholderZoneName: 'ለምሳሌ, ቦሌ ክፍለ ከተማ',
  severityCritical: 'አስተማማኝ',
  severityHigh: 'ከፍተኛ',
  severityMedium: 'መካከለኛ',
  severityLow: 'ዝቅተኛ',
  saving: 'ማስቀመጥ...',
  createZone: 'ዞን ፍጠር',
  emptyGeofences: 'የጂዮፌንስ ዞን የለም። አቅራቢያዎች በቅርበት ሲግቡ ማንቂ ለማግኘት ዞኖችን ያክሉ።',
  radiusDisplay: 'ራዲየስ: {{m}}ሜ',
  officersDescription: 'የፖሊስ ኦፊሰር መለያዎች እና ደረጃ ምሰጥ አስተዳዳር። ADMIN ደረጃ ለለውጦች ይጠይቃል።',
  addOfficer: 'ኦፊሰር አክል',
  newOfficerTitle: 'አዲስ ፖሊስ ኦፊሰር',
  placeholderUsername: 'officer.username',
  placeholderPassword: 'ደህንነቱ ያለበት የይለፍ ቃል',
  placeholderOfficerName: 'የኦፊሰር ስም',
  rankAdminFull: 'አስተዳዳሪ — ሙሉ መዳረሻ',
  rankDetectiveFull: 'መሪ — ትንታኔ + ማስተላለፍ',
  rankOfficerFull: 'ኦፊሰር — መደበኛ መዳረሻ',
  rankViewerFull: 'ተመልከቻ — ለንባብ ብቻ',
  creating: 'ፈጠር በማድረግ ላይ...',
  createOfficer: 'ኦፊሰር ፍጠር',
  emptyOfficers: 'የፖሊስ ኦፊሰር አልተገኘም።',
  rankAdmin: 'አስተዳዳሪ',
  rankDetective: 'መሪ',
  rankOfficer: 'ኦፊሰር',
  rankViewer: 'ተመልከቻ',
  joined: 'ተቀላቀለ: {{date}}',
  you: 'አንተ',
  rankPermissionsTitle: 'የደረጃ ፈቃዶች',
  rankAdminDesc: 'ለሁሉም ፖሊስ ባህሪያት ሙሉ መዳረሻ + ኦፊሰሮች, ደህንነት ቅንብሮች, እና ማስተላለፎች አስተዳደር',
  rankDetectiveDesc: 'እንግዳዎች, የጥፋት ማንቂ, የመከታተል ዝርዝር, መረጃ, ትንታኔዎች, እና ስካነር ይመልከቱ',
  rankOfficerDesc: 'ዳሽቦርድ, አቅራቢያን, እንግዳዎች, የጥፋት ማንቂ, የጥፋት ሰዎች, እና ስካነር ይመልከቱ',
  rankViewerDesc: 'ለንባብ ብቻ ዳሽቦርድ, አቅራቢያን, እና የእንግዳ ፍለጋ',
  actionLabelsViewedGuest: 'እንግዳ የተመለከተ',
  actionLabelsViewedMatch: 'ግኝት የተመለከተ',
  actionLabelsExportedData: 'ውሂብ የተላከ',
  actionLabelsOfficerLogin: 'ኦፊሰር ግባ',
  actionLabelsScannedWatchlist: 'የመከታተል ዝርዝር ስካን ተደርጓል',
  severity_LOW: 'ዝቅተኛ',
  severity_MEDIUM: 'መካከለኛ',
  severity_HIGH: 'ከፍተኛ',
  severity_CRITICAL: 'አስተማማኝ'
};

const omTranslations = {
  pageTitle: 'Daangaa fi Qindaa\'ina',
  pageSubtitle: 'Galma qorannoo, jiyoofensii, fi gargaarsa ofisaa',
  tabsAudit: 'Galma Qorannoo',
  tabsGeofence: 'Jiyoofensii',
  tabsOfficers: 'Ofisaalee',
  errorLoadAudit: 'Galma qorannoo fudhaachuun hin milkaa\'ine',
  errorLoadGeofences: 'Jiyoofensii fudhaachuun hin milkaa\'ine',
  errorNameRequired: 'Maqaa barbaachisaadha',
  successGeofenceCreated: 'Jiyoofensii uumameera',
  errorCreateGeofence: 'Jiyoofensii uumuu hin milkaa\'ine',
  successGeofenceDeleted: 'Jiyoofensii haqameera',
  errorDelete: 'Haquun hin milkaa\'ine',
  errorLoadOfficers: 'Ofisaalee fudhaachuun hin milkaa\'ine',
  errorAllFieldsRequired: 'Kutaalee hunda barbaachisaa dha',
  successOfficerCreated: 'Ofisaan uumameera',
  errorCreateOfficer: 'Ofisaan uumuu hin milkaa\'ine',
  successRankUpdated: 'Darajaa haqameera',
  errorUpdateRank: 'Darajaa haqaan hin milkaa\'ine',
  confirmDeleteOfficer: 'Ofisaan kana haqa?',
  successOfficerDeleted: 'Ofisaan haqameera',
  errorDeleteOfficer: 'Ofisaan haquun hin milkaa\'ine',
  filterAction: 'Tarkaanfii filadhu',
  allActions: 'Tarkaanfii Hunda',
  login: 'Seeni',
  system: 'Sirrii',
  cancel: 'Dhiisi',
  addZone: 'Daanga Dabali',
  newGeofenceTitle: 'Daangaa Jiyoofensii Haaraa',
  placeholderZoneName: 'Fkn, Miseensa Boolii',
  severityCritical: 'Cimaa',
  severityHigh: 'Guddaa',
  severityMedium: 'Gidduugala',
  severityLow: 'Xiqqaa',
  saving: 'Olkaa\'uu...',
  createZone: 'Daangaa Uumi',
  emptyGeofences: 'Daangaa jiyoofensii hin jiru. Beeksisa argachuuf daanga dabali.',
  radiusDisplay: 'Raadiyeesi: {{m}}m',
  officersDescription: 'Akaawuntii fi darajaa ofisaalee polisii gargaaru. Darajaa ADMIN barbaachisaa.',
  addOfficer: 'Ofisaan Dabali',
  newOfficerTitle: 'Ofisaan Polisii Haaraa',
  placeholderUsername: 'officer.username',
  placeholderPassword: 'Jecha icciitii daangaa',
  placeholderOfficerName: 'Maqaa ofisaa',
  rankAdminFull: 'Dajaa — Argannoo Guutuu',
  rankDetectiveFull: 'Hogganaa — Qorannoo + Birmaduu',
  rankOfficerFull: 'Ofisaan — Argannoo Gabaabaa',
  rankViewerFull: 'Ilaaltuu — Dubbistuu Qofatu',
  creating: 'Uumuu...',
  createOfficer: 'Ofisaan Uumi',
  emptyOfficers: 'Ofisaan polisii hin argamne.',
  rankAdmin: 'Dajaa',
  rankDetective: 'Hogganaa',
  rankOfficer: 'Ofisaan',
  rankViewer: 'Ilaaltuu',
  joined: 'Hir\'isame: {{date}}',
  you: 'Ati',
  rankPermissionsTitle: 'Billaashii Darajaa',
  rankAdminDesc: 'Faayidaa polisii hunda argannoo guutuu + ofisaalee, qindaa\'ina, fi birmaduu gargaaru',
  rankDetectiveDesc: 'Deeggarsaonni, beeksisa boruu, tarree hordoffii, odee, qorannoo, fi skaanara ilaali',
  rankOfficerDesc: 'Daashboordii, tajaajiltoota, deeggarsaonni, beeksisa boruu, qofota boruu, fi skaanara ilaali',
  rankViewerDesc: 'Daashboordii, tajaajiltoota, fi barbaachuu deeggarsaa dubbistuu qofatu',
  actionLabelsViewedGuest: 'Deeggarsaa Ilaale',
  actionLabelsViewedMatch: 'Walsimsiisuu Ilaale',
  actionLabelsExportedData: 'Daataa Birmade',
  actionLabelsOfficerLogin: 'Ofisaan Seene',
  actionLabelsScannedWatchlist: 'Tarree Hordoffii Skaanare',
  severity_LOW: 'Xiqqaa',
  severity_MEDIUM: 'Gidduugala',
  severity_HIGH: 'Guddaa',
  severity_CRITICAL: 'Cimaa'
};

const amPath = '/home/z/my-project/src/i18n/locales/am.json';
const omPath = '/home/z/my-project/src/i18n/locales/om.json';
const am = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const om = JSON.parse(fs.readFileSync(omPath, 'utf8'));

const ns = 'security';
let amChanged = 0, omChanged = 0;

for (const [key, value] of Object.entries(amTranslations)) {
  if (am[ns][key] !== value) { am[ns][key] = value; amChanged++; }
}
for (const [key, value] of Object.entries(omTranslations)) {
  if (om[ns][key] !== value) { om[ns][key] = value; omChanged++; }
}

fs.writeFileSync(amPath, JSON.stringify(am, null, 2) + '\n', 'utf8');
fs.writeFileSync(omPath, JSON.stringify(om, null, 2) + '\n', 'utf8');

console.log(`AM: ${amChanged} keys updated`);
console.log(`OM: ${omChanged} keys updated`);

// Verify
const amV = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const omV = JSON.parse(fs.readFileSync(omPath, 'utf8'));
const enV = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/en.json', 'utf8'));
const skip = ['radiusDisplay','joined'];
const amSame = Object.keys(enV[ns]).filter(k => !skip.includes(k) && enV[ns][k] === amV[ns][k]);
const omSame = Object.keys(enV[ns]).filter(k => !skip.includes(k) && enV[ns][k] === omV[ns][k]);
console.log(`\nAM still same as EN: ${amSame.length}`);
amSame.forEach(k => console.log('  ' + k + ': ' + amV[ns][k]));
console.log(`OM still same as EN: ${omSame.length}`);
omSame.forEach(k => console.log('  ' + k + ': ' + omV[ns][k]));
