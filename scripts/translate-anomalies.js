const fs = require('fs');

const amTranslations = {
  pageTitle: 'የህጋዊ ሥርዓት ማወቂያ',
  pageSubtitle: 'በAI የሚሰራ የስርጭት ትንታኔ — በሁሉም አቅራቢያን ውስጥ ጥፋት ያለ ባህሪ በራስ-ሰር ይገነባል',
  active: 'ንቁ',
  inactive: 'ያልንቁ',
  unreviewed: 'ያልተገመገመ',
  runSystemScan: 'የስርዓት ስካን አስጀምር',
  statTotal: 'ጠቅላላ ልዩነቶች',
  statUnreviewed: 'ያልተገመገመ',
  statLast30Days: 'የመጨረሻ 30 ቀናት',
  statAnomalyTypes: 'የልዩነት ዓይነቶች',
  allTypes: 'ሁሉም ዓይነቶች',
  allSeverity: 'ሁሉም ክብደት',
  severityCritical: 'አስተማማኝ',
  severityHigh: 'ከፍተኛ',
  severityMedium: 'መካከለኛ',
  severityLow: 'ዝቅተኛ',
  cancel: 'ሰርዝ',
  markReviewed: 'እንደተገመገመ ምልክት አድርግ ({{count}})',
  selectToReview: 'ለግመል ምረጥ',
  detectionOffBanner: 'በራስ-ሰር ማወቂያ ጠፍቷል። ምርመራ ፍጠር እና ግቤት ስርዓት ማወቂያ አያስነሳም። ለማንቀሳቀስ ከጎን ሰንጉላ ይጠቀሙ።',
  emptyTitle: 'ልዩነት አልተገኘም',
  emptyDescription: 'ልዩነቶች ምርመራ ሲፈጠር ወይም እንግዳ ሲግብ በራስ-ሰር ይገነባሉ። የእጅ ስርዓት ስካንም ማስጀምር ይችላሉ።',
  idPrefix: 'ID:',
  howItWorks: 'እንዴት ይሰራል',
  howItWorksDesc: 'የሰልጥኛ ልዩነት ማወቂያ ሞተር ህጋዊ-ወሰን ትንታን በመጠቀም (ውጭ AI API የለም) በሁሉም የእንግዳ ቤቶች ውስጥ ጥፋት ያለ ባህሪ በራስ-ሰር ይገነባል።',
  riskScoring: 'የአደጋ ነጥብ',
  riskScoringDesc: 'እያንዳንዱ ልዩነት በዓይነት እና ቅርጸት ላይ የተመሰረተ የአደጋ ነጥብ (0-100) ይወስዳል። ነጥቦች: ID ስርዓት ማስተሳሳት = 45, የተሻሻለ ID = 40, ፈጣን ብዙ-አቅራቢያ = 35, ወዘተ። ከፍተኛ ነጥቦች በራስ-ሰር ፖሊስ ማሳወቂያ ይሰራል።',
  toggleDesc: 'ሲተው, ማወቂያ በሁሉም ምርመራ ፍጠር እና እንግዳ ግቤት ላይ በራስ-ሰር ይሰራል። ሲጠፉ, አፈጻጸሙ ላይ ዜሮ ተጽእኖ።',
  manualScan: 'የእጅ ስካን',
  reviewDialogTitle: 'ልዩነቶችን ግመል',
  reviewDialogDesc: '{{count}} ልዩነት(ናት) ለግመል ተመርጧል። ይህ እንደተገመጠ ምልክት ያደርጋል። የተገመጡ ልዩነቶች በያልተገመገመ ብዛት ውስጥ አይታዩም።',
  confirmReview: 'አረጋግጥ ({{count}})',
  errorLoad: 'ልዩነቶች መጫን አልተሳካም',
  errorScan: 'ስካን አልተሳካም',
  errorSelectToReview: 'ለግመል ልዩነቶች ይምረጡ',
  successReviewed: '{{count}} ልዩነቶች ተገመጠዋል',
  errorReview: 'ልዩነቶችን ግመል አልተሳካም',
  timeJustNow: 'አሁን',
  timeMinutesAgo: 'ከ {{m}} ደቂቃ በፊት',
  timeHoursAgo: 'ከ {{h}} ሰዓት እና {{m}} ደቂቃ በፊት',
  timeDaysAgo: 'ከ {{d}} ቀን እና {{h}} ሰዓት በፊት',
  typeLabelsIdentityMismatch: 'የማንነት ልዩነት',
  typeLabelsRapidMultiProvider: 'ፈጣን ብዙ-አቅራቢያ',
  typeLabelsNoShowPattern: 'የማይመጣ ስርጭት',
  typeLabelsCashAnomaly: 'የገንዘብ ልዩነት',
  typeLabelsCrossProviderId: 'የተሻሻለ አቅራቢያ ID',
  typeLabelsShortStayPattern: 'የአጭር ቆይታ ስርጭት',
  typeLabelsFakeIdPattern: 'የስራ ID ስርጭት',
  typeDescsIdentityMismatch: 'ተመሳሳይ ስልክ በብዙ አቅራቢያን ውስጥ ከተለያዩ ስሞች ወይም IDs ጋር የተገናኘ',
  typeDescsRapidMultiProvider: 'በ48 ሰዓቶች ውስጥ በ2+ አቅራቢያን ምርመራ',
  typeDescsNoShowPattern: '3+ የተሰረዘ ወይም ያልተሞላ ምርመራ',
  typeDescsCashAnomaly: 'ያልተለመደ ትልቅ የገንዘብ ክፍያ ተገኝቷል',
  typeDescsCrossProviderId: 'ተመሳሳይ ID ቁጥር በብዙ አቅራቢያን ውስጥ ከተለያዩ ስሞች ጋር',
  typeDescsShortStayPattern: 'በብዙ አቅራቢያን ውስጥ የተደጋጋሚ 1-ሌሊት ቆይታ',
  typeDescsFakeIdPattern: 'ተመሳሳይ ID ቁጥር በብዙ እንግዳዎች ዘንድ የተጋራ',
  severity_LOW: 'ዝቅተኛ',
  severity_MEDIUM: 'መካከለኛ',
  severity_HIGH: 'ከፍተኛ',
  severity_CRITICAL: 'አስተማማኝ'
};

const omTranslations = {
  pageTitle: 'Argannoo Gaaffii',
  pageSubtitle: 'Tarkaanfii raawwii AI — qabduu dogoggoraa tajaajiltoota hunda irratti ofumaan argachuu',
  active: 'Haala ho\'a',
  inactive: 'Haala hin ho\'a',
  unreviewed: 'ilaalematuu dhabu',
  runSystemScan: 'Skaanii Sirrii Kaasi',
  statTotal: 'Gaaffii Waliigalaa',
  statUnreviewed: 'Ilaalematuu dhabu',
  statLast30Days: 'Guyyaa 30 Dhiyootti',
  statAnomalyTypes: 'Gosa Gaaffii',
  allTypes: 'Gosa Hunda',
  allSeverity: 'Cimaa Hunda',
  severityCritical: 'Cimaa',
  severityHigh: 'Guddaa',
  severityMedium: 'Gidduugala',
  severityLow: 'Xiqqaa',
  cancel: 'Dhiisi',
  markReviewed: 'Ilaaleme Akkadeessi ({{count}})',
  selectToReview: 'Ilaaluuf Filadhu',
  detectionOffBanner: 'Argannoo ofumaa OFF ta\'eera. Qabiyyee uumuu fi seensii qorannoo gaaffii hin qopha\'u. Sidebar irra ON qofii kuusaa.',
  emptyTitle: 'Gaaffii hin argamne',
  emptyDescription: 'Gaaffiin yoo qabiyyee uumaman ykn deeggarsaonni seenu ofumaan argama. Skaanii qofaa haaraadhaan kaasuu ni danda\'a.',
  idPrefix: 'ID:',
  howItWorks: 'Ishii Itti Ho\'jannoo',
  howItWorksDesc: 'Injiniin Argannoo Garagaraa tarkaanfii ka\'a waliin (AI API alaa) qabduu dogoggoraa hoteela hunda irratti ofumaan argachuu',
  riskScoring: 'Qabxii Dangaa',
  riskScoringDesc: 'Gaaffii tokko qabxii dangaa (0-100) gosa fi raawwii irratti hir\'isaa. Qabxiin: ID sochii = 45, ID tajaajiltaa waliigaltuu = 40, tajaajiltaa hedduu sa\'aatii 48 = 35, kkf. Qabxii guddaan beeksisa polisii ofumaan erga.',
  toggleDesc: 'ON yoo ta\'e, argannoo qabiyyee hundaa uumuu fi seensii irratti ofumaan hafa. OFF yoo ta\'e, tasaa hin danda\'u.',
  manualScan: 'Skaanii Qofaa',
  reviewDialogTitle: 'Gaaffi Ilaali',
  reviewDialogDesc: 'Gaaffii {{count}} ilaaluuf filameera. Kun isaan ilaaleme akka ta\'e mallatteessa. Gaaffiin ilaaleme lakkoofsa hin ilaalene keessatti hin mul\'atu.',
  confirmReview: 'Mirkanaa\'i ({{count}})',
  errorLoad: 'Gaaffii fudhaachuun hin milkaa\'ine',
  errorScan: 'Skaaniin hin milkaa\'ine',
  errorSelectToReview: 'Gaaffii ilaaluuf filadhu',
  successReviewed: 'Gaaffii {{count}} ilaalemeera',
  errorReview: 'Gaaffii ilaaluu hin milkaa\'ine',
  timeJustNow: 'Amma',
  timeMinutesAgo: 'daqiiqaa {{m}} dhiyootti',
  timeHoursAgo: 'sa\'aati {{h}} daqiiqaa {{m}} dhiyootti',
  timeDaysAgo: 'guyyaa {{d}} sa\'aati {{h}} dhiyootti',
  typeLabelsIdentityMismatch: 'Hin Simatne Qaama',
  typeLabelsRapidMultiProvider: 'Tajaajilaa Hedduu Ariifataa',
  typeLabelsNoShowPattern: 'Raawwii Hin Dhufne',
  typeLabelsCashAnomaly: 'Gaaffii Qarshii',
  typeLabelsCrossProviderId: 'ID Tajaajilaa Waliigaltuu',
  typeLabelsShortStayPattern: 'Raawwii Tarkaanfii Gaafaa',
  typeLabelsFakeIdPattern: 'Raawwii ID Dogoggoraa',
  typeDescsIdentityMismatch: 'Bilbila walfakkaatu maqoota ykn ID adda addaa waliin tajaajiltoota hedduu irratti walqabate',
  typeDescsRapidMultiProvider: 'Qabiyyee sa\'aati 48 keessatti tajaajiltoota 2+ irratti',
  typeDescsNoShowPattern: 'Qabiyyee dhiisame ykn hin xumuramne 3+',
  typeDescsCashAnomaly: 'Qarshii guddaa hin yaadatamne argame',
  typeDescsCrossProviderId: 'Lakkoofsa ID walfakkaatu maqoota adda addaa waliin tajaajiltoota hedduu irratti',
  typeDescsShortStayPattern: 'Tarkaanfii guyyaa 1 tajaajiltoota hedduu irratti dabataa',
  typeDescsFakeIdPattern: 'Lakkoofsa ID walfakkaatu deeggarsaonni hedduu waliin simatameera',
  severity_LOW: 'Xiqqaa',
  severity_MEDIUM: 'Gidduugala',
  severity_HIGH: 'Guddaa',
  severity_CRITICAL: 'Cimaa'
};

const amPath = '/home/z/my-project/src/i18n/locales/am.json';
const omPath = '/home/z/my-project/src/i18n/locales/om.json';
const am = JSON.parse(fs.readFileSync(amPath, 'utf8'));
const om = JSON.parse(fs.readFileSync(omPath, 'utf8'));

const ns = 'anomalies';
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
const skip = ['markReviewed','confirmReview','reviewDialogDesc','successReviewed','timeMinutesAgo','timeHoursAgo','timeDaysAgo','idPrefix'];
const amSame = Object.keys(enV[ns]).filter(k => !skip.includes(k) && enV[ns][k] === amV[ns][k]);
const omSame = Object.keys(enV[ns]).filter(k => !skip.includes(k) && enV[ns][k] === omV[ns][k]);
console.log(`\nAM still same as EN: ${amSame.length}`);
amSame.forEach(k => console.log('  ' + k + ': ' + amV[ns][k]));
console.log(`OM still same as EN: ${omSame.length}`);
omSame.forEach(k => console.log('  ' + k + ': ' + omV[ns][k]));
