const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'sql');
const targetFile = path.join(targetDir, 'index.mjs');

try {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, 'export {};\n');
  console.log('[fix-prisma-sql] Successfully ensured .prisma/client/sql/index.mjs stub exists');
} catch (err) {
  console.warn('[fix-prisma-sql] Warning: Could not create stub file:', err);
}
