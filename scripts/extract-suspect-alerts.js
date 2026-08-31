const fs = require('fs');

const en = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/en.json', 'utf8'));
const am = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/am.json', 'utf8'));
const om = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/om.json', 'utf8'));

const namespace = 'suspectAlerts';
const enKeys = Object.keys(en[namespace] || {});
const amKeys = Object.keys(am[namespace] || {});
const omKeys = Object.keys(om[namespace] || {});

console.log(`EN keys: ${enKeys.length}`);
console.log(`AM keys: ${amKeys.length}`);
console.log(`OM keys: ${omKeys.length}`);

const amEnglish = amKeys.filter(k => /^[A-Za-z]{3,}/.test(am[namespace][k]) && !['VIP','ID','CSV','PDF'].some(a => am[namespace][k] === a));
console.log(`\nAM keys with English values: ${amEnglish.length}`);
if (amEnglish.length) amEnglish.forEach(k => console.log(`  ${k}: "${am[namespace][k]}"`));

const omEnglish = omKeys.filter(k => /^[A-Za-z]{3,}/.test(om[namespace][k]));
console.log(`\nOM keys starting with Latin: ${omEnglish.length}`);

const amMissing = enKeys.filter(k => !amKeys.includes(k));
const omMissing = enKeys.filter(k => !omKeys.includes(k));
console.log(`\nAM missing keys: ${amMissing.length}`, amMissing);
console.log(`OM missing keys: ${omMissing.length}`, omMissing);

console.log('\n--- All EN suspectAlerts keys ---');
enKeys.forEach(k => console.log(`  ${k}: "${en[namespace][k]}"`));
