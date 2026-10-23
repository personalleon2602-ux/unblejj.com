/* Rregullat e dyqanit: çmimet, dërgesa, kuponët dhe llogaritja e porosisë (gjithmonë në server) */
import { q, one } from './db.js';

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

const toProduct = r => ({ ...JSON.parse(r.data), id: r.id, active: !!r.active });
export const allProducts = async (all = false) =>
  (await q(`SELECT id, data, active FROM products ${all ? '' : 'WHERE active'} ORDER BY id`)).map(toProduct);
export const productById = async (id, run = q) => { const r = (await run('SELECT id, data, active FROM products WHERE id = $1', [id]))[0]; return r ? toProduct(r) : null; };

export class ShopError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

export async function couponFor(code, userId) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  if (!COUPONS[c]) throw new ShopError('Ky kod zbritjeje nuk është i vlefshëm.');
  if (c === 'MIRESEVINI' && await one("SELECT 1 FROM orders WHERE user_id = $1 AND status NOT IN ('cancelled','pending_payment') LIMIT 1", [userId]))
    throw new ShopError('Kodi MIRESEVINI vlen vetëm për porosinë e parë.');
  return c;
}

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/* Kontrollon shportën dhe të dhënat e dërgesës; kthen porosinë me çmimet nga baza e të dhënave */
export async function buildOrder(body, user) {
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!items.length) throw new ShopError('Shporta është bosh.');
  const lines = [], products = new Map();
  for (const it of items) {
    const p = await productById(Number(it.id) || 0);
    if (!p || !p.active) throw new ShopError('Një produkt në shportë nuk shitet më. Hiqe dhe provo përsëri.');
    products.set(p.id, p);
    const qn = Math.trunc(Number(it.q));
    if (!(qn >= 1 && qn <= 10)) throw new ShopError('Sasia duhet të jetë nga 1 deri në 10.');
    const size = it.size == null ? null : Number(it.size);
    if (p.sizes?.length && !p.sizes.includes(size)) throw new ShopError(`Zgjidh masën për “${p.name}”.`);
    const same = lines.find(l => l.id === p.id && l.size === size);
    if (same) same.q += qn; else lines.push({ id: p.id, name: p.name, q: qn, size: p.sizes?.length ? size : null, price: p.price, img: p.img || p.imgs?.[0] });
  }
  for (const [id, p] of products) {
    const want = lines.filter(x => x.id === id).reduce((s, x) => s + x.q, 0);
    if (typeof p.stock === 'number' && p.stock < want)
      throw new ShopError(p.stock > 0 ? `Nga “${p.name}” kanë mbetur vetëm ${p.stock} copë.` : `“${p.name}” nuk ka më stok.`);
  }
  const country = COUNTRIES[body.country] ? body.country : null;
  const o = {
    name: clean(body.name, 120), phone: clean(body.phone, 40), city: clean(body.city, 80), street: clean(body.street, 200), note: clean(body.note, 500), country,
    ship_method: body.ship === 'exp' ? 'exp' : 'std', pay: PAY[body.pay] ? body.pay : 'cod'
  };
  if (!o.name || o.phone.replace(/\D/g, '').length < 8 || !o.city || !o.street || !country) throw new ShopError('Plotëso emrin, telefonin, qytetin dhe adresën.');
  const coupon = await couponFor(body.coupon, user.id);
  const subC = lines.reduce((s, l) => s + cents(l.price) * l.q, 0);
  const discC = coupon ? Math.round(subC * COUPONS[coupon]) : 0;
  const shipC = o.ship_method === 'exp' ? cents(SHIP.exp) : subC >= cents(FREE_FROM) ? 0 : cents(SHIP.std);
  return { ...o, items: lines, coupon, sub: subC / 100, disc: discC / 100, ship: shipC / 100, total: (subC - discC + shipC) / 100, eta: eta(country), payLabel: PAY[o.pay] };
}

export async function newOrderNo() {
  for (;;) { const no = 'UB-' + String(Math.floor(100000 + Math.random() * 900000)); if (!await one('SELECT 1 FROM orders WHERE no = $1', [no])) return no; }
}

/* Ul stokun kur porosia pranohet (brenda të njëjtit transaksion) */
export async function takeStock(items, run) {
  for (const l of items) {
    const p = await productById(l.id, run);
    if (p && typeof p.stock === 'number') {
      const { id, active, ...data } = p;
      data.stock = Math.max(0, p.stock - l.q);
      await run('UPDATE products SET data = $1, updated = $2 WHERE id = $3', [JSON.stringify(data), Date.now(), id]);
    }
  }
}

export function orderOut(row) {
  const d = JSON.parse(row.data);
  return { ...d, no: row.no, status: row.status, statusLabel: STATUS[row.status], pay: row.pay, payLabel: PAY[row.pay], total: Number(row.total), date: Number(row.created) };
}
