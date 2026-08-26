const fs = require('fs');
const src = fs.readFileSync('/home/z/my-project/ghms-clone/src/components/ghms/sidebar.tsx','utf8');
const lines = src.split('\n');
let depth = 0;
for (let i = 421; i < 603; i++) {
  const ln = lines[i];
  // Skip content inside string literals (simplified - just track parity)
  for (let j = 0; j < ln.length; j++) {
    const c = ln[j];
    if (c === '\\') { j++; continue; } // skip escaped char
    if (c === '"' || c === "'") { // skip string contents
      const q = c;
      j++;
      while (j < ln.length && ln[j] !== q) {
        if (ln[j] === '\\') j++; // skip escape inside string
        j++;
      }
      continue;
    }
    if (c === '/') {
      if (ln[j+1] === '/') break; // line comment, skip rest
    }
    if (c === '{') {
      depth++;
      if (depth <= 3) console.log('+' + depth, 'L' + (i+1) + ':' + (j+1), ln.trim().substring(0, 80));
    } else if (c === '}') {
      if (depth <= 3) console.log('-' + depth, 'L' + (i+1) + ':' + (j+1), ln.trim().substring(0, 80));
      depth--;
    }
  }
}
console.log('\nFinal brace depth:', depth);
