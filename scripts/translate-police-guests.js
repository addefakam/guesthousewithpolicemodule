const fs = require('fs');

const amTranslations = {
  pageTitle: "የእንግዳ መዝገብ",
  pageSubtitle: "በሁሉም አቅራቢያን ውስጥ ፈልግ",
  searchPlaceholder: "ስም, ስልክ, ወይም መለያ...",
  noGuestsMatch: "ከፍለጋዎ ጋር የሚዛመድ እንግዳ የለም",
  noGuestsYet: "እስካሁን የተመዘገበ እንግዳ የለም",
  unknown: "ያልታወቀ",
  unknownProvider: "ያልታወቀ አቅራቢያ",
  spent: "የተወሰደ",
  staysLabel: "ቆይታዎች",
  yes: "አዎ",
  no: "የለም",
  vip: "VIP",
  phone: "ስልክ",
  email: "ኢሜይል",
  idNumber: "የመለያ ቁጥር",
  nationality: "ዜግነት",
  address: "አድራሻ",
  registered: "የተመዘገበ",
  notes: "ማስታወሻዎች",
  showing: "ከ {{total}} ውስጥ {{from}}–{{to}} ይታያል",
  pageOf: "ገጽ {{page}} ከ {{total}}",
  failedToLoad: "እንግዳዎችን መጫን አልተሳካም",
  detailPhone: "ስልክ",
  detailEmail: "ኢሜይል",
  detailIdType: "የመለያ ቁጥር",
  detailNationality: "ዜግነት",
  detailAddress: "አድራሻ",
  detailRegistered: "የተመዘገበ",
  detailNotes: "ማስታወሻዎች",
  new: "አዲስ"
};

const omTranslations = {
  pageTitle: "Daataa Deeggarsaa",
  pageSubtitle: "Tajaajiltoota hunda keessatti barbaadi",
  searchPlaceholder: "Maqaa, bilbila, ykn ID...",
  noGuestsMatch: "Deeggarsaa barbaadaa waliin walqabatu hin jiru",
  noGuestsYet: "Deeggarsaa galmeessan hin jiru",
  unknown: "Beekamuu dhabu",
  unknownProvider: "Tajaajilaa Beekamuu dhabu",
  spent: "Kan fudhatame",
  staysLabel: "Qabadhuufi",
  yes: "Eeyyee",
  no: "Rakkoo",
  vip: "VIP",
  phone: "Bilbila",
  email: "Imeejl",
  idNumber: "Lakkoofsa ID",
  nationality: "Nannoo",
  address: "Teessoo",
  registered: "Galmeessame",
  notes: "Yaadachiisa",
  showing: "{{total}} keessaa {{from}}–{{to}}",
  pageOf: "Fuula {{page}} kan {{total}}",
  failedToLoad: "Deeggarsaa fudhaachuun hin milkaa'ine",
  detailPhone: "Bilbila",
  detailEmail: "Imeejl",
  detailIdType: "Lakkoofsa ID",
  detailNationality: "Nannoo",
  detailAddress: "Teessoo",
  detailRegistered: "Galmeessame",
  detailNotes: "Yaadachiisa",
  new: "Haara'a"
};

const amPath = '/home/z/my-project/src/i18n/locales/am.json';
const omPath = '/home/z/my-project/src/i18n/locales/om.json';
const am = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const om = JSON.parse(fs.readFileSync(omPath, 'utf8'));

const ns = 'policeGuests';
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

// Verify - only check for verbatim English (not VIP, ID which are universal)
const amVerify = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const omVerify = JSON.parse(fs.readFileSync(omPath, 'utf8'));
const amEng = Object.entries(amVerify[ns]).filter(([k,v]) => /^[A-Za-z]{3,}/.test(v) && k !== 'vip');
const omEng = Object.entries(omVerify[ns]).filter(([k,v]) => /^[A-Za-z]{3,}/.test(v) && k !== 'vip');
console.log(`\nAM remaining English: ${amEng.length}`);
amEng.forEach(([k,v]) => console.log(`  ${k}: ${v}`));
console.log(`OM remaining English: ${omEng.length}`);
omEng.forEach(([k,v]) => console.log(`  ${k}: ${v}`));
