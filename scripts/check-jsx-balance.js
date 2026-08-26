const fs = require('fs');

const src = fs.readFileSync(process.argv[2], 'utf8');

// Strip single-line comments
let cleaned = src.replace(/\/\/.*$/gm, '');
// Strip multi-line comments
cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
// Strip string literals (single and double quotes) - simple approach
cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, '""');
cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '""');

// Find all JSX-like tags (capitalized components)
const tagRe = /<\/([A-Z][a-zA-Z]*)\s*|<([A-Z][a-zA-Z]*)(?:\s|\/|>)/g;
let m;
const stack = [];
let lineNum = 1;
const lineMap = [];
for (let i = 0; i < src.length; i++) {
  if (src[i] === '\n') { lineNum++; lineMap.push(i); }
}

function getLine(pos) {
  let ln = 1;
  for (let i = 0; i < pos && i < src.length; i++) {
    if (src[i] === '\n') ln++;
  }
  return ln;
}

// Reset and scan original source
cleaned = src;
while ((m = tagRe.exec(cleaned)) !== null) {
  if (m[1]) {
    // Closing tag
    const tagName = m[1];
    if (stack.length && stack[stack.length - 1].name === tagName) {
      stack.pop();
    } else if (stack.length && stack[stack.length - 1].name !== tagName) {
      console.log(`Line ${getLine(m.index)}: MISMATCH closing </${tagName}>, expected </${stack[stack.length - 1].name}>`);
    }
  } else if (m[2]) {
    // Opening tag - check if self-closing
    const afterTag = cleaned.slice(m.index + m[0].length - 1);
    if (!m[0].endsWith('/')) {
      stack.push({ name: m[2], pos: m.index });
    }
  }
}

if (stack.length > 0) {
  console.log('UNCLOSED tags:');
  for (const t of stack) {
    console.log(`  <${t.name}> opened at line ${getLine(t.pos)}`);
  }
} else {
  console.log('All component JSX tags are balanced.');
}
