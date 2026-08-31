const fs = require('fs');

const amTranslations = {
  pageTitle: 'የማሳወቂያ ስርጭት',
  pageSubtitlePolice: 'ከፖሊስ ሞዱል ወደ ሁሉም የእንግዳ ቤት አገልግሎት አቅራቢያን ማሳወቂያ ይላኩ',
  pageSubtitleAdmin: 'ለሁሉም የእንግዳ ቤት አገልግሎት አቅራቢያን ስርአተ-ሰርዓት ማሳወቂያ ይላኩ',
  badgePolice: 'ፖሊስ',
  badgeSystemAdmin: 'ስርአተ አስተዳዳሪ',
  tabCompose: 'ያዘጋጁ',
  tabHistory: 'ታሪክ',
  errorLoadProviders: 'የአቅራቢያ ዝርዝር መጫን አልተሳካም',
  successSent: 'ማሳወቂያ ተልኳል! {{sent}} ተሰጥቷል, {{failed}} አልተሳካም',
  successSentDesc: 'ጨለማ: {{channel}} | ቅድሚያ: {{priority}}',
  errorSendBroadcast: 'ሰርጥ መላክ አልተሳካም',
  availabilityPhone: 'ስልክ ቁጥር',
  availabilityTelegram: 'Telegram chat ID',
  availabilityWarning: 'ከ {{total}} አቅራቢያን ውስጥ {{available}} {{label}} አላቸውም',
  composeTitle: 'ማሳወቂያ ያዘጋጁ',
  composeDescription: 'ለየእንግዳ ቤት አገልግሎት አቅራቢያን የሚላክ ማሳወቂያ ፍጠሩ።',
  viewerWarning: 'ደረጃዎ (ተመልከቻ) ለንባብ ብቻ ነው። ማሳወቂያ ለመላክ ኦፊሰር ወይም አስተዳዳሪን ያነጋግሩ።',
  lblTitle: 'ርዕሰ ጽሁፍ',
  placeholderTitle: 'ለምሳሌ, የደህንነት ግብረ መልስ ማሳወቂያ, አዲስ መመሪያ ማንቂ',
  lblMessage: 'መልዕክት',
  placeholderMessage: 'የማሳወቂያ መልዕክት ይያዙት እዚህ...\n\nይህ ለሁሉም የተመረጡ አገልግሎት አቅራቢያን ይላካል።',
  characters: 'ቁምፊዎች',
  allApprovedProviders: 'ሁሉም የተፈቀደ አቅራቢያን',
  selectedProvidersOnly: 'የተመረጡ አቅራቢያን ብቻ',
  dispatching: 'በመላክ ላይ...',
  dispatchTo: 'ወደ ይላክ',
  allCount: 'ሁሉም ({{count}})',
  selectedCount: '{{count}} የተመረጡ',
  providers: 'አቅራቢያን',
  urgentBadge: 'አስቸኳይ',
  searchProviders: 'አቅራቢያን ፈልግ...',
  selectAll: 'ሁሉንም ምረጥ',
  emptyProviders: 'የተፈቀደ አቅራቢያን አልተገኘም',
  rooms: 'ክፍሎች',
  guests: 'እንግዳዎች',
  smsWhatsapp: 'SMS/WhatsApp',
  inAppUsers: 'በመተግበሪያ ውስጥ ({{count}} ተጠቃሚዎች)',
  errorLoadHistory: 'የሰርጥ ታሪክ መጫን አልተሳካም',
  historyTitle: 'የሰርጥ ታሪክ',
  historyDescription: 'የቀድሞ የተላከ ማሳወቂያዎች እና የማስተላለፊያ ሁኔታቸውን ይመልከቱ።',
  emptyHistory: 'እስካሁን የሰርጥ ታሪክ የለም',
  emptyHistorySub: 'የተላከ ማሳወቂያዎች እዚህ ይታያሉ',
  sentBy: 'በ {{name}}',
  targetAll: 'ሁሉም',
  targetSelected: '{{count}} የተመረጡ',
  previous: 'ቀዳሚ',
  pageOf: 'ገጽ {{page}} ከ {{total}}',
  next: 'ይቀጥሉ',
  channelsInApp: 'በመተግበሪያ ማሳወቂያ',
  channelsSms: 'SMS',
  channelsWhatsapp: 'WhatsApp',
  channelsTelegram: 'Telegram',
  prioritiesLow: 'ዝቅተኛ',
  prioritiesNormal: 'መደበኛ',
  prioritiesHigh: 'ከፍተኛ',
  prioritiesUrgent: 'አስቸኳይ'
};

const omTranslations = {
  pageTitle: 'Beeksisa Ergaa',
  pageSubtitlePolice: 'Mojuul polisii irraa tajaajiltoota hoteela guutuu beeksisa ergi',
  pageSubtitleAdmin: 'Tajaajiltoota hoteela hundaaf beeksisa sirrii waliigalaa ergi',
  badgePolice: 'Polisii',
  badgeSystemAdmin: 'Dajaa Sirrii',
  tabCompose: 'Qophaa\'i',
  tabHistory: 'Seenaa',
  errorLoadProviders: 'Tarreentaa tajaajilaa fudhaachuun hin milkaa\'ine',
  successSent: 'Beeksisa ergameera! {{sent}} dhufame, {{failed}} hin milkaa\'ine',
  successSentDesc: 'Daanga: {{channel}} | Miira: {{priority}}',
  errorSendBroadcast: 'Bulchiinsa erguu hin milkaa\'ine',
  availabilityPhone: 'lakkoofsa bilbilaa',
  availabilityTelegram: 'Telegram chat ID',
  availabilityWarning: 'Tajaajiltoota {{total}} keessaa {{available}} {{label}} qabu',
  composeTitle: 'Beeksisa Qophaa\'i',
  composeDescription: 'Tajaajiltoota hoteelaaf beeksisa argachuu qophaa\'i',
  viewerWarning: 'Darajaa (Ilaaltuu) dubbisuu qofatu. Beeksisa erguuf ofisaan ykn dajaa mariyadhaa',
  lblTitle: 'Mataa Duree',
  placeholderTitle: 'Fkn, Beeksisa Qorannoo Tasaa, Beeksisa Madaalii Haaraa',
  lblMessage: 'Ergaa',
  placeholderMessage: 'Saqunsa beeksisa bati\n\nKun tajaajiltoota filatan hundaaf dhufa',
  characters: 'qubeewwan',
  allApprovedProviders: 'Tajaajiltoota Mirkanaa\'e Hunda',
  selectedProvidersOnly: 'Tajaajiltoota Filatan Qofatu',
  dispatching: 'Erguu...',
  dispatchTo: 'Ergi',
  allCount: 'Hunda ({{count}})',
  selectedCount: '{{count}} Filaman',
  providers: 'Tajaajiltoota',
  urgentBadge: 'HAARA\'A',
  searchProviders: 'Tajaajiltoota barbaadi...',
  selectAll: 'Hunda Filadhu',
  emptyProviders: 'Tajaajiltoota mirkanaa\'e hin argamne',
  rooms: 'kamoonni',
  guests: 'deeggarsaonni',
  smsWhatsapp: 'SMS/WhatsApp',
  inAppUsers: 'App Keessaa ({{count}} fayyadamaa)',
  errorLoadHistory: 'Seenaa bulchiinsa fudhaachuun hin milkaa\'ine',
  historyTitle: 'Seenaa Bulchiinsa',
  historyDescription: 'Beeksisa dhiyootti ergame fi haala dhufuuf isaanii ilaali',
  emptyHistory: 'Seenaa bulchiinsa hin jiru',
  emptyHistorySub: 'Beeksisa ergame bati ni mul\'ata',
  sentBy: 'cin {{name}}',
  targetAll: 'Hunda',
  targetSelected: '{{count}} filaman',
  previous: 'Dhiyootti',
  pageOf: 'Fuula {{page}} kan {{total}}',
  next: 'Itti fufi',
  channelsInApp: 'Beeksisa App',
  channelsSms: 'SMS',
  channelsWhatsapp: 'WhatsApp',
  channelsTelegram: 'Telegram',
  prioritiesLow: 'Xiqqaa',
  prioritiesNormal: 'Gabaabaa',
  prioritiesHigh: 'Guddaa',
  prioritiesUrgent: 'Cimaa'
};

const amPath = '/home/z/my-project/src/i18n/locales/am.json';
const omPath = '/home/z/my-project/src/i18n/locales/om.json';
const am = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const om = JSON.parse(fs.readFileSync(omPath, 'utf8'));

const ns = 'notificationDispatch';
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
const skip = ['successSent','successSentDesc','availabilityWarning','allCount','selectedCount','pageOf','inAppUsers','sentBy','targetSelected','channelsSms','channelsWhatsapp','channelsTelegram'];
const amSame = Object.keys(enV[ns]).filter(k => !skip.includes(k) && enV[ns][k] === amV[ns][k]);
const omSame = Object.keys(enV[ns]).filter(k => !skip.includes(k) && enV[ns][k] === omV[ns][k]);
console.log(`\nAM still same as EN: ${amSame.length}`);
amSame.forEach(k => console.log('  ' + k + ': ' + amV[ns][k]));
console.log(`OM still same as EN: ${omSame.length}`);
omSame.forEach(k => console.log('  ' + k + ': ' + omV[ns][k]));
