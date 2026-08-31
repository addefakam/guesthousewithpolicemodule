const fs = require('fs');

const amTranslations = {
  pageTitle: 'የጥፋት ማንቂዎች',
  pageSubtitle: 'የጥፋት ሰዎች ምርመራ ሲያደርጉ በራስ-ሰር ማንቂ',
  all: 'ሁሉም',
  unread: 'ያልተነበበ ({{count}})',
  markAllRead: 'ሁሉንም እንደተነበበ ምልክት አድርግ',
  allAlertsMarked: 'ሁሉም ማንቂዎች እንደተነበቡ ተሰይሟል',
  failedMarkAll: 'ሁሉንም እንደተነበበ ማስታወስ አልተሳካም',
  noUnreadAlerts: 'ያልተነበበ ማንቂ የለም',
  noAlertsYet: 'እስካሁን የጥፋት ግኝት ማንቂ የለም',
  alertsWillAppear: 'የጥፋት ሰው ምርመራ ሲያደርግ ማንቂዎች እዚህ ይታያሉ',
  matched: 'የተዛመደ: {{name}}',
  suspectMatchAlert: 'የጥፋት ግኝት ማንቂ',
  suspectedPerson: 'የጥፋት ሰው',
  matchedGuest: 'የተዛመደ እንግዳ',
  locationBooking: 'ቦታ እና ምርመራ',
  serviceProvider: 'አገልግሎት አቅራቢ',
  room: 'ክፍል',
  checkIn: 'ግቤት',
  checkOut: 'ውጣ',
  nights: 'ሌሊቶች',
  totalCost: 'ጠቅላላ ዋጋ',
  date: 'ቀን',
  time: 'ሰዓት',
  service: 'አገልግሎት',
  email: 'ኢሜይል',
  nationality: 'ዜግነት',
  address: 'አድራሻ',
  matchTypeReservation: 'የክፍል ምርመራ',
  matchTypeDaytime: 'የቀን ጊዜ አገልግሎት',
  matchTypeCheckin: 'የእንግዳ ምዝገባ',
  failedToLoad: 'ማንቂዎችን መጫን አልተሳካም',
  idPrefix: 'ID: {{id}}',
  guestIdPrefix: 'ID: {{id}}'
};

const omTranslations = {
  pageTitle: 'Beeksisa Boruu',
  pageSubtitle: 'Qof boru qabiyyee yoo galmeessan beeksisa ofumaan',
  all: 'Hunda',
  unread: 'Sanyi hin jirre ({{count}})',
  markAllRead: 'Hunda sanyi irra deebi\'i',
  allAlertsMarked: 'Beeksisa hunda sanyi irra deebi\'ameera',
  failedMarkAll: 'Hunda sanyi irra deebi\'uu hin milkaa\'ine',
  noUnreadAlerts: 'Beeksisa sanyi hin jirre hin jiru',
  noAlertsYet: 'Beeksisa walsimsiisuu boruu hin jiru',
  alertsWillAppear: 'Qof boru qabiyyee galmeessan yoo ta\'u beeksisa bati',
  matched: 'Wal simatan: {{name}}',
  suspectMatchAlert: 'Beeksisa Walsimsiisuu Boruu',
  suspectedPerson: 'Qof Boru',
  matchedGuest: 'Deeggarsaa Wal Simatan',
  locationBooking: 'Bakka fi Qabiyyee',
  serviceProvider: 'Tajaajilaa',
  room: 'Kamira',
  checkIn: 'Seeni',
  checkOut: 'Ba\'i',
  nights: 'Halkaan',
  totalCost: 'Qabxii Waliigalaa',
  date: 'Guyaa',
  time: 'Sa\'aati',
  service: 'Tajaajili',
  email: 'Imeejl',
  nationality: 'Nannoo',
  address: 'Teessoo',
  matchTypeReservation: 'Qabiyyee Kamiraa',
  matchTypeDaytime: 'Tajaajili Guyyaa',
  matchTypeCheckin: 'Galmeessa Deeggarsaa',
  failedToLoad: 'Beeksisa fudhaachuun hin milkaa\'ine',
  idPrefix: 'ID: {{id}}',
  guestIdPrefix: 'ID: {{id}}'
};

const amPath = '/home/z/my-project/src/i18n/locales/am.json';
const omPath = '/home/z/my-project/src/i18n/locales/om.json';
const am = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const om = JSON.parse(fs.readFileSync(omPath, 'utf8'));

const ns = 'suspectAlerts';
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
const amSame = Object.keys(enV[ns]).filter(k => enV[ns][k] === amV[ns][k] && k !== 'idPrefix' && k !== 'guestIdPrefix');
const omSame = Object.keys(enV[ns]).filter(k => enV[ns][k] === omV[ns][k] && k !== 'idPrefix' && k !== 'guestIdPrefix');
console.log(`\nAM still same as EN: ${amSame.length}`);
amSame.forEach(k => console.log('  ' + k + ': ' + amV[ns][k]));
console.log(`OM still same as EN: ${omSame.length}`);
omSame.forEach(k => console.log('  ' + k + ': ' + omV[ns][k]));
