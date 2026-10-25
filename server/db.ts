import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'hostel_ease.db');
const targetDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable SQLite Foreign Key constraints, WAL mode & high-performance PRAGMAs for concurrency & speed
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB memory page cache
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 268435456'); // 256MB memory mapped I/O

/**
 * Creates a lazy SQLite statement that compiles on first execution rather than module load time.
 * This guarantees routes can be imported safely before migrations or seed scripts run.
 */
export function lazyStatement(sql: string): any {
  let stmt: any = null;
  return new Proxy({} as any, {
    get(_, prop) {
      if (!stmt) {
        stmt = db.prepare(sql);
      }
      const val = stmt[prop];
      return typeof val === 'function' ? val.bind(stmt) : val;
    }
  });
}

export default db;

