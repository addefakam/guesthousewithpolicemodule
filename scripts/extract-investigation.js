const fs = require('fs');

const en = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/en.json', 'utf8'));
const am = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/am.json', 'utf8'));
const om = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/om.json', 'utf8'));

const ns = 'investigation';
const enKeys = Object.keys(en[ns] || {});
const amKeys = Object.keys(am[ns] || {});
const omKeys = Object.keys(om[ns] || {});

console.log(`EN keys: ${enKeys.length}`);
console.log(`AM keys: ${amKeys.length}`);
console.log(`OM keys: ${omKeys.length}`);

const amEnglish = amKeys.filter(k => /^[A-Za-z]{3,}/.test(am[ns][k]) && !['VIP','ID','CSV','PDF'].some(a => am[ns][k] === a));
console.log(`\nAM keys with English values: ${amEnglish.length}`);
if (amEnglish.length) amEnglish.forEach(k => console.log(`  ${k}: "${am[ns][k]}"`));

const amMissing = enKeys.filter(k => !amKeys.includes(k));
const omMissing = enKeys.filter(k => !omKeys.includes(k));
console.log(`\nAM missing: ${amMissing.length}`, amMissing);
console.log(`OM missing: ${omMissing.length}`, omMissing);

console.log('\n--- All EN investigation keys ---');
enKeys.forEach(k => console.log(`  ${k}: "${en[ns][k]}"`));
