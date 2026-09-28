const fs = require('fs');
const path = require('path');

const terms = ['quota', 'firebase', 'firestore', 'localStorage', 'QuotaExceededError'];

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', 'dist', '.gemini', 'uploads', 'data'].includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (/\.(ts|tsx|js|jsx|json|html|env)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const term of terms) {
        const re = new RegExp(term, 'i');
        if (re.test(content)) {
          console.log(`[MATCH ${term}] in ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((l, i) => {
            if (re.test(l)) {
              console.log(`  Line ${i+1}: ${l.trim().substring(0, 120)}`);
            }
          });
        }
      }
    }
  }
}

searchDir('.');
