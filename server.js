/* Serveri i unblej: faqja, API-ja për llogaritë, porositë, PayPal dhe paneli i administrimit */
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, tx, UPLOADS } from './lib/db.js';
import { hashPassword, verifyPassword, sha256, randomCode, startSession, endSession, endAllSessions, currentUser, publicUser, isAdmin, limited } from './lib/auth.js';
import { allProducts, productById, buildOrder, newOrderNo, takeStock, orderOut, couponFor, COUPONS, STATUS, ShopError } from './lib/shop.js';
import { mails, sendSafe } from './lib/mail.js';
import { paypalEnabled, createPaypalOrder, capturePaypalOrder } from './lib/paypal.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

/* Kokat e sigurisë; PayPal lejohet vetëm aty ku duhet */
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    `script-src 'self' 'nonce-${res.locals.nonce}' https://www.paypal.com https://*.paypal.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.paypal.com https://*.paypalobjects.com",
    "frame-src https://*.paypal.com",
    "connect-src 'self' https://*.paypal.com",
    "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"
  ].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '200kb' }));

/* Kërkesat që ndryshojnë diçka pranohen vetëm nga e njëjta faqe */
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  const origin = req.get('origin');
  if (origin && new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Kërkesë e ndaluar.' });
  next();
});

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const need = (req, res) => { const u = currentUser(req); if (!u) { res.status(401).json({ error: 'Kyçu për të vazhduar.' }); return null; } return u; };
const needAdmin = (req, res) => { const u = currentUser(req); if (!u || !isAdmin(u)) { res.status(403).json({ error: 'Vetëm për administratorët.' }); return null; } return u; };
const ip = req => req.ip || 'x';
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160;
const phoneOk = p => String(p || '').replace(/\D/g, '').length >= 8;
const config = () => ({ paypalClientId: paypalEnabled() ? process.env.PAYPAL_CLIENT_ID : null, currency: 'EUR' });

/* ---------- Faqja ---------- */
const indexHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
function sendIndex(req, res) {
  const boot = `<script nonce="${res.locals.nonce}">window.__CATALOG__=${json(allProducts())};window.__ME__=${json(publicUser(currentUser(req)))};window.__CONFIG__=${json(config())};</script>`;
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(indexHtml.replace('<!--BOOT-->', boot));
}
app.get('/', sendIndex);
app.get('/index.html', sendIndex);
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC, 'admin.html')));
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/uploads', express.static(UPLOADS, { maxAge: '30d', immutable: true }));
app.use(express.static(PUBLIC, { maxAge: '1h', index: false }));

/* ---------- Llogaritë ---------- */
app.get('/api/config', (req, res) => res.json(config()));
app.get('/api/me', (req, res) => res.json({ user: publicUser(currentUser(req)) }));

app.post('/api/auth/register', wrap(async (req, res) => {
  if (limited(`reg:${ip(req)}`, 10, 36e5)) return res.status(429).json({ error: 'Shumë përpjekje. Provo përsëri pas pak.' });
  const email = String(req.body.email || '').trim().toLowerCase(), name = String(req.body.name || '').trim().slice(0, 120);
  const phone = String(req.body.phone || '').trim().slice(0, 40), pw = String(req.body.password || '');
  if (!name || !emailOk(email) || !phoneOk(phone)) return res.status(400).json({ error: 'Plotëso emrin, një email të saktë dhe numrin e telefonit.' });
  if (pw.length < 6 || pw.length > 200) return res.status(400).json({ error: 'Fjalëkalimi duhet të ketë të paktën 6 shenja.' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'Ky email ka tashmë llogari. Kyçu me fjalëkalimin tënd.' });
  const r = db.prepare('INSERT INTO users (email, name, phone, pass, created) VALUES (?, ?, ?, ?, ?)').run(email, name, phone, await hashPassword(pw), Date.now());
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
  startSession(res, u.id);
  sendSafe(mails.welcome(u));
  res.json({ user: publicUser(u) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(), pw = String(req.body.password || '');
  if (limited(`login:${ip(req)}`, 20, 9e5) || limited(`login:${email}`, 8, 9e5)) return res.status(429).json({ error: 'Shumë përpjekje. Provo përsëri pas 15 minutash ose rivendos fjalëkalimin.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!u || !(await verifyPassword(pw, u.pass))) return res.status(401).json({ error: 'Email-i ose fjalëkalimi nuk është i saktë.' });
  startSession(res, u.id);
  res.json({ user: publicUser(u) });
}));

app.post('/api/auth/logout', (req, res) => { endSession(req, res); res.json({ ok: true }); });

/* Fjalëkalimi i harruar: përgjigjja është gjithmonë e njëjtë, që të mos zbulohet nëse email-i ekziston */
app.post('/api/auth/forgot', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailOk(email)) return res.status(400).json({ error: 'Shkruaj një adresë email të saktë.' });
  if (limited(`forgot:${email}`, 3, 9e5) || limited(`forgot:${ip(req)}`, 10, 36e5)) return res.status(429).json({ error: 'Ke kërkuar shumë kode. Provo përsëri pas 15 minutash.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (u) {
    const code = randomCode();
    db.prepare('INSERT OR REPLACE INTO resets (user_id, code, expires, tries) VALUES (?, ?, ?, 0)').run(u.id, sha256(`${u.id}:${code}`), Date.now() + 9e5);
    sendSafe(mails.resetCode(u, code));
  }
  res.json({ ok: true });
}));

app.post('/api/auth/reset', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(), code = String(req.body.code || '').replace(/\D/g, ''), pw = String(req.body.password || '');
  if (pw.length < 6 || pw.length > 200) return res.status(400).json({ error: 'Fjalëkalimi i ri duhet të ketë të paktën 6 shenja.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const r = u && db.prepare('SELECT * FROM resets WHERE user_id = ?').get(u.id);
  if (!r || r.expires < Date.now()) return res.status(400).json({ error: 'Kodi ka skaduar ose nuk është i vlefshëm. Kërko një kod të ri.' });
  if (r.code !== sha256(`${u.id}:${code}`)) {
    const tries = r.tries + 1;
    if (tries >= 5) { db.prepare('DELETE FROM resets WHERE user_id = ?').run(u.id); return res.status(400).json({ error: 'Shumë përpjekje të gabuara. Kërko një kod të ri.', restart: true }); }
    db.prepare('UPDATE resets SET tries = ? WHERE user_id = ?').run(tries, u.id);
    return res.status(400).json({ error: `Kodi nuk është i saktë. Të kanë mbetur ${5 - tries} përpjekje.` });
  }
  db.prepare('UPDATE users SET pass = ? WHERE id = ?').run(await hashPassword(pw), u.id);
  db.prepare('DELETE FROM resets WHERE user_id = ?').run(u.id);
  endAllSessions(u.id);
  startSession(res, u.id);
  res.json({ user: publicUser(u) });
}));

app.post('/api/auth/password', wrap(async (req, res) => {
  const u = need(req, res); if (!u) return;
  if (!(await verifyPassword(String(req.body.current || ''), u.pass))) return res.status(400).json({ error: 'Fjalëkalimi aktual nuk është i saktë.' });
  const pw = String(req.body.password || '');
  if (pw.length < 6 || pw.length > 200) return res.status(400).json({ error: 'Fjalëkalimi i ri duhet të ketë të paktën 6 shenja.' });
  db.prepare('UPDATE users SET pass = ? WHERE id = ?').run(await hashPassword(pw), u.id);
  endAllSessions(u.id);
  startSession(res, u.id);
  res.json({ ok: true });
}));

app.put('/api/me', (req, res) => {
  const u = need(req, res); if (!u) return;
  const name = String(req.body.name || '').trim().slice(0, 120), phone = String(req.body.phone || '').trim().slice(0, 40);
  if (!name || !phoneOk(phone)) return res.status(400).json({ error: 'Shkruaj emrin dhe një numër telefoni të saktë.' });
  const a = req.body.address || {};
  const address = { country: ['ks', 'al', 'mk'].includes(a.country) ? a.country : 'ks', city: String(a.city || '').slice(0, 80), street: String(a.street || '').slice(0, 200) };
  db.prepare('UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?').run(name, phone, JSON.stringify(address), u.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)) });
});

/* ---------- Produktet, kuponët, abonimi ---------- */
app.get('/api/products', (req, res) => res.json({ products: allProducts() }));

app.post('/api/coupon', (req, res) => {
  const u = need(req, res); if (!u) return;
  try { const c = couponFor(req.body.code, u.id); res.json({ code: c, pct: COUPONS[c] }); } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

app.post('/api/newsletter', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailOk(email)) return res.status(400).json({ error: 'Shkruaj një adresë email të saktë.' });
  if (limited(`news:${ip(req)}`, 10, 36e5)) return res.status(429).json({ error: 'Provo përsëri pas pak.' });
  db.prepare('INSERT OR IGNORE INTO subscribers (email, created) VALUES (?, ?)').run(email, Date.now());
  res.json({ ok: true });
});

/* ---------- Porositë ---------- */
function saveAddress(u, o, body) {
  if (body.saveAddress) db.prepare('UPDATE users SET phone = ?, address = ? WHERE id = ?').run(o.phone, JSON.stringify({ country: o.country, city: o.city, street: o.street }), u.id);
}
function notify(o, u) {
  sendSafe(mails.orderConfirmation(o, u));
  for (const to of (process.env.ORDER_NOTIFY_EMAILS || process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)) sendSafe(mails.adminNewOrder(o, u, to));
}

app.post('/api/orders', (req, res) => {
  const u = need(req, res); if (!u) return;
  try {
    const o = buildOrder(req.body, u);
    if (o.pay === 'paypal') throw new ShopError('Për PayPal përdor butonin e PayPal.');
    o.no = newOrderNo();
    tx(() => {
      db.prepare('INSERT INTO orders (no, user_id, status, pay, data, total, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(o.no, u.id, 'new', o.pay, JSON.stringify(o), o.total, Date.now(), Date.now());
      takeStock(o.items);
      saveAddress(u, o, req.body);
    })();
    notify(o, u);
    res.json({ order: orderOut(db.prepare('SELECT * FROM orders WHERE no = ?').get(o.no)) });
  } catch (e) { res.status(e.status || 500).json({ error: e instanceof ShopError ? e.message : 'Porosia nuk u ruajt. Provo përsëri.' }); if (!(e instanceof ShopError)) console.error(e); }
});

app.get('/api/orders', (req, res) => {
  const u = need(req, res); if (!u) return;
  res.json({ orders: db.prepare("SELECT * FROM orders WHERE user_id = ? AND status != 'pending_payment' ORDER BY created DESC").all(u.id).map(orderOut) });
});

/* PayPal: 1) krijohet porosia "në pritje të pagesës" dhe porosia te PayPal; 2) pas miratimit merret pagesa */
app.post('/api/paypal/create', wrap(async (req, res) => {
  const u = need(req, res); if (!u) return;
  if (!paypalEnabled()) return res.status(503).json({ error: 'Pagesa me PayPal nuk është aktive tani.' });
  let o;
  try { o = buildOrder({ ...req.body, pay: 'paypal' }, u); } catch (e) { return res.status(e.status || 400).json({ error: e.message }); }
  o.no = newOrderNo();
  o.saveAddress = !!req.body.saveAddress;
  const paypalId = await createPaypalOrder(o);
  db.prepare('INSERT INTO orders (no, user_id, status, pay, paypal_id, data, total, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(o.no, u.id, 'pending_payment', 'paypal', paypalId, JSON.stringify(o), o.total, Date.now(), Date.now());
  res.json({ paypalId, no: o.no });
}));

app.post('/api/paypal/capture', wrap(async (req, res) => {
  const u = need(req, res); if (!u) return;
  const row = db.prepare('SELECT * FROM orders WHERE paypal_id = ? AND user_id = ?').get(String(req.body.paypalId || ''), u.id);
  if (!row) return res.status(404).json({ error: 'Porosia nuk u gjet.' });
  if (row.status !== 'pending_payment') return res.json({ order: orderOut(row) });
  const paid = await capturePaypalOrder(row.paypal_id);
  if (paid.currency !== 'EUR' || Math.abs(paid.amount - row.total) > 0.009) {
    console.error('[paypal] Shuma nuk përputhet', row.no, paid);
    return res.status(400).json({ error: 'Shuma e paguar nuk përputhet me porosinë. Na kontakto.' });
  }
  const o = JSON.parse(row.data);
  o.captureId = paid.captureId;
  tx(() => {
    db.prepare("UPDATE orders SET status = 'new', data = ?, updated = ? WHERE id = ?").run(JSON.stringify(o), Date.now(), row.id);
    takeStock(o.items);
    if (o.saveAddress) saveAddress(u, o, { saveAddress: true });
  })();
  notify({ ...o, no: row.no }, u);
  res.json({ order: orderOut(db.prepare('SELECT * FROM orders WHERE id = ?').get(row.id)) });
}));

/* ---------- Paneli i administrimit ---------- */
app.get('/api/admin/stats', (req, res) => {
  if (!needAdmin(req, res)) return;
  const day = new Date(); day.setHours(0, 0, 0, 0);
  const q = (sql, ...a) => db.prepare(sql).get(...a);
  res.json({
    today: q("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE created >= ? AND status NOT IN ('cancelled','pending_payment')", day.getTime()),
    all: q("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE status NOT IN ('cancelled','pending_payment')"),
    waiting: q("SELECT COUNT(*) n FROM orders WHERE status = 'new'").n,
    customers: q('SELECT COUNT(*) n FROM users').n,
    subscribers: q('SELECT COUNT(*) n FROM subscribers').n
  });
});

app.get('/api/admin/orders', (req, res) => {
  if (!needAdmin(req, res)) return;
  const st = STATUS[req.query.status] ? req.query.status : null;
  const rows = db.prepare(`SELECT o.*, u.email, u.name AS uname FROM orders o JOIN users u ON u.id = o.user_id ${st ? 'WHERE o.status = ?' : "WHERE o.status != 'pending_payment'"} ORDER BY o.created DESC LIMIT 500`).all(...(st ? [st] : []));
  res.json({ orders: rows.map(r => ({ ...orderOut(r), email: r.email, customer: r.uname })), statuses: STATUS });
});

app.patch('/api/admin/orders/:no', (req, res) => {
  if (!needAdmin(req, res)) return;
  const st = req.body.status;
  if (!STATUS[st] || st === 'pending_payment') return res.status(400).json({ error: 'Status i pavlefshëm.' });
  const row = db.prepare('SELECT o.*, u.email, u.name AS uname FROM orders o JOIN users u ON u.id = o.user_id WHERE o.no = ?').get(req.params.no);
  if (!row) return res.status(404).json({ error: 'Porosia nuk u gjet.' });
  db.prepare('UPDATE orders SET status = ?, updated = ? WHERE id = ?').run(st, Date.now(), row.id);
  const o = orderOut({ ...row, status: st });
  if (req.body.notify !== false && ['confirmed', 'shipped', 'delivered', 'cancelled'].includes(st)) sendSafe(mails.orderStatus(o, { email: row.email, name: row.uname }));
  res.json({ order: o });
});

app.get('/api/admin/products', (req, res) => { if (needAdmin(req, res)) res.json({ products: allProducts(true) }); });

const PRODUCT_FIELDS = ['cat', 'brand', 'name', 'price', 'old', 'stock', 'img', 'imgs', 'tags', 'sizes', 'desc', 'feat', 'specs', 'rating', 'reviews', 'sold', 'includes'];
function productIn(body, prev = {}) {
  const p = { ...prev };
  for (const k of PRODUCT_FIELDS) if (k in body) p[k] = body[k];
  p.name = String(p.name || '').trim().slice(0, 160);
  p.price = Math.round(Number(p.price) * 100) / 100;
  p.old = p.old ? Math.round(Number(p.old) * 100) / 100 : null;
  p.stock = p.stock === '' || p.stock == null ? undefined : Math.max(0, Math.trunc(Number(p.stock)));
  for (const k of ['rating', 'reviews', 'sold']) p[k] = Number(p[k]) || 0;
  p.rating = Math.min(5, p.rating || 0);
  p.tags = Array.isArray(p.tags) ? p.tags.filter(t => ['new', 'best', 'set'].includes(t)) : [];
  p.sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes.map(Number).filter(Boolean) : undefined;
  p.feat = Array.isArray(p.feat) ? p.feat.map(String).filter(Boolean).slice(0, 10) : [];
  p.specs = p.specs && typeof p.specs === 'object' ? p.specs : {};
  p.desc = String(p.desc || '').slice(0, 2000);
  if (!p.name || !(p.price > 0) || !p.cat || !(p.img || p.imgs?.length)) throw new ShopError('Plotëso emrin, kategorinë, çmimin dhe foton.');
  return p;
}
app.post('/api/admin/products', (req, res) => {
  if (!needAdmin(req, res)) return;
  try {
    const p = productIn(req.body);
    const r = db.prepare('INSERT INTO products (data, active, updated) VALUES (?, ?, ?)').run(JSON.stringify(p), req.body.active === false ? 0 : 1, Date.now());
    res.json({ product: productById(Number(r.lastInsertRowid)) });
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});
app.put('/api/admin/products/:id', (req, res) => {
  if (!needAdmin(req, res)) return;
  const prev = productById(Number(req.params.id));
  if (!prev) return res.status(404).json({ error: 'Produkti nuk u gjet.' });
  try {
    const { id, active, ...data } = prev;
    const p = productIn(req.body, data);
    db.prepare('UPDATE products SET data = ?, active = ?, updated = ? WHERE id = ?').run(JSON.stringify(p), 'active' in req.body ? (req.body.active ? 1 : 0) : (active ? 1 : 0), Date.now(), id);
    res.json({ product: productById(id) });
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${{ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype]}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});
app.post('/api/admin/upload', (req, res, next) => { if (needAdmin(req, res)) next(); }, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ngarko një foto JPG, PNG ose WEBP deri në 5 MB.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/admin/customers', (req, res) => {
  if (!needAdmin(req, res)) return;
  res.json({
    customers: db.prepare("SELECT u.email, u.name, u.phone, u.created, COUNT(o.id) AS orders, COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled','pending_payment') THEN o.total END),0) AS spent FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id ORDER BY u.created DESC").all(),
    subscribers: db.prepare('SELECT email, created FROM subscribers ORDER BY created DESC').all()
  });
});

/* ---------- Gabimet ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Nuk u gjet.' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.paypal ? 'PayPal nuk u përgjigj si duhet. Provo përsëri.' : 'Ndodhi një gabim në server. Provo përsëri.' });
});

app.listen(PORT, () => console.log(`unblej po punon në http://localhost:${PORT}  (PayPal: ${paypalEnabled() ? process.env.PAYPAL_ENV || 'sandbox' : 'jo aktiv'}, email: ${process.env.RESEND_API_KEY ? 'Resend' : 'data/outbox'})`));
