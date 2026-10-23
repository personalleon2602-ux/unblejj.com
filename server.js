/* Serveri i unblej: faqja, API-ja për llogaritë, porositë, PayPal dhe paneli i administrimit */
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { q, one, tx } from './lib/db.js';
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
const need = async (req, res) => { const u = await currentUser(req); if (!u) { res.status(401).json({ error: 'Kyçu për të vazhduar.' }); return null; } return u; };
const needAdmin = async (req, res) => { const u = await currentUser(req); if (!u || !isAdmin(u)) { res.status(403).json({ error: 'Vetëm për administratorët.' }); return null; } return u; };
const ip = req => req.ip || 'x';
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160;
const phoneOk = p => String(p || '').replace(/\D/g, '').length >= 8;
const userById = id => one('SELECT * FROM users WHERE id = $1', [id]);
const userByEmail = email => one('SELECT * FROM users WHERE email = $1', [email]);
/* PayPal: "server" kur ka Client ID + Secret (verifikim te PayPal); "client" kur ka vetëm Client ID */
const paypalMode = () => (process.env.PAYPAL_CLIENT_ID ? (paypalEnabled() ? 'server' : 'client') : null);
const config = () => ({ paypalClientId: process.env.PAYPAL_CLIENT_ID || null, paypalMode: paypalMode(), currency: 'EUR' });
const fail = (res, e) => {
  if (e instanceof ShopError) return res.status(e.status).json({ error: e.message });
  console.error(e);
  res.status(500).json({ error: 'Ndodhi një gabim në server. Provo përsëri.' });
};

/* ---------- Faqja ---------- */
const indexHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const sendIndex = wrap(async (req, res) => {
  const [catalog, user] = await Promise.all([allProducts(), currentUser(req)]);
  const boot = `<script nonce="${res.locals.nonce}">window.__CATALOG__=${json(catalog)};window.__ME__=${json(publicUser(user))};window.__CONFIG__=${json({ ...config(), nonce: res.locals.nonce })};</script>`;
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(indexHtml.replace('<!--BOOT-->', boot));
});
app.get('/', sendIndex);
app.get('/index.html', sendIndex);
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC, 'admin.html')));
app.get('/healthz', (req, res) => res.json({ ok: true }));
/* Fotot e ngarkuara nga paneli ruhen në bazën e të dhënave */
app.get('/uploads/:name', wrap(async (req, res) => {
  const img = await one('SELECT mime, data FROM images WHERE name = $1', [req.params.name]);
  if (!img) return res.status(404).end();
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  res.type(img.mime).send(Buffer.from(img.data));
}));
/* Kodi i faqes rikontrollohet çdo herë (që përditësimet të dalin menjëherë); fotot ruhen një ditë */
app.use(express.static(PUBLIC, {
  index: false,
  setHeaders: (res, file) => res.setHeader('Cache-Control', /\.(js|css|html)$/.test(file) ? 'no-cache' : 'public, max-age=86400')
}));

/* ---------- Llogaritë ---------- */
app.get('/api/config', (req, res) => res.json(config()));
app.get('/api/me', wrap(async (req, res) => res.json({ user: publicUser(await currentUser(req)) })));

app.post('/api/auth/register', wrap(async (req, res) => {
  if (limited(`reg:${ip(req)}`, 10, 36e5)) return res.status(429).json({ error: 'Shumë përpjekje. Provo përsëri pas pak.' });
  const email = String(req.body.email || '').trim().toLowerCase(), name = String(req.body.name || '').trim().slice(0, 120);
  const phone = String(req.body.phone || '').trim().slice(0, 40), pw = String(req.body.password || '');
  if (!name || !emailOk(email) || !phoneOk(phone)) return res.status(400).json({ error: 'Plotëso emrin, një email të saktë dhe numrin e telefonit.' });
  if (pw.length < 6 || pw.length > 200) return res.status(400).json({ error: 'Fjalëkalimi duhet të ketë të paktën 6 shenja.' });
  if (await userByEmail(email)) return res.status(409).json({ error: 'Ky email ka tashmë llogari. Kyçu me fjalëkalimin tënd.' });
  const u = await one('INSERT INTO users (email, name, phone, pass, created) VALUES ($1, $2, $3, $4, $5) RETURNING *', [email, name, phone, await hashPassword(pw), Date.now()]);
  await startSession(res, u.id);
  sendSafe(mails.welcome(u));
  res.json({ user: publicUser(u) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(), pw = String(req.body.password || '');
  if (limited(`login:${ip(req)}`, 20, 9e5) || limited(`login:${email}`, 8, 9e5)) return res.status(429).json({ error: 'Shumë përpjekje. Provo përsëri pas 15 minutash ose rivendos fjalëkalimin.' });
  const u = await userByEmail(email);
  if (!u || !(await verifyPassword(pw, u.pass))) return res.status(401).json({ error: 'Email-i ose fjalëkalimi nuk është i saktë.' });
  await startSession(res, u.id);
  res.json({ user: publicUser(u) });
}));

app.post('/api/auth/logout', wrap(async (req, res) => { await endSession(req, res); res.json({ ok: true }); }));

/* Fjalëkalimi i harruar: përgjigjja është gjithmonë e njëjtë, që të mos zbulohet nëse email-i ekziston */
app.post('/api/auth/forgot', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailOk(email)) return res.status(400).json({ error: 'Shkruaj një adresë email të saktë.' });
  if (limited(`forgot:${email}`, 3, 9e5) || limited(`forgot:${ip(req)}`, 10, 36e5)) return res.status(429).json({ error: 'Ke kërkuar shumë kode. Provo përsëri pas 15 minutash.' });
  const u = await userByEmail(email);
  if (u) {
    const code = randomCode();
    await q(`INSERT INTO resets (user_id, code, expires, tries) VALUES ($1, $2, $3, 0)
             ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code, expires = EXCLUDED.expires, tries = 0`, [u.id, sha256(`${u.id}:${code}`), Date.now() + 9e5]);
    sendSafe(mails.resetCode(u, code));
  }
  res.json({ ok: true });
}));

app.post('/api/auth/reset', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(), code = String(req.body.code || '').replace(/\D/g, ''), pw = String(req.body.password || '');
  if (pw.length < 6 || pw.length > 200) return res.status(400).json({ error: 'Fjalëkalimi i ri duhet të ketë të paktën 6 shenja.' });
  const u = await userByEmail(email);
  const r = u && await one('SELECT * FROM resets WHERE user_id = $1', [u.id]);
  if (!r || r.expires < Date.now()) return res.status(400).json({ error: 'Kodi ka skaduar ose nuk është i vlefshëm. Kërko një kod të ri.' });
  if (r.code !== sha256(`${u.id}:${code}`)) {
    const tries = r.tries + 1;
    if (tries >= 5) { await q('DELETE FROM resets WHERE user_id = $1', [u.id]); return res.status(400).json({ error: 'Shumë përpjekje të gabuara. Kërko një kod të ri.', restart: true }); }
    await q('UPDATE resets SET tries = $1 WHERE user_id = $2', [tries, u.id]);
    return res.status(400).json({ error: `Kodi nuk është i saktë. Të kanë mbetur ${5 - tries} përpjekje.` });
  }
  await q('UPDATE users SET pass = $1 WHERE id = $2', [await hashPassword(pw), u.id]);
  await q('DELETE FROM resets WHERE user_id = $1', [u.id]);
  await endAllSessions(u.id);
  await startSession(res, u.id);
  res.json({ user: publicUser(u) });
}));

app.post('/api/auth/password', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  if (!(await verifyPassword(String(req.body.current || ''), u.pass))) return res.status(400).json({ error: 'Fjalëkalimi aktual nuk është i saktë.' });
  const pw = String(req.body.password || '');
  if (pw.length < 6 || pw.length > 200) return res.status(400).json({ error: 'Fjalëkalimi i ri duhet të ketë të paktën 6 shenja.' });
  await q('UPDATE users SET pass = $1 WHERE id = $2', [await hashPassword(pw), u.id]);
  await endAllSessions(u.id);
  await startSession(res, u.id);
  res.json({ ok: true });
}));

app.put('/api/me', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  const name = String(req.body.name || '').trim().slice(0, 120), phone = String(req.body.phone || '').trim().slice(0, 40);
  if (!name || !phoneOk(phone)) return res.status(400).json({ error: 'Shkruaj emrin dhe një numër telefoni të saktë.' });
  const a = req.body.address || {};
  const address = { country: ['ks', 'al', 'mk'].includes(a.country) ? a.country : 'ks', city: String(a.city || '').slice(0, 80), street: String(a.street || '').slice(0, 200) };
  const nu = await one('UPDATE users SET name = $1, phone = $2, address = $3 WHERE id = $4 RETURNING *', [name, phone, JSON.stringify(address), u.id]);
  res.json({ user: publicUser(nu) });
}));

/* ---------- Produktet, kuponët, abonimi ---------- */
app.get('/api/products', wrap(async (req, res) => res.json({ products: await allProducts() })));

app.post('/api/coupon', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  try { const c = await couponFor(req.body.code, u.id); res.json({ code: c, pct: COUPONS[c] }); } catch (e) { fail(res, e); }
}));

app.post('/api/newsletter', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailOk(email)) return res.status(400).json({ error: 'Shkruaj një adresë email të saktë.' });
  if (limited(`news:${ip(req)}`, 10, 36e5)) return res.status(429).json({ error: 'Provo përsëri pas pak.' });
  await q('INSERT INTO subscribers (email, created) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING', [email, Date.now()]);
  res.json({ ok: true });
}));

/* ---------- Porositë ---------- */
const saveAddress = (run, u, o) => run('UPDATE users SET phone = $1, address = $2 WHERE id = $3', [o.phone, JSON.stringify({ country: o.country, city: o.city, street: o.street }), u.id]);
function notify(o, u) {
  sendSafe(mails.orderConfirmation(o, u));
  for (const to of (process.env.ORDER_NOTIFY_EMAILS || process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)) sendSafe(mails.adminNewOrder(o, u, to));
}
const orderRow = no => one('SELECT * FROM orders WHERE no = $1', [no]);

app.post('/api/orders', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  try {
    const o = await buildOrder(req.body, u);
    if (o.pay === 'paypal') throw new ShopError('Për PayPal përdor butonin e PayPal.');
    o.no = await newOrderNo();
    await tx(async run => {
      await run('INSERT INTO orders (no, user_id, status, pay, data, total, created, updated) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)',
        [o.no, u.id, 'new', o.pay, JSON.stringify(o), o.total, Date.now()]);
      await takeStock(o.items, run);
      if (req.body.saveAddress) await saveAddress(run, u, o);
    });
    notify(o, u);
    res.json({ order: orderOut(await orderRow(o.no)) });
  } catch (e) { fail(res, e); }
}));

app.get('/api/orders', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  res.json({ orders: (await q("SELECT * FROM orders WHERE user_id = $1 AND status != 'pending_payment' ORDER BY created DESC", [u.id])).map(orderOut) });
}));

/* Pas pagesës: porosia kalon nga "në pritje të pagesës" te "e re", ulet stoku dhe dërgohen email-et */
async function acceptPaid(row, u, o, paypalId) {
  await tx(async run => {
    await run("UPDATE orders SET status = 'new', paypal_id = COALESCE($1, paypal_id), data = $2, updated = $3 WHERE id = $4", [paypalId || null, JSON.stringify(o), Date.now(), row.id]);
    await takeStock(o.items, run);
    if (o.saveAddress) await saveAddress(run, u, o);
  });
  notify({ ...o, no: row.no }, u);
  return orderOut(await orderRow(row.no));
}

/* PayPal me Client ID + Secret: krijimi dhe marrja e pagesës bëhen nga serveri */
app.post('/api/paypal/create', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  if (!paypalEnabled()) return res.status(503).json({ error: 'Pagesa me PayPal nuk është aktive tani.' });
  let o;
  try { o = await buildOrder({ ...req.body, pay: 'paypal' }, u); } catch (e) { return fail(res, e); }
  o.no = await newOrderNo();
  o.saveAddress = !!req.body.saveAddress;
  const paypalId = await createPaypalOrder(o);
  await q('INSERT INTO orders (no, user_id, status, pay, paypal_id, data, total, created, updated) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)',
    [o.no, u.id, 'pending_payment', 'paypal', paypalId, JSON.stringify(o), o.total, Date.now()]);
  res.json({ paypalId, no: o.no });
}));

app.post('/api/paypal/capture', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  const row = await one('SELECT * FROM orders WHERE paypal_id = $1 AND user_id = $2', [String(req.body.paypalId || ''), u.id]);
  if (!row) return res.status(404).json({ error: 'Porosia nuk u gjet.' });
  if (row.status !== 'pending_payment') return res.json({ order: orderOut(row) });
  const paid = await capturePaypalOrder(row.paypal_id);
  if (paid.currency !== 'EUR' || Math.abs(paid.amount - row.total) > 0.009) {
    console.error('[paypal] Shuma nuk përputhet', row.no, paid);
    return res.status(400).json({ error: 'Shuma e paguar nuk përputhet me porosinë. Na kontakto.' });
  }
  const o = JSON.parse(row.data);
  o.captureId = paid.captureId;
  res.json({ order: await acceptPaid(row, u, o) });
}));

/* PayPal vetëm me Client ID: serveri llogarit shumën nga çmimet e produkteve dhe e ruan porosinë "në pritje të pagesës";
   shfletuesi e kalon atë shumë te PayPal; pas pagesës serveri pranon vetëm shumën e saktë në EUR. */
app.post('/api/paypal/prepare', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  if (paypalMode() !== 'client') return res.status(503).json({ error: 'Pagesa me PayPal nuk është aktive tani.' });
  let o;
  try { o = await buildOrder({ ...req.body, pay: 'paypal' }, u); } catch (e) { return fail(res, e); }
  o.no = await newOrderNo();
  o.saveAddress = !!req.body.saveAddress;
  await q('INSERT INTO orders (no, user_id, status, pay, data, total, created, updated) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)',
    [o.no, u.id, 'pending_payment', 'paypal', JSON.stringify(o), o.total, Date.now()]);
  res.json({ no: o.no, total: o.total, sub: o.sub, ship: o.ship, disc: o.disc, items: o.items.map(l => ({ name: l.name, q: l.q, price: l.price, size: l.size })) });
}));

app.post('/api/paypal/confirm', wrap(async (req, res) => {
  const u = await need(req, res); if (!u) return;
  const row = await one('SELECT * FROM orders WHERE no = $1 AND user_id = $2', [String(req.body.no || ''), u.id]);
  if (!row) return res.status(404).json({ error: 'Porosia nuk u gjet.' });
  if (row.status !== 'pending_payment') return res.json({ order: orderOut(row) });
  const amount = Number(req.body.amount);
  if (req.body.status !== 'COMPLETED' || req.body.currency !== 'EUR' || !(Math.abs(amount - row.total) < 0.01)) {
    console.error('[paypal] Pagesa nuk përputhet', row.no, req.body);
    return res.status(400).json({ error: 'Shuma e paguar nuk përputhet me porosinë. Na kontakto me numrin e porosisë ' + row.no + '.' });
  }
  const o = JSON.parse(row.data);
  o.captureId = String(req.body.captureId || '').slice(0, 64);
  o.paypalOrderId = String(req.body.paypalOrderId || '').slice(0, 64);
  o.verify = true;
  res.json({ order: await acceptPaid(row, u, o, o.paypalOrderId) });
}));

/* ---------- Paneli i administrimit ---------- */
app.get('/api/admin/stats', wrap(async (req, res) => {
  if (!await needAdmin(req, res)) return;
  const day = new Date(); day.setHours(0, 0, 0, 0);
  const sums = "COUNT(*)::int AS n, COALESCE(SUM(total), 0)::float8 AS s";
  const [today, all, waiting, customers, subscribers] = await Promise.all([
    one(`SELECT ${sums} FROM orders WHERE created >= $1 AND status NOT IN ('cancelled','pending_payment')`, [day.getTime()]),
    one(`SELECT ${sums} FROM orders WHERE status NOT IN ('cancelled','pending_payment')`),
    one("SELECT COUNT(*)::int AS n FROM orders WHERE status = 'new'"),
    one('SELECT COUNT(*)::int AS n FROM users'),
    one('SELECT COUNT(*)::int AS n FROM subscribers')
  ]);
  res.json({ today, all, waiting: waiting.n, customers: customers.n, subscribers: subscribers.n });
}));

app.get('/api/admin/orders', wrap(async (req, res) => {
  if (!await needAdmin(req, res)) return;
  const st = STATUS[req.query.status] ? req.query.status : null;
  const rows = await q(`SELECT o.*, u.email, u.name AS uname FROM orders o JOIN users u ON u.id = o.user_id
    ${st ? 'WHERE o.status = $1' : "WHERE o.status != 'pending_payment'"} ORDER BY o.created DESC LIMIT 500`, st ? [st] : []);
  res.json({ orders: rows.map(r => ({ ...orderOut(r), email: r.email, customer: r.uname })), statuses: STATUS });
}));

app.patch('/api/admin/orders/:no', wrap(async (req, res) => {
  if (!await needAdmin(req, res)) return;
  const st = req.body.status;
  if (!STATUS[st] || st === 'pending_payment') return res.status(400).json({ error: 'Status i pavlefshëm.' });
  const row = await one('SELECT o.*, u.email, u.name AS uname FROM orders o JOIN users u ON u.id = o.user_id WHERE o.no = $1', [req.params.no]);
  if (!row) return res.status(404).json({ error: 'Porosia nuk u gjet.' });
  await q('UPDATE orders SET status = $1, updated = $2 WHERE id = $3', [st, Date.now(), row.id]);
  const o = orderOut({ ...row, status: st });
  if (req.body.notify !== false && ['confirmed', 'shipped', 'delivered', 'cancelled'].includes(st)) sendSafe(mails.orderStatus(o, { email: row.email, name: row.uname }));
  res.json({ order: o });
}));

app.get('/api/admin/products', wrap(async (req, res) => { if (await needAdmin(req, res)) res.json({ products: await allProducts(true) }); }));

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
app.post('/api/admin/products', wrap(async (req, res) => {
  if (!await needAdmin(req, res)) return;
  try {
    const p = productIn(req.body);
    const r = await one('INSERT INTO products (data, active, updated) VALUES ($1, $2, $3) RETURNING id', [JSON.stringify(p), req.body.active !== false, Date.now()]);
    res.json({ product: await productById(r.id) });
  } catch (e) { fail(res, e); }
}));
app.put('/api/admin/products/:id', wrap(async (req, res) => {
  if (!await needAdmin(req, res)) return;
  const prev = await productById(Number(req.params.id) || 0);
  if (!prev) return res.status(404).json({ error: 'Produkti nuk u gjet.' });
  try {
    const { id, active, ...data } = prev;
    const p = productIn(req.body, data);
    await q('UPDATE products SET data = $1, active = $2, updated = $3 WHERE id = $4', [JSON.stringify(p), 'active' in req.body ? !!req.body.active : active, Date.now(), id]);
    res.json({ product: await productById(id) });
  } catch (e) { fail(res, e); }
}));

const MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, !!MIME[file.mimetype])
});
app.post('/api/admin/upload', wrap(async (req, res, next) => { if (await needAdmin(req, res)) next(); }), upload.single('image'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ngarko një foto JPG, PNG ose WEBP deri në 5 MB.' });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${MIME[req.file.mimetype]}`;
  await q('INSERT INTO images (name, mime, data, created) VALUES ($1, $2, $3, $4)', [name, req.file.mimetype, req.file.buffer, Date.now()]);
  res.json({ url: `/uploads/${name}` });
}));

app.get('/api/admin/customers', wrap(async (req, res) => {
  if (!await needAdmin(req, res)) return;
  const [customers, subscribers] = await Promise.all([
    q(`SELECT u.email, u.name, u.phone, u.created, COUNT(o.id)::int AS orders,
         COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled','pending_payment') THEN o.total END), 0)::float8 AS spent
       FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id ORDER BY u.created DESC`),
    q('SELECT email, created FROM subscribers ORDER BY created DESC')
  ]);
  res.json({ customers, subscribers });
}));

/* ---------- Gabimet ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Nuk u gjet.' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.paypal ? 'PayPal nuk u përgjigj si duhet. Provo përsëri.' : 'Ndodhi një gabim në server. Provo përsëri.' });
});

app.listen(PORT, () => console.log(`unblej po punon në http://localhost:${PORT}  (baza: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'PGlite lokal'}, PayPal: ${paypalMode() ? `${paypalMode()}, ${process.env.PAYPAL_ENV || 'sandbox'}` : 'jo aktiv'}, email: ${process.env.RESEND_API_KEY ? 'Resend' : 'data/outbox'})`));
