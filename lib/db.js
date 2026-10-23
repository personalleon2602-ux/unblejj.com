/* Baza e të dhënave (SQLite, e integruar në Node). Ruhet në DATA_DIR. */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
export const UPLOADS = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'unblej.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    pass TEXT NOT NULL,
    address TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS resets (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires INTEGER NOT NULL,
    tries INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    no TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL,
    pay TEXT NOT NULL,
    paypal_id TEXT UNIQUE,
    data TEXT NOT NULL,
    total REAL NOT NULL,
    created INTEGER NOT NULL,
    updated INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS subscribers (
    email TEXT PRIMARY KEY,
    created INTEGER NOT NULL
  );
`);

/* Herën e parë mbush katalogun me produktet fillestare */
if (!db.prepare('SELECT COUNT(*) AS n FROM products').get().n) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'seed-products.json'), 'utf8'));
  const ins = db.prepare('INSERT INTO products (id, data, active, updated) VALUES (?, ?, 1, ?)');
  for (const p of seed) ins.run(p.id, JSON.stringify(p), Date.now());
}

export const tx = fn => (...args) => {
  db.exec('BEGIN');
  try { const r = fn(...args); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
};
