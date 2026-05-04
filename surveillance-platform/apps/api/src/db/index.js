import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const resolveDbPath = () => {
  const url = process.env.DATABASE_URL || 'file:./data/surveillance.sqlite';
  const filePath = url.startsWith('file:') ? url.slice('file:'.length) : url;
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
};

let _db;

export const db = () => {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  _db.exec(schema);
  return _db;
};

export const snapshotsDir = () => {
  const dir = path.resolve(path.dirname(resolveDbPath()), 'snapshots');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
