/* Rregullat e dyqanit: çmimet, dërgesa, kuponët dhe llogaritja e porosisë (gjithmonë në server) */
import { db } from './db.js';

export const FREE_FROM = 30, SHIP = { std: 2, exp: 4 }, COUPONS = { MIRESEVINI: 0.10 };
export const COUNTRIES = { ks: { name: 'Kosovë', days: 1 }, al: { name: 'Shqipëri', days: 3 }, mk: { name: 'Maqedoni e Veriut', days: 3 } };
export const PAY = { cod: 'Pagesë në dorëzim', bank: 'Transfer bankar', paypal: 'PayPal' };
export const STATUS = {
  pending_payment: 'Në pritje të pagesës',
  new: 'Në pritje të konfirmimit',
  confirmed: 'E konfirmuar',
  shipped: 'U nis',
  delivered: 'U dorëzua',
  cancelled: 'U anulua'
};
const DAYS = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'];
const MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];

export const eur = v => { const [i, d] = (Math.round(v * 100) / 100).toFixed(2).split('.'); return i.replace(/\B(?=(\d{3})+$)/g, '.') + ',' + d + ' €'; };
const cents = v => Math.round(v * 100);

export function eta(country = 'ks') {
  const d = new Date(); let n = COUNTRIES[country].days + (d.getHours() >= 15 ? 1 : 0);
  while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) n--; }
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const allProducts = (all = false) =>
  db.prepare(`SELECT id, data, active FROM products ${all ? '' : 'WHERE active = 1'} ORDER BY id`).all()
    .map(r => ({ ...JSON.parse(r.data), id: r.id, active: !!r.active }));
export const productById = id => { const r = db.prepare('SELECT id, data, active FROM products WHERE id = ?').get(id); return r ? { ...JSON.parse(r.data), id: r.id, active: !!r.active } : null; };

export class ShopError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

export function couponFor(code, userId) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  if (!COUPONS[c]) throw new ShopError('Ky kod zbritjeje nuk është i vlefshëm.');
  if (c === 'MIRESEVINI' && db.prepare("SELECT 1 FROM orders WHERE user_id = ? AND status NOT IN ('cancelled','pending_payment') LIMIT 1").get(userId))
    throw new ShopError('Kodi MIRESEVINI vlen vetëm për porosinë e parë.');
  return c;
}

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/* Kontrollon shportën dhe të dhënat e dërgesës; kthen porosinë me çmimet nga baza e të dhënave */
export function buildOrder(body, user) {
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!items.length) throw new ShopError('Shporta është bosh.');
  const lines = [];
  for (const it of items) {
    const p = productById(Number(it.id));
    if (!p || !p.active) throw new ShopError('Një produkt në shportë nuk shitet më. Hiqe dhe provo përsëri.');
    const q = Math.trunc(Number(it.q));
    if (!(q >= 1 && q <= 10)) throw new ShopError('Sasia duhet të jetë nga 1 deri në 10.');
    const size = it.size == null ? null : Number(it.size);
    if (p.sizes?.length && !p.sizes.includes(size)) throw new ShopError(`Zgjidh masën për “${p.name}”.`);
    const same = lines.find(l => l.id === p.id && l.size === size);
    if (same) same.q += q; else lines.push({ id: p.id, name: p.name, q, size: p.sizes?.length ? size : null, price: p.price, img: p.img || p.imgs?.[0] });
  }
  for (const l of lines) {
    const p = productById(l.id);
    if (typeof p.stock === 'number' && p.stock < lines.filter(x => x.id === l.id).reduce((s, x) => s + x.q, 0))
      throw new ShopError(p.stock > 0 ? `Nga “${p.name}” kanë mbetur vetëm ${p.stock} copë.` : `“${p.name}” nuk ka më stok.`);
  }
  const country = COUNTRIES[body.country] ? body.country : null;
  const o = {
    name: clean(body.name, 120), phone: clean(body.phone, 40), city: clean(body.city, 80), street: clean(body.street, 200), note: clean(body.note, 500), country,
    ship_method: body.ship === 'exp' ? 'exp' : 'std', pay: PAY[body.pay] ? body.pay : 'cod'
  };
  if (!o.name || o.phone.replace(/\D/g, '').length < 8 || !o.city || !o.street || !country) throw new ShopError('Plotëso emrin, telefonin, qytetin dhe adresën.');
  const coupon = couponFor(body.coupon, user.id);
  const subC = lines.reduce((s, l) => s + cents(l.price) * l.q, 0);
  const discC = coupon ? Math.round(subC * COUPONS[coupon]) : 0;
  const shipC = o.ship_method === 'exp' ? cents(SHIP.exp) : subC >= cents(FREE_FROM) ? 0 : cents(SHIP.std);
  return { ...o, items: lines, coupon, sub: subC / 100, disc: discC / 100, ship: shipC / 100, total: (subC - discC + shipC) / 100, eta: eta(country), payLabel: PAY[o.pay] };
}

export const newOrderNo = () => {
  for (;;) { const no = 'UB-' + String(Math.floor(100000 + Math.random() * 900000)); if (!db.prepare('SELECT 1 FROM orders WHERE no = ?').get(no)) return no; }
};

/* Ul stokun kur porosia konfirmohet ose paguhet */
export function takeStock(items) {
  for (const l of items) {
    const p = productById(l.id);
    if (p && typeof p.stock === 'number') {
      p.stock = Math.max(0, p.stock - l.q);
      const { id, active, ...data } = p;
      db.prepare('UPDATE products SET data = ?, updated = ? WHERE id = ?').run(JSON.stringify(data), Date.now(), id);
    }
  }
}

export function orderOut(row) {
  const d = JSON.parse(row.data);
  return { ...d, no: row.no, status: row.status, statusLabel: STATUS[row.status], pay: row.pay, payLabel: PAY[row.pay], total: row.total, date: row.created };
}
