/* Baza e të dhënave: PostgreSQL (p.sh. Neon falas) kur ka DATABASE_URL; përndryshe PGlite lokal në dosjen data/ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));

let run, transaction;
/* Në server (Render) baza lokale nuk përdoret: harxhon shumë memorie dhe të dhënat do të humbisnin */
if (!process.env.DATABASE_URL && (process.env.RENDER || process.env.NODE_ENV === 'production')) {
  console.error('\n[db] GABIM: mungon DATABASE_URL. Te Render → Environment shto DATABASE_URL me lidhjen nga Neon (postgresql://…sslmode=require) dhe ruaje.\n');
  process.exit(1);
}
if (process.env.DATABASE_URL) {
  /* Kontroll i shpejtë që lidhja të jetë e plotë, p.sh. postgresql://përdoruesi:fjalëkalimi@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require */
  let host = '';
  try { const u = new URL(process.env.DATABASE_URL.trim()); if (/^postgres(ql)?:$/.test(u.protocol)) host = u.hostname; } catch {}
  if (!host || (!host.includes('.') && !/^(localhost|127\.0\.0\.1)$/.test(host))) {
    console.error('\n[db] GABIM: DATABASE_URL nuk është lidhje e saktë Postgres. Duhet të fillojë me postgresql:// dhe të ketë adresën e serverit, p.sh. ...@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require. Kopjoje të plotë nga Neon → Connect, pa thonjëza dhe pa fjalën psql.\n');
    process.exit(1);
  }
  /* Neon shton "channel_binding=require"; drejtuesi pg e trajton vetë sigurinë, ndaj parametri hiqet */
  const clean = new URL(process.env.DATABASE_URL.trim());
  clean.searchParams.delete('channel_binding');
  process.env.DATABASE_URL = clean.toString();
  const { default: pg } = await import('pg');
  const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: local ? false : { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 30000 });
  pool.on('error', e => console.error('[db]', e.message));
  run = async (sql, params) => (await pool.query(sql, params)).rows;
  transaction = async fn => {
    const c = await pool.connect();
    try { await c.query('BEGIN'); const r = await fn(async (sql, p) => (await c.query(sql, p)).rows); await c.query('COMMIT'); return r; }
    catch (e) { await c.query('ROLLBACK'); throw e; }
    finally { c.release(); }
  };
} else {
  const { PGlite } = await import('@electric-sql/pglite');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const lite = new PGlite(path.join(DATA_DIR, 'pg'));
  run = async (sql, params) => (await lite.query(sql, params)).rows;
  transaction = fn => lite.transaction(t => fn(async (sql, p) => (await t.query(sql, p)).rows));
}

/** Kthen të gjitha rreshtat */
export const q = (sql, params = []) => run(sql, params);
/** Kthen rreshtin e parë ose null */
export const one = async (sql, params = []) => (await run(sql, params))[0] || null;
/** Ekzekuton disa kërkesa si një të vetme (ose të gjitha, ose asnjë) */
export const tx = fn => transaction(fn);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, pass TEXT NOT NULL,
    address TEXT, role TEXT NOT NULL DEFAULT 'customer', created DOUBLE PRECISION NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires DOUBLE PRECISION NOT NULL);
  CREATE TABLE IF NOT EXISTS resets (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, code TEXT NOT NULL, expires DOUBLE PRECISION NOT NULL, tries INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY, data TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, updated DOUBLE PRECISION NOT NULL);
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY, no TEXT UNIQUE NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id), status TEXT NOT NULL, pay TEXT NOT NULL,
    paypal_id TEXT UNIQUE, data TEXT NOT NULL, total DOUBLE PRECISION NOT NULL, created DOUBLE PRECISION NOT NULL, updated DOUBLE PRECISION NOT NULL);
  CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
  CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, created DOUBLE PRECISION NOT NULL);
  CREATE TABLE IF NOT EXISTS images (name TEXT PRIMARY KEY, mime TEXT NOT NULL, data BYTEA NOT NULL, created DOUBLE PRECISION NOT NULL)`;
for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await run(stmt, []);

/* Herën e parë mbush katalogun me produktet fillestare */
if (!(await one('SELECT COUNT(*)::int AS n FROM products')).n) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'seed-products.json'), 'utf8'));
  await tx(async t => {
    for (const p of seed) await t('INSERT INTO products (id, data, active, updated) VALUES ($1, $2, TRUE, $3)', [p.id, JSON.stringify(p), Date.now()]);
    await t("SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products))");
  });
}
