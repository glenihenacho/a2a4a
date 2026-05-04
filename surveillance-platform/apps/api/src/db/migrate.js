// Schema is applied lazily on first DB() call; this script just touches the
// DB so CI/CD has a deterministic "migrations applied" exit code.
import { db } from './index.js';

const d = db();
const tables = d.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Schema applied. Tables:', tables.map((t) => t.name).join(', '));
