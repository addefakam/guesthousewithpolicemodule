const fs = require('fs');

const en = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/en.json', 'utf8'));
const am = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/am.json', 'utf8'));
const om = JSON.parse(fs.readFileSync('/home/z/my-project/src/i18n/locales/om.json', 'utf8'));

const namespace = 'policeReports';
const enKeys = Object.keys(en[namespace] || {});
const amKeys = Object.keys(am[namespace] || {});
const omKeys = Object.keys(om[namespace] || {});

console.log(`EN keys: ${enKeys.length}`);
console.log(`AM keys: ${amKeys.length}`);
console.log(`OM keys: ${omKeys.length}`);

// Find keys with English values in am.json
const amEnglish = amKeys.filter(k => {
  const v = am[namespace][k];
  return /^[A-Za-z]/.test(v);
});
console.log(`\nAM keys with English values: ${amEnglish.length}`);
if (amEnglish.length > 0) {
  console.log('AM English values:');
  amEnglish.forEach(k => console.log(`  ${k}: "${am[namespace][k]}"`));
}

// Find keys with English values in om.json
const omEnglish = omKeys.filter(k => {
  const v = om[namespace][k];
  return /^[A-Za-z]/.test(v);
});
console.log(`\nOM keys with English values: ${omEnglish.length}`);
if (omEnglish.length > 0) {
  console.log('OM English values:');
  omEnglish.forEach(k => console.log(`  ${k}: "${om[namespace][k]}"`));
}

// Missing keys
const amMissing = enKeys.filter(k => !amKeys.includes(k));
const omMissing = enKeys.filter(k => !omKeys.includes(k));
console.log(`\nAM missing keys: ${amMissing.length}`, amMissing);
console.log(`OM missing keys: ${omMissing.length}`, omMissing);

// Print all EN keys and values for reference
console.log('\n--- All EN policeReports keys ---');
enKeys.forEach(k => console.log(`  ${k}: "${en[namespace][k]}"`));
