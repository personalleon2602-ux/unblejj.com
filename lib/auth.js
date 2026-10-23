/* Fjalëkalimet (scrypt), seancat me cookie httpOnly dhe kufizimi i përpjekjeve */
import crypto from 'node:crypto';
import { q, one } from './db.js';

const COOKIE = 'ub_sid';
const SESSION_DAYS = 30;

const scrypt = (pw, salt) => new Promise((res, rej) =>
  crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scrypt(pw, salt)).toString('base64')}`;
}
export async function verifyPassword(pw, stored) {
  const [, s, h] = String(stored).split('$');
  if (!s || !h) return false;
  const k = await scrypt(pw, Buffer.from(s, 'base64')), hb = Buffer.from(h, 'base64');
  return hb.length === k.length && crypto.timingSafeEqual(hb, k);
}
export const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
export const randomCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

const adminEmails = () => (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
export const isAdmin = u => !!u && (u.role === 'admin' || adminEmails().includes(u.email));

export function publicUser(u) {
  if (!u) return null;
  return { email: u.email, name: u.name, phone: u.phone, address: u.address ? JSON.parse(u.address) : null, created: u.created, admin: isAdmin(u) };
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const secure = () => process.env.NODE_ENV === 'production';

export async function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await q('INSERT INTO sessions (token, user_id, expires) VALUES ($1, $2, $3)', [sha256(token), userId, Date.now() + SESSION_DAYS * 864e5]);
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure() ? '; Secure' : ''}`);
}
export async function endSession(req, res) {
  const t = cookies(req)[COOKIE];
  if (t) await q('DELETE FROM sessions WHERE token = $1', [sha256(t)]);
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure() ? '; Secure' : ''}`);
}
export const endAllSessions = userId => q('DELETE FROM sessions WHERE user_id = $1', [userId]);

export async function currentUser(req) {
  if ('_user' in req) return req._user;
  const t = cookies(req)[COOKIE];
  req._user = t ? await one('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires > $2', [sha256(t), Date.now()]) : null;
  return req._user;
}

/* Kufizim i thjeshtë në memorie: max përpjekje për çelës brenda një dritareje kohe */
const hits = new Map();
export function limited(key, max, windowMs) {
  const now = Date.now(), h = (hits.get(key) || []).filter(t => now - t < windowMs);
  h.push(now); hits.set(key, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k);
  return h.length > max;
}
