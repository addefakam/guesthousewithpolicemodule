const fs = require('fs');

const en = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/en.json', 'utf8'));
const am = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/am.json', 'utf8'));
const om = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/om.json', 'utf8'));

const namespace = 'policeGuests';
const enKeys = Object.keys(en[namespace] || {});
const amKeys = Object.keys(am[namespace] || {});
const omKeys = Object.keys(om[namespace] || {});

console.log(`EN keys: ${enKeys.length}`);
console.log(`AM keys: ${amKeys.length}`);
console.log(`OM keys: ${omKeys.length}`);

const amEnglish = amKeys.filter(k => /^[A-Za-z]/.test(am[namespace][k]));
console.log(`\nAM keys with English values: ${amEnglish.length}`);
if (amEnglish.length) amEnglish.forEach(k => console.log(`  ${k}: "${am[namespace][k]}"`));

const omEnglish = omKeys.filter(k => /^[A-Za-z]/.test(om[namespace][k]));
console.log(`\nOM keys with English values: ${omEnglish.length}`);
if (omEnglish.length) omEnglish.forEach(k => console.log(`  ${k}: "${om[namespace][k]}"`));

const amMissing = enKeys.filter(k => !amKeys.includes(k));
const omMissing = enKeys.filter(k => !omKeys.includes(k));
console.log(`\nAM missing keys: ${amMissing.length}`, amMissing);
console.log(`OM missing keys: ${omMissing.length}`, omMissing);

console.log('\n--- All EN policeGuests keys ---');
enKeys.forEach(k => console.log(`  ${k}: "${en[namespace][k]}"`));
