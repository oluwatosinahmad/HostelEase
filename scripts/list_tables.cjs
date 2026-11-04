const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/hostel_ease.db'));

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log(`Total Tables: ${tables.length}`);
for (const t of tables) {
  try {
    const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get();
    console.log(`${t.name.padEnd(35)} : ${count.c} rows`);
  } catch (e) {
    console.log(`${t.name.padEnd(35)} : error (${e.message})`);
  }
}
