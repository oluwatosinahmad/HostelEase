const fs = require('fs');
const path = require('path');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, fileList);
    } else if (/\.(tsx?|jsx?|json|html|md)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = [
  ...scanDir(path.join(__dirname, '..', 'src')),
  ...scanDir(path.join(__dirname, '..', 'server')),
  ...scanDir(path.join(__dirname, '..', 'netlify'))
];

const results = {};
for (const f of allFiles) {
  const rel = path.relative(path.join(__dirname, '..'), f);
  if (rel.startsWith('src' + path.sep + 'data' + path.sep + 'seedUsers.json')) continue; // generated mock data
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const fileMatches = [];
  lines.forEach((line, idx) => {
    if (/landlord/i.test(line)) {
      fileMatches.push({ line: idx + 1, text: line.trim() });
    }
  });
  if (fileMatches.length > 0) {
    results[rel] = fileMatches;
  }
}

console.log(`Total files with 'landlord': ${Object.keys(results).length}`);
for (const [file, matches] of Object.entries(results)) {
  console.log(`\n--- ${file} (${matches.length} matches) ---`);
  matches.forEach(m => console.log(`  [${m.line}] ${m.text}`));
}
