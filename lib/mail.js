/* Dërgimi i email-eve me Resend. Pa RESEND_API_KEY, email-et ruhen në data/outbox (për testim lokal). */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './db.js';
import { eur, STATUS, COUNTRIES } from './shop.js';

const site = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function sendMail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const dir = path.join(DATA_DIR, 'outbox');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${String(to).replace(/[^a-z0-9@.]/gi, '_')}.html`);
    fs.writeFileSync(file, `<!-- Për: ${to} | Tema: ${subject} -->\n${html}`);
    console.log(`[email] Pa RESEND_API_KEY: "${subject}" për ${to} u ruajt te ${file}`);
    return { dev: true };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'unblej <no-reply@unblej.com>', to: [to], subject, html, text })
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

/* Mbështjellësi i përbashkët i email-eve */
function layout(title, body) {
  return `<!doctype html><html lang="sq"><body style="margin:0;background:#f5f4f2;font-family:Segoe UI,Arial,sans-serif;color:#17151a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f2;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#0b0a0c;padding:20px 28px;border-bottom:3px solid #ff7a0d"><img src="${site()}/assets/logo-dark.png" alt="unblej" height="40" style="display:block;height:40px"></td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:18px 28px;background:#faf8f6;color:#6c6670;font-size:12px;line-height:1.5">
      unblej · Dyqani online ku gjen gjithçka në një vend<br>Ke pyetje? Na shkruaj në ${esc(process.env.SUPPORT_EMAIL || 'info@unblej.com')}
    </td></tr>
  </table></td></tr></table></body></html>`;
}
const p = s => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3a363d">${s}</p>`;
const button = (href, label) => `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;background:#ff7a0d;color:#1a0c00;font-weight:700;text-decoration:none;padding:13px 22px;border-radius:10px">${esc(label)}</a></p>`;

function itemsTable(o) {
  const rows = o.items.map(l => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px">${esc(l.name)}${l.size ? ` · Masa ${l.size}` : ''}<br><span style="color:#6c6670">${l.q} × ${eur(l.price)}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;font-weight:600">${eur(l.price * l.q)}</td></tr>`).join('');
  const line = (l, v, b) => `<tr><td style="padding:5px 0;font-size:14px;color:#6c6670">${l}</td><td align="right" style="padding:5px 0;font-size:${b ? 17 : 14}px;font-weight:${b ? 800 : 600}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px">${rows}
    ${line('Nëntotali', eur(o.sub))}${o.disc ? line(`Zbritja (${esc(o.coupon)})`, '−' + eur(o.disc)) : ''}${line('Dërgesa', o.ship ? eur(o.ship) : 'Falas')}${line('Totali', eur(o.total), true)}</table>`;
}
const addr = o => `${esc(o.name)}<br>${esc(o.street)}, ${esc(o.city)}, ${COUNTRIES[o.country]?.name || ''}<br>${esc(o.phone)}`;

export const mails = {
  resetCode: (u, code) => ({
    to: u.email,
    subject: `${code} është kodi yt për fjalëkalimin e ri në unblej`,
    text: `Përshëndetje ${u.name}, kodi yt është ${code}. Skadon pas 15 minutash. Nëse nuk e ke kërkuar ti, mos e merr parasysh këtë email.`,
    html: layout('Kodi për fjalëkalimin e ri', p(`Përshëndetje ${esc(u.name)}, përdor këtë kod për të vendosur një fjalëkalim të ri në unblej:`)
      + `<div style="font-size:34px;font-weight:800;letter-spacing:8px;text-align:center;background:#fff1e4;color:#c24e00;border-radius:12px;padding:16px;margin:8px 0 18px">${code}</div>`
      + p('Kodi skadon pas 15 minutash. Nëse nuk e ke kërkuar ti, mos e merr parasysh këtë email: fjalëkalimi yt mbetet i njëjtë.'))
  }),
  welcome: u => ({
    to: u.email,
    subject: 'Mirë se erdhe në unblej',
    text: `Përshëndetje ${u.name}, llogaria jote në unblej u krijua. Në porosinë e parë përdor kodin MIRESEVINI për 10% zbritje.`,
    html: layout(`Mirë se erdhe, ${u.name.split(' ')[0]}!`, p('Llogaria jote në unblej u krijua. Tani mund të porositësh, ta ruash adresën dhe t’i ndjekësh porositë nga çdo pajisje.')
      + p('Në porosinë e parë përdor kodin <b>MIRESEVINI</b> për −10%.') + button(site(), 'Fillo blerjen'))
  }),
  orderConfirmation: (o, u) => ({
    to: u.email,
    subject: `Porosia ${o.no} u pranua`,
    text: `Faleminderit ${u.name}! Porosia ${o.no} u pranua. Totali: ${eur(o.total)}. Arrin rreth: ${o.eta}.`,
    html: layout(`Faleminderit, ${o.name.split(' ')[0]}! Porosia u pranua.`,
      p(`Numri i porosisë: <b>${o.no}</b>. ${o.pay === 'paypal' ? 'Pagesa me PayPal u krye.' : 'Do të të telefonojmë për ta konfirmuar.'}`)
      + itemsTable(o)
      + p(`<b>Dërgesa:</b><br>${addr(o)}`) + p(`<b>Pagesa:</b> ${esc(o.payLabel)}<br><b>Arrin rreth:</b> ${esc(o.eta)}`)
      + button(`${site()}/#llogaria`, 'Shiko porositë e mia'))
  }),
  orderStatus: (o, u) => ({
    to: u.email,
    subject: `Porosia ${o.no}: ${STATUS[o.status]}`,
    text: `Porosia ${o.no} tani është: ${STATUS[o.status]}.`,
    html: layout(`Porosia ${o.no}: ${STATUS[o.status]}`,
      p({ confirmed: 'Porosia jote u konfirmua dhe po përgatitet.', shipped: 'Porosia jote u nis dhe është te korrieri. Korrieri të telefonon para se të vijë.', delivered: 'Porosia jote u dorëzua. Faleminderit që bleve në unblej!', cancelled: 'Porosia jote u anulua. Nëse ke pyetje, na shkruaj.' }[o.status] || '')
      + itemsTable(o) + button(`${site()}/#llogaria`, 'Shiko porositë e mia'))
  }),
  adminNewOrder: (o, u, to) => ({
    to,
    subject: `Porosi e re ${o.no} · ${eur(o.total)} · ${o.payLabel}`,
    text: `Porosi e re ${o.no} nga ${u.name} (${u.email}, ${o.phone}). Totali ${eur(o.total)}.`,
    html: layout(`Porosi e re ${o.no}`, p(`Nga <b>${esc(u.name)}</b> · ${esc(u.email)}`) + itemsTable(o) + p(`<b>Dërgesa:</b><br>${addr(o)}`)
      + p(`<b>Pagesa:</b> ${esc(o.payLabel)}${o.note ? `<br><b>Shënim:</b> ${esc(o.note)}` : ''}`) + button(`${site()}/admin`, 'Hap panelin'))
  })
};

/* Dërgon pa e bllokuar përgjigjen; gabimet shkruhen në log */
export function sendSafe(m) { sendMail(m).catch(e => console.error('[email] Dështoi:', e.message)); }
