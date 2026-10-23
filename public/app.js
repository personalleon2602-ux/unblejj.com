(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const eur = v => { const [i, d] = (Math.round(v * 100) / 100).toFixed(2).split('.'); return i.replace(/\B(?=(\d{3})+$)/g, '.') + ',' + d + ' €'; };
const dec1 = n => n.toFixed(1).replace('.', ',');
const kfmt = n => n >= 1000 ? dec1(n / 1000).replace(',0', '') + 'k' : String(n);
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
/* Animacionet janë gjithmonë të ndezura, edhe kur pajisja kërkon më pak lëvizje */
const reduced = false;
document.documentElement.classList.add('motion');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

const FREE = 30, PER = 12, SHIP = { std: 2, exp: 4 }, COUPONS = { MIRESEVINI: 0.10 };
const DAYS = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'];
const MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
const COUNTRIES = { ks: { name: 'Kosovë', days: 1 }, al: { name: 'Shqipëri', days: 3 }, mk: { name: 'Maqedoni e Veriut', days: 3 } };

const CATS = [
  { id: 'elektro', name: 'Elektro Shtëpiake', short: 'Elektro', ic: 'bolt' },
  { id: 'audio', name: 'Televizor & Audio', short: 'Televizor', ic: 'tv' },
  { id: 'it', name: 'IT & Kompjuterë', short: 'IT', ic: 'cpu' },
  { id: 'telefon', name: 'Telefona & Ora', short: 'Telefon', ic: 'mobile' },
  { id: 'mobilje', name: 'Mobilje', short: 'Mobilje', ic: 'sofa' },
  { id: 'veshje', name: 'Veshje', short: 'Veshje', ic: 'shirt' },
  { id: 'kepuce', name: 'Këpucë', short: 'Këpucë', ic: 'shoe' },
  { id: 'femije', name: 'Fëmijë & Lodra', short: 'Fëmijë', ic: 'stroller' },
  { id: 'shtepiak', name: 'Artikuj Shtëpiak', short: 'Shtëpiak', ic: 'home' },
  { id: 'vegla', name: 'Vegla Pune', short: 'Vegla', ic: 'tools' },
  { id: 'kopsht', name: 'Kopsht', short: 'Kopsht', ic: 'leaf' },
  { id: 'sport', name: 'Sport & Fitnes', short: 'Sport', ic: 'dumbbell' },
  { id: 'kozmetike', name: 'Kozmetikë', short: 'Kozmetikë', ic: 'lipstick' },
  { id: 'market', name: 'Market', short: 'Market', ic: 'basket' }
];
const SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
/* Gjatësia e këmbës sipas masës EU (masa = 1,5 × (këmba + 1,5 cm)) */
const FOOT_CM = { 36: '22,5', 37: '23,2', 38: '23,8', 39: '24,5', 40: '25,2', 41: '25,8', 42: '26,5', 43: '27,2', 44: '27,8', 45: '28,5', 46: '29,2' };

/* Katalogu vjen nga serveri (shtohet dhe ndryshohet te paneli i administrimit) */
const P = window.__CATALOG__ || [];
const byId = id => P.find(p => p.id === id);
P.forEach(p => { if (p.includes && !p.old) p.old = Math.round(p.includes.reduce((s, id) => s + byId(id).price, 0) * 100) / 100; });

const cat = id => CATS.find(c => c.id === id);
const has = (p, t) => p.tags.includes(t);
const off = p => p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
const countCat = id => P.filter(p => p.cat === id).length;
const bgOf = f => /^(p-|\/)/.test(f) ? 'w' : 'd';
const src = f => (f.startsWith('/') ? f : `assets/${f}`);
const PMAX = Math.ceil(Math.max(...P.map(p => p.price)) / 50) * 50;
const soldTxt = n => n >= 1000 ? `${Math.floor(n / 1000)}k+ të shitura` : n >= 100 ? `${Math.floor(n / 100) * 100}+ të shitura` : `${Math.max(10, Math.floor(n / 10) * 10)}+ të shitura`;
const SORTS = [['pop', 'Më të njohurat'], ['new', 'Më të rejat'], ['price-asc', 'Çmimi: nga më i ulëti'], ['price-desc', 'Çmimi: nga më i larti'], ['off', 'Zbritja më e madhe'], ['rating', 'Vlerësimi më i lartë']];
const INFO = { 'rreth-nesh': 'Rreth nesh', 'dergesa': 'Dërgesa dhe kthimi', 'pyetje': 'Pyetje të shpeshta', 'kontakt': 'Kontakt', 'kushtet': 'Kushtet e blerjes', 'privatesia': 'Privatësia' };
const CONTACT = { phone: '+383 44 000 000', email: 'info@unblej.com', city: 'Prishtinë, Kosovë' };
/* Produktet që rrotullohen në karuselin 3D të kryefaqes */
const HERO = [[2, 'Kufje Wireless Pro'], [10, 'Laptop Pro 15"'], [5, 'Smartphone Ultra X'], [8, 'Smartwatch Series 8'], [4, 'Kufje AirSound'], [13, 'Çajnik Premium'], [3, 'Earbuds 5.3 Pro'], [6, 'Ultra X Pro']];
const TICK = ['Zbritje deri −70%', 'Dërgesë falas mbi 30 €', 'Pagesë në dorëzim', 'Kthim brenda 14 ditëve', 'Artikujt e RI çdo ditë', 'Oferta Sete'];

let cart = store.get('ub-cart', []).filter(l => l && byId(l.id));
let wish = store.get('ub-wish', []).filter(id => byId(id));
let seen = store.get('ub-seen', []).filter(id => byId(id));
/* Përdoruesi i kyçur dhe cilësimet vijnë nga serveri */
let ME = window.__ME__ || null;
const CONFIG = window.__CONFIG__ || {};
let afterLogin = null;
const me = () => ME;
const firstName = u => (u?.name || '').trim().split(/\s+/)[0] || 'mik';
const initials = u => (u.name || u.email).trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const fmtDate = ts => { const d = new Date(ts); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
async function api(path, body, method) {
  const r = await fetch('/api' + path, {
    method: method || (body ? 'POST' : 'GET'), credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined
  });
  let data = {}; try { data = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(data.error || 'Nuk u lidh dot me serverin. Provo përsëri.'), { status: r.status, data });
  return data;
}
let coupon = null, LAST = null, PD = null, QV = null, current = 'home', lastFocus = null, ringDragged = false;
const CLEAN = [], QCLEAN = [], VIEWERS = new WeakMap();
const F = {};
function resetF() { Object.assign(F, { cats: new Set(), brands: new Set(), min: 0, max: PMAX, rating: 0, sale: false, isNew: false, set: false, free: false, q: '', sort: 'pop', page: 1 }); }
resetF();

/* ---------- Pjesë të përbashkëta ---------- */
function tile(p, tag = 'a', cls = '', alt = '') {
  const list = p.imgs || [p.img];
  const attrs = tag === 'a' ? ` href="#produkt-${p.id}" aria-label="${esc(p.name)}" tabindex="-1"` : '';
  if (list.length > 1) return `<${tag} class="tile multi n${list.length} ${cls}"${attrs}>${list.map(f => `<span class="m ${bgOf(f)}"><img src="${src(f)}" alt="" loading="lazy" draggable="false"></span>`).join('')}</${tag}>`;
  return `<${tag} class="tile ${bgOf(list[0])} ${cls}"${attrs}><img src="${src(list[0])}" alt="${esc(alt)}" loading="lazy" draggable="false"></${tag}>`;
}
const stars = r => `<span class="stars" style="--r:${r}" role="img" aria-label="Vlerësimi ${dec1(r)} nga 5"></span>`;
const badges = p => { const d = off(p); return `<div class="badges">${d ? `<span class="bdg off">−${d}%</span>` : ''}${has(p, 'new') ? '<span class="bdg new">E RE</span>' : ''}${has(p, 'set') ? '<span class="bdg set">SET</span>' : ''}</div>`; };
const wishBtn = p => `<button class="wish" type="button" data-wish="${p.id}" aria-pressed="${wish.includes(p.id)}" aria-label="Ruaje te favoritet">${icon('heart')}</button>`;

function card(p, o = {}) {
  return `<article class="card${o.rv ? ' rv' : ''}">
    ${tile(p)}${badges(p)}${wishBtn(p)}
    <button class="qvb" type="button" data-qv="${p.id}" aria-label="Shiko shpejt: ${esc(p.name)}">${icon('eye')}</button>
    <div class="card-b">
      <span class="card-cat">${cat(p.cat).short}</span>
      <h3 class="card-t"><a href="#produkt-${p.id}">${esc(p.name)}</a></h3>
      <div class="rating">${stars(p.rating)}<span>${dec1(p.rating)} (${kfmt(p.reviews)})</span><span class="sold">${soldTxt(p.sold)}</span></div>
      ${o.deal && p.stock ? `<div class="stock"><span><i style="width:${Math.max(12, 100 - p.stock * 5)}%"></i></span><small>Mbeten vetëm <b>${p.stock}</b> copë</small></div>` : ''}
      <span class="free ${p.price >= FREE ? '' : 'no'}">${icon('truck')} Dorëzim falas</span>
      <div class="card-f">
        <div class="price"><b>${eur(p.price)}</b>${p.old ? `<s>${eur(p.old)}</s>` : '<s>&nbsp;</s>'}</div>
        <button class="add" type="button" data-add="${p.id}" aria-label="Shto në shportë: ${esc(p.name)}">${icon('cart')}</button>
      </div>
    </div>
  </article>`;
}
const shelfNav = id => `<div class="snav"><button type="button" data-scroll="${id}:-1" aria-label="Majtas">${icon('chev-l')}</button><button type="button" data-scroll="${id}:1" aria-label="Djathtas">${icon('chev-r')}</button></div>`;
function shelf(id, title, list, more, o = {}) {
  return `<section class="sec wrap" aria-labelledby="${id}-h">
    <div class="sec-h"><div><h2 id="${id}-h">${o.ic ? icon(o.ic) : ''}${title}</h2>${o.sub || ''}</div>
      <div class="sec-tools">${shelfNav(id)}${more ? `<a class="more" href="#${more}">Shiko të gjitha ${icon('arrow')}</a>` : ''}</div></div>
    <div class="shelf rv" id="${id}">${list.map(p => card(p, o)).join('')}</div>
  </section>`;
}
const empty = (ic, title, text, href, label, extra = '') => `<div class="empty"><span class="em-ic">${icon(ic)}</span><h2>${title}</h2><p>${text}</p>${href ? `<a class="btn btn-primary" href="#${href}">${label}</a>` : ''}${extra}</div>`;
const crumbs = (...items) => `<nav class="crumbs" aria-label="Ku ndodhesh"><a href="#ballina">Ballina</a>${items.map(([t, h]) => icon('chev-r') + (h ? `<a href="#${h}">${t}</a>` : `<span>${t}</span>`)).join('')}</nav>`;

function eta(country = 'ks') {
  const d = new Date(); let n = COUNTRIES[country].days + (d.getHours() >= 15 ? 1 : 0);
  while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) n--; }
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function cutoff() {
  const d = new Date(); if (d.getHours() >= 15) return 'Porosit sot dhe';
  const m = 15 * 60 - (d.getHours() * 60 + d.getMinutes());
  return `Porosit brenda ${Math.floor(m / 60)} orë e ${m % 60} min dhe`;
}

/* ---------- Kryefaqja ---------- */
function homeView() {
  const deals = P.filter(p => p.stock).sort((a, b) => off(b) - off(a));
  const best = P.filter(p => has(p, 'best')).sort((a, b) => b.sold - a.sold);
  const fresh = P.filter(p => has(p, 'new'));
  const sets = P.filter(p => has(p, 'set'));
  const TOP = [['audio', 'd-headphones.webp'], ['telefon', 'd-phone.webp'], ['it', 'd-laptop.webp'], ['elektro', 'p-kettle-steel.webp'], ['kepuce', 'p-sneakers.webp'], ['sport', 'd-watch.webp']];
  const ring = HERO.map(([id, short], i) => {
    const p = byId(id), d = off(p);
    return `<a class="r-item" href="#produkt-${id}" style="--i:${i}" aria-label="${esc(p.name)}, ${eur(p.price)}" draggable="false">
      <span class="r-front"><img src="${src(p.img)}" alt="" draggable="false">${d ? `<span class="r-off">−${d}%</span>` : ''}<span class="r-cap"><b>${esc(short)}</b><em>${eur(p.price)}</em></span></span>
      <span class="r-back"><img src="assets/icon-orange.png" alt="" draggable="false"></span></a>`;
  }).join('');
  const tk = TICK.map(t => `<span>${t}</span><i>✦</i>`).join('');
  const seenList = seen.map(byId).filter(Boolean);
  return `
  <section class="hero">
    <canvas class="embers" id="embers" aria-hidden="true"></canvas>
    <div class="wrap hero-in">
      <div class="hero-copy">
        <span class="tag-sale">${icon('percent')} Zbritje −70%</span>
        <h1>${['Artikujt', 'me', '<em>zbritje</em>', 'deri', '<b class="pct" data-to="70">−70%</b>'].map((w, i) => `<span class="w" style="--d:${i}">${w}</span>`).join(' ')}</h1>
        <p>Shfrytëzo zbritjet më të mëdha në elektronikë dhe pajisje shtëpiake. Paguan kur e merr porosinë, dhe dërgesa është falas mbi 30 €.</p>
        <div class="hero-cta">
          <a class="btn btn-primary btn-lg btn-shine" href="#zbritje" data-magnet>Shiko zbritjet ${icon('arrow')}</a>
          <a class="btn btn-ghost btn-lg" href="#dyqani" data-magnet>Të gjitha produktet</a>
        </div>
        <div class="hero-cards">
          <a class="hcard" href="#te-reja"><span class="hc-ic">${icon('spark')}</span><span><b>Artikujt e RI</b><small>Të sapo ardhur · ${plural(fresh.length, 'produkt', 'produkte')}</small></span>${icon('chev-r', 'hc-go')}</a>
          <a class="hcard" href="#sete"><span class="hc-ic">${icon('gift')}</span><span><b>Oferta Sete</b><small>Paketat më të mira · ${plural(sets.length, 'set', 'sete')}</small></span>${icon('chev-r', 'hc-go')}</a>
        </div>
      </div>
      <div class="hero-3d">
        <div class="stage3d" id="stage3d" role="region" aria-label="Produkte në ofertë, karusel 3D">
          <div class="ring" id="ring" style="--step:${360 / HERO.length}deg"><div class="orbit" aria-hidden="true"></div>${ring}</div>
        </div>
      </div>
    </div>
  </section>
  <section class="trust" aria-label="Pse unblej"><div class="wrap trust-in">
    ${[['truck', 'Dërgesë falas', 'Për porositë mbi 30 €'], ['cash', 'Pagesë në dorëzim', 'Paguan kur e merr pakon'], ['return', 'Kthim brenda 14 ditëve', 'Pa pyetje të tepërta'], ['shield', 'Garanci zyrtare', 'Deri në 24 muaj']]
      .map(([i, t, s], k) => `<div class="tr" style="--i:${k}"><span class="tr-ic">${icon(i)}</span><span><b>${t}</b><small>${s}</small></span></div>`).join('')}
  </div></section>
  <div class="tk-wrap" aria-hidden="true"><div class="ticker"><div class="tk-track"><div class="tk-set">${tk}</div><div class="tk-set">${tk}</div></div></div></div>
  ${shelf('s-deals', 'Oferta e ditës', deals, 'zbritje', { ic: 'clock', deal: true, sub: `<span class="cd">Mbaron për <b data-cd>--:--:--</b></span>` })}
  <section class="sec wrap" aria-labelledby="tc-h">
    <div class="sec-h"><h2 id="tc-h">Bli sipas kategorisë</h2><a class="more" href="#dyqani">Të gjitha kategoritë ${icon('arrow')}</a></div>
    <div class="topcats">${TOP.map(([id, img]) => { const c = cat(id); return `<a class="topcat rv" href="#kategori-${id}"><span class="tile ${bgOf(img)}"><img src="assets/${img}" alt="" loading="lazy" draggable="false"></span><span class="tc-t"><span><b>${c.name}</b><small>${plural(countCat(id), 'produkt', 'produkte')}</small></span>${icon('chev-r')}</span></a>`; }).join('')}</div>
  </section>
  ${shelf('s-best', 'Më të shiturat', best, 'dyqani')}
  ${shelf('s-new', 'Artikujt e RI', fresh, 'te-reja', { ic: 'spark', sub: '<p class="sec-sub">Produkte të reja çdo ditë. Zbulo më të fundit në teknologji.</p>' })}
  ${shelf('s-sets', 'Oferta Sete', sets, 'sete', { ic: 'gift', sub: '<p class="sec-sub">Paketat e kombinuara për kursim maksimal.</p>' })}
  ${seenList.length >= 2 ? shelf('s-seen', 'Të shikuara së fundmi', seenList, null, { ic: 'eye' }) : ''}
  <section class="wrap" aria-labelledby="news-h">
    <div class="news rv">
      <span class="nf" aria-hidden="true">${icon('cart', 'nf1')}${icon('gift', 'nf2')}${icon('tag', 'nf3')}${icon('heart', 'nf4')}</span>
      <div><h2 id="news-h">Merr ofertat para të tjerëve</h2><p>Abonohu dhe merr çdo javë zbritjet më të mira. Në porosinë e parë përdor kodin <b>MIRESEVINI</b> për −10%.</p></div>
      <form class="news-form" id="news-form" novalidate><label for="news-email" class="sr">Email-i yt</label><input id="news-email" type="email" required placeholder="Email-i yt" autocomplete="email"><button class="btn" type="submit" data-magnet>Abonohu</button></form>
    </div>
  </section>`;
}

/* ---------- Karuseli 3D ---------- */
function initRing() {
  const stage = $('#stage3d'); if (!stage) return;
  const ring = $('#ring'), items = $$('.r-item', ring), step = 360 / items.length;
  let ry = reduced ? 0 : -150, vel = reduced ? 0 : 230, auto = 12, drag = null, active = true, raf = 0, last = performance.now(), focusT = null;
  const paint = () => {
    ring.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    items.forEach((it, i) => { const a = (i * step + ry) * Math.PI / 180; it.style.setProperty('--f', ((Math.cos(a) + 1) / 2).toFixed(3)); });
  };
  const frame = now => {
    raf = 0;
    if (!active || !stage.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (focusT !== null) { ry += (focusT - ry) * Math.min(1, dt * 8); vel = 0; if (Math.abs(focusT - ry) < 0.05) focusT = null; }
    else if (!drag) { vel += ((reduced ? 0 : auto) - vel) * Math.min(1, dt * 1.2); ry += vel * dt; }
    paint();
    if (!reduced || drag || focusT !== null || Math.abs(vel) > 0.5) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && active) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const io = new IntersectionObserver(([e]) => { active = e.isIntersecting; kick(); });
  io.observe(stage);
  CLEAN.push(() => { io.disconnect(); cancelAnimationFrame(raf); });
  stage.addEventListener('pointerdown', e => { if (e.button) return; drag = { x: e.clientX, ry, moved: false, lx: e.clientX, lt: performance.now() }; focusT = null; });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; stage.setPointerCapture(e.pointerId); stage.classList.add('grabbing'); }
    if (!drag.moved) return;
    const now = performance.now();
    vel = (e.clientX - drag.lx) * 0.4 / Math.max(0.008, (now - drag.lt) / 1000);
    drag.lx = e.clientX; drag.lt = now; ry = drag.ry + dx * 0.4; kick();
  });
  const end = () => {
    if (drag?.moved) { ringDragged = true; setTimeout(() => { ringDragged = false; }, 80); }
    drag = null; stage.classList.remove('grabbing'); vel = clamp(vel, -600, 600); kick();
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') auto = 4; });
  stage.addEventListener('pointerleave', () => { auto = 12; });
  ring.addEventListener('focusin', e => {
    const it = e.target.closest('.r-item'); if (!it) return;
    let t = -items.indexOf(it) * step; t += Math.round((ry - t) / 360) * 360; focusT = t; kick();
  });
  paint(); kick();
}

/* ---------- Grimcat e zjarrta në hero ---------- */
function initEmbers() {
  const c = $('#embers'); if (!c) return;
  const ctx = c.getContext('2d'); if (!ctx) return;
  let w = 0, h = 0, parts = [], active = true, raf = 0, last = performance.now();
  const make = init => ({ x: Math.random() * w, y: init ? Math.random() * h : h + 8, r: Math.random() * 1.6 + 0.5, vy: -(Math.random() * 22 + 10), vx: (Math.random() - 0.5) * 10, a: Math.random() * 0.55 + 0.25, ph: Math.random() * 6.28 });
  const draw = dt => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const t = performance.now() / 1000;
    for (const p of parts) {
      p.x += (p.vx + Math.sin(t * 1.3 + p.ph) * 6) * dt; p.y += p.vy * dt;
      if (p.y < -10 || p.x < -10 || p.x > w + 10) Object.assign(p, make(false));
      const fade = Math.max(0, Math.min(1, (h - p.y) / 120) * Math.min(1, p.y / 90 + 0.15));
      const al = p.a * fade * (0.75 + Math.sin(t * 3 + p.ph) * 0.25);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      g.addColorStop(0, `rgba(255,196,120,${al})`); g.addColorStop(0.3, `rgba(255,122,20,${al * 0.6})`); g.addColorStop(1, 'rgba(255,90,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 6.283); ctx.fill();
    }
  };
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = c.clientWidth; h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = Math.round(w / 16);
    while (parts.length < want) parts.push(make(true));
    parts.length = want; draw(0);
  };
  const frame = now => { raf = 0; if (!active || !c.isConnected) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; draw(dt); raf = requestAnimationFrame(frame); };
  const ro = new ResizeObserver(size); ro.observe(c);
  const io = new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active && !reduced && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } });
  io.observe(c);
  CLEAN.push(() => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf); });
}

/* ---------- Shikuesi 3D i produktit ---------- */
const viewerHTML = (p, withWish) => `<div class="viewer" data-id="${p.id}">
  ${withWish ? wishBtn(p) : ''}
  <div class="v-stage"><div class="v-obj">
    ${Array.from({ length: 6 }, (_, i) => `<i class="v-edge" style="--z:${i}"></i>`).join('')}
    <div class="v-back">${tile(p, 'div')}</div>
    <div class="v-face">${tile(p, 'div', '', p.name)}${badges(p)}</div>
  </div></div>
  <div class="v-floor"></div>
  <div class="v-ctl"><button class="v-btn" type="button" data-v="zoom">${icon('zoom')} Zmadho</button></div>
</div>`;
function initViewer(root, list) {
  if (!root) return;
  const obj = root.querySelector('.v-obj'), floor = root.querySelector('.v-floor'), t0 = performance.now();
  let cx = 0, cy = 0, tx = 0, ty = 0, drag = null, spin = null, active = true, raf = 0;
  const frame = now => {
    raf = 0;
    if (!active || !root.isConnected) return;
    const t = (now - t0) / 1000;
    const ix = reduced ? 0 : Math.sin(t * 0.7) * 3, iy = reduced ? 0 : Math.sin(t * 0.45) * 10, fl = reduced ? 0 : Math.sin(t * 1.3) * 7;
    if (!drag) { tx *= 0.92; ty *= 0.92; }
    const ax = ix + tx; let ay = iy + ty;
    if (spin) {
      const k = Math.min(1, (now - spin) / 1700);
      ay += 360 * (1 - Math.pow(1 - k, 3));
      if (k >= 1) { spin = null; ay -= 360; cy -= 360; }
    }
    cx += (ax - cx) * 0.16; cy += (ay - cy) * 0.16;
    obj.style.setProperty('--vx', cx.toFixed(2) + 'deg');
    obj.style.setProperty('--vy', cy.toFixed(2) + 'deg');
    obj.style.setProperty('--vf', (-fl).toFixed(2) + 'px');
    floor.style.setProperty('--fs', (1 - fl / 50).toFixed(3));
    floor.style.setProperty('--fo', (0.85 - fl / 40).toFixed(3));
    raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && active) raf = requestAnimationFrame(frame); };
  const io = new IntersectionObserver(([e]) => { active = e.isIntersecting; kick(); });
  io.observe(root);
  list.push(() => { io.disconnect(); cancelAnimationFrame(raf); });
  root.addEventListener('pointerdown', e => {
    if (e.button || e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY, tx, ty };
    root.setPointerCapture(e.pointerId); root.classList.add('grab');
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    tx = clamp(drag.tx - (e.clientY - drag.y) * 0.35, -28, 28);
    ty = clamp(drag.ty + (e.clientX - drag.x) * 0.45, -60, 60);
  });
  const end = () => { drag = null; root.classList.remove('grab'); };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  VIEWERS.set(root, { spin() { spin = performance.now(); kick(); } });
  kick();
}

/* ---------- Dyqani ---------- */
function shopTitle() {
  if (F.q) return `Rezultatet për “${esc(F.q)}”`;
  if (F.cats.size === 1) { const c = cat([...F.cats][0]); if (c) return c.name; }
  if (F.sale) return 'Artikujt me zbritje';
  if (F.isNew) return 'Artikujt e RI';
  if (F.set) return 'Oferta Sete';
  return 'Gjithçka për shitje';
}
const chk = (k, label, n, on, val = '') => `<label class="chk"><input type="checkbox" data-f="${k}" ${val ? `value="${esc(val)}"` : ''} ${on ? 'checked' : ''}><span>${label}</span><em>${n}</em></label>`;
function sidebar() {
  const brands = [...new Set(P.map(p => p.brand))].sort((a, b) => a.localeCompare(b));
  const rad = (v, l) => `<label class="chk"><input type="radio" name="f-rating" data-f="rating" value="${v}" ${F.rating === v ? 'checked' : ''}><span>${l}</span><em></em></label>`;
  return `<aside class="filters" id="filters" aria-label="Filtrat">
    <div class="f-h"><h2>${icon('filter')} Filtrat</h2><button class="link" type="button" data-clear>Pastro</button><button class="x f-x" type="button" data-close aria-label="Mbyll filtrat">${icon('close')}</button></div>
    <div class="fg"><fieldset><legend>Ofertat</legend>
      ${chk('sale', 'Artikujt me ZBRITJE', P.filter(p => p.old).length, F.sale)}
      ${chk('isNew', 'Artikujt e RI', P.filter(p => has(p, 'new')).length, F.isNew)}
      ${chk('set', 'Oferta Sete', P.filter(p => has(p, 'set')).length, F.set)}
    </fieldset></div>
    <div class="fg"><fieldset><legend>Kategoritë</legend>
      ${CATS.filter(c => countCat(c.id) || F.cats.has(c.id)).map(c => chk('cat', c.name, countCat(c.id), F.cats.has(c.id), c.id)).join('')}
    </fieldset></div>
    <div class="fg"><fieldset><legend>Çmimi</legend>
      <input type="range" id="f-max-r" data-f="maxr" min="0" max="${PMAX}" step="10" value="${F.max}" aria-label="Çmimi maksimal">
      <div class="price-in"><label for="f-min">Min (€)<input type="number" id="f-min" data-f="min" min="0" max="${PMAX}" value="${F.min}" inputmode="numeric"></label><label for="f-max">Max (€)<input type="number" id="f-max" data-f="max" min="0" max="${PMAX}" value="${F.max}" inputmode="numeric"></label></div>
    </fieldset></div>
    <div class="fg"><fieldset><legend>Vlerësimi</legend>${rad(0, 'Të gjitha')}${rad(4.5, '4,5 ★ e lart')}${rad(4, '4 ★ e lart')}</fieldset></div>
    <div class="fg"><fieldset><legend>Marka</legend>${brands.map(b => chk('brand', b, P.filter(p => p.brand === b).length, F.brands.has(b), b)).join('')}</fieldset></div>
    <div class="fg"><fieldset><legend>Dorëzimi</legend>${chk('free', 'Dorëzim falas', P.filter(p => p.price >= FREE).length, F.free)}</fieldset></div>
    <button class="btn btn-primary btn-lg btn-block f-apply" type="button" data-close>Shfaq <span id="f-count">0</span> produkte</button>
  </aside>`;
}
function shopView() {
  const t = shopTitle();
  return `<div class="wrap">
    ${crumbs([t])}
    <div class="shop-head"><h1>${t} <span>· <span id="res-count">0</span></span></h1>
      <div class="shop-tools">
        <button class="btn btn-soft f-open" type="button" data-open="filters">${icon('filter')} Filtrat</button>
        <label class="sort" for="sort"><span>Rendit sipas</span><select id="sort" data-f="sort">${SORTS.map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div></div>
    <div class="shop">${sidebar()}<div class="results" id="results"></div></div>
  </div>`;
}
function results() {
  const q = norm(F.q.trim());
  const r = P.filter(p => (!F.cats.size || F.cats.has(p.cat)) && (!F.brands.size || F.brands.has(p.brand)) && p.price >= F.min && p.price <= F.max && p.rating >= F.rating
    && (!F.free || p.price >= FREE) && (!F.sale || p.old) && (!F.isNew || has(p, 'new')) && (!F.set || has(p, 'set'))
    && (!q || norm(`${p.name} ${p.brand} ${cat(p.cat).name}`).includes(q)));
  const by = { pop: (a, b) => b.sold - a.sold, new: (a, b) => (has(b, 'new') - has(a, 'new')) || b.id - a.id, 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, off: (a, b) => off(b) - off(a), rating: (a, b) => (b.rating - a.rating) || (b.reviews - a.reviews) };
  return r.sort(by[F.sort] || by.pop);
}
function chips() {
  const c = [];
  F.cats.forEach(id => c.push([`cat:${id}`, cat(id)?.name || id]));
  F.brands.forEach(b => c.push([`brand:${b}`, b]));
  if (F.sale) c.push(['sale', 'Me zbritje']);
  if (F.isNew) c.push(['isNew', 'Artikujt e RI']);
  if (F.set) c.push(['set', 'Oferta Sete']);
  if (F.free) c.push(['free', 'Dorëzim falas']);
  if (F.rating) c.push(['rating', `${dec1(F.rating)} ★ e lart`]);
  if (F.min > 0 || F.max < PMAX) c.push(['price', `${F.min}–${F.max} €`]);
  if (F.q) c.push(['q', `“${esc(F.q)}”`]);
  return c.map(([k, l]) => `<button class="chip" type="button" data-chip="${esc(k)}" aria-label="Hiq filtrin ${l}">${l}${icon('close')}</button>`).join('');
}
function renderResults() {
  const r = results(), pages = Math.max(1, Math.ceil(r.length / PER));
  F.page = Math.min(Math.max(1, F.page), pages);
  const from = (F.page - 1) * PER, slice = r.slice(from, from + PER);
  $('#res-count').textContent = plural(r.length, 'produkt', 'produkte');
  const fc = $('#f-count'); if (fc) fc.textContent = r.length;
  const ch = chips();
  let body;
  if (!r.length) {
    const only = F.cats.size === 1 && !countCat([...F.cats][0]) ? cat([...F.cats][0]) : null;
    body = only
      ? empty(only.ic, `${only.name}: së shpejti`, 'Produktet e para të kësaj kategorie po përgatiten. Ndërkohë shiko ofertat e tjera.', 'dyqani', 'Shiko të gjitha produktet')
      : empty('search', 'Asnjë produkt nuk përputhet me filtrat', 'Provo të heqësh disa filtra ose kërko me një fjalë tjetër.', null, null, '<button class="btn btn-primary" type="button" data-clear>Pastro filtrat</button>');
  } else {
    body = `<div class="grid">${slice.map(p => card(p, { rv: true })).join('')}</div>`;
    if (pages > 1) body += `<nav class="pager" aria-label="Faqet"><button type="button" data-page="${F.page - 1}" ${F.page === 1 ? 'disabled' : ''} aria-label="Faqja e mëparshme">${icon('chev-l')}</button>${Array.from({ length: pages }, (_, i) => `<button type="button" data-page="${i + 1}" ${i + 1 === F.page ? 'aria-current="page"' : ''}>${i + 1}</button>`).join('')}<button type="button" data-page="${F.page + 1}" ${F.page === pages ? 'disabled' : ''} aria-label="Faqja tjetër">${icon('chev-r')}</button></nav>
      <p class="pager-note">Faqja ${F.page} nga ${pages} · Duke shfaqur ${slice.length} nga ${r.length} produkte</p>`;
  }
  $('#results').innerHTML = (ch ? `<div class="chips">${ch}<button class="link" type="button" data-clear>Pastro të gjitha</button></div>` : '') + body;
}
function rerenderShop() {
  const y = window.scrollY, open = $('#filters')?.classList.contains('open');
  $('#app').innerHTML = shopView(); renderResults();
  if (open) $('#filters').classList.add('open');
  window.scrollTo(0, y);
}
function removeChip(k) {
  const [t, v] = k.split(/:(.*)/s);
  if (t === 'cat') F.cats.delete(v); else if (t === 'brand') F.brands.delete(v);
  else if (t === 'price') { F.min = 0; F.max = PMAX; } else if (t === 'rating') F.rating = 0;
  else if (t === 'q') { F.q = ''; qIn.value = ''; } else F[t] = false;
  F.page = 1; rerenderShop();
}

/* ---------- Faqja e produktit ---------- */
function sizesHTML(p, scope) {
  if (!p.sizes) return '';
  return `<div class="sizes"><span class="lbl" id="size-l-${scope}">Zgjidh masën</span>
    <div class="size-row" role="group" aria-labelledby="size-l-${scope}">${p.sizes.map(s => `<button class="size" type="button" data-size="${s}" aria-pressed="false">${s}</button>`).join('')}</div>
    <details class="sguide"><summary>${icon('tag')} Udhëzuesi i masave</summary>
      <div class="tbl-wrap"><table class="tbl sm"><thead><tr><th>Masa (EU)</th>${p.sizes.map(s => `<th>${s}</th>`).join('')}</tr></thead><tbody><tr><td>Këmba (cm)</td>${p.sizes.map(s => `<td>${FOOT_CM[s]}</td>`).join('')}</tr></tbody></table></div>
      <small>Mate këmbën nga thembra te gishti më i gjatë. Nëse je mes dy masave, zgjidh më të madhen.</small>
    </details></div>`;
}
const priceHTML = p => `<div class="pd-price"><b>${eur(p.price)}</b>${p.old ? `<s>${eur(p.old)}</s><span class="save">Kursen ${eur(p.old - p.price)}</span>` : ''}<small class="vat">Çmimi përfshin TVSH-në</small></div>`;
const buyHTML = () => `<div class="pd-buy">
  <div class="qty" role="group" aria-label="Sasia"><button type="button" data-q="-1" aria-label="Pakëso sasinë">${icon('minus')}</button><output class="q-out" aria-live="polite">1</output><button type="button" data-q="1" aria-label="Rrit sasinë">${icon('plus')}</button></div>
  <button class="btn btn-primary btn-lg" type="button" data-add-sel>${icon('cart')} Shto në shportë</button>
  <button class="btn btn-dark btn-lg" type="button" data-buy>Bli tani</button>
</div>`;
function markSeen(id) { seen = [id, ...seen.filter(x => x !== id)].slice(0, 12); store.set('ub-seen', seen); }
function productView(id) {
  const p = byId(id);
  if (!p) return `<div class="wrap page">${empty('search', 'Produkti nuk u gjet', 'Mund të jetë hequr ose lidhja është e pasaktë.', 'dyqani', 'Shiko produktet')}</div>`;
  PD = { id, q: 1, size: null };
  const prevSeen = seen.filter(x => x !== id).map(byId).filter(Boolean);
  markSeen(id);
  const c = cat(p.cat), inc = p.includes ? p.includes.map(byId) : null;
  const used = new Set([p.id]);
  const rel = [...P.filter(x => x.cat === p.cat), ...(p.includes || []).map(byId), ...P.filter(x => has(x, 'best'))].filter(x => !used.has(x.id) && used.add(x.id)).slice(0, 8);
  const inner = html => html.replace('class="sec wrap"', 'class="sec"');
  return `<div class="wrap">
    ${crumbs([c.name, `kategori-${c.id}`], [esc(p.name)])}
    <div class="pd">
      <div class="pd-media">
        ${viewerHTML(p, true)}
        ${inc ? `<div class="pd-inc"><h3>Paketa përmban</h3>${inc.map(x => `<a class="inc" href="#produkt-${x.id}">${tile(x, 'span')}<span>${esc(x.name)}</span><s>${eur(x.price)}</s></a>`).join('')}</div>` : ''}
      </div>
      <div class="pd-info" data-scope="pd">
        <a class="pd-brand" href="#kategori-${c.id}">${esc(p.brand)} · ${c.name}</a>
        <h1>${esc(p.name)}</h1>
        <div class="rating">${stars(p.rating)}<b>${dec1(p.rating)}</b><span>(${kfmt(p.reviews)} vlerësime)</span><span>· ${soldTxt(p.sold)}</span></div>
        ${priceHTML(p)}
        <p class="pd-desc">${esc(p.desc)}</p>
        ${sizesHTML(p, 'pd')}
        ${p.stock && p.stock < 10 ? `<p class="pd-stock">${icon('clock')} Mbeten vetëm ${p.stock} copë me këtë çmim</p>` : ''}
        ${buyHTML()}
        <div class="eta">${icon('truck')}<div><b>${cutoff()} e merr ${eta()}</b><small>Në Kosovë. Për Shqipërinë dhe Maqedoninë e Veriut 2–4 ditë pune. ${p.price >= FREE ? 'Dërgesa është falas.' : 'Dërgesa 2,00 €, falas mbi 30 €.'}</small></div></div>
        <ul class="perks"><li>${icon('cash')}Pagesë në dorëzim</li><li>${icon('return')}Kthim falas brenda 14 ditëve</li><li>${icon('shield')}Garanci ${esc((p.specs.Garancia || '12 muaj').split(/[ ,]/).slice(0, 2).join(' '))}</li></ul>
        <div class="callbox">${icon('phone')}<div><span>Porosit me telefon ose WhatsApp</span><b>${CONTACT.phone}</b><small>E hënë – e shtunë, 08:00–20:00 · <a href="#kontakt">Pyet për këtë produkt</a></small></div><button class="copy" type="button" data-copy="${CONTACT.phone}">${icon('copy')} Kopjo</button></div>
      </div>
    </div>
    <section class="pd-more">
      <div class="pd-col rv"><h2>Pse ta zgjedhësh</h2><ul class="feat">${p.feat.map(f => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}</ul></div>
      <div class="pd-col rv"><h2>Specifikimet</h2><dl class="specs">${Object.entries(p.specs).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
    </section>
    ${inner(shelf('s-rel', 'Mund të të pëlqejnë', rel, null))}
    ${prevSeen.length ? inner(shelf('s-seen', 'Të shikuara së fundmi', prevSeen, null, { ic: 'eye' })) : ''}
    <div style="height:56px"></div>
  </div>`;
}
const stateOf = root => root?.dataset.scope === 'qv' ? QV : PD;
function addSelected(root, buy, from) {
  const st = stateOf(root); if (!st) return;
  const p = byId(st.id), isQV = root.dataset.scope === 'qv';
  if (p.sizes && !st.size) {
    const s = root.querySelector('.sizes'); s.classList.remove('need'); void s.offsetWidth; s.classList.add('need');
    s.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    toast(`${icon('shoe')}<span>Zgjidh masën para se ta shtosh në shportë.</span>`);
    return;
  }
  const img = (isQV ? $('#qv .v-face img') : $('.pd .v-face img'));
  addToCart(st.id, st.q, st.size, { silent: buy, img, from });
  if (isQV) closeQV();
  if (buy) go('arka');
}

/* ---------- Shiko shpejt dhe zmadhimi ---------- */
function openQV(id) {
  const p = byId(id); if (!p) return;
  QV = { id, q: 1, size: null };
  const c = cat(p.cat);
  $('#qv-in').innerHTML = `<button class="x qv-x" type="button" data-close-qv aria-label="Mbyll">${icon('close')}</button>
    <div class="qv-grid">
      <div class="qv-media">${viewerHTML(p, false)}</div>
      <div class="pd-info qv-info" data-scope="qv">
        <span class="pd-brand">${esc(p.brand)} · ${c.name}</span>
        <h2 class="qv-t" id="qv-title">${esc(p.name)}</h2>
        <div class="rating">${stars(p.rating)}<b>${dec1(p.rating)}</b><span>(${kfmt(p.reviews)} vlerësime)</span></div>
        ${priceHTML(p)}
        <p class="pd-desc">${esc(p.desc)}</p>
        ${sizesHTML(p, 'qv')}
        ${buyHTML()}
        <a class="more" href="#produkt-${p.id}">Shiko të gjitha detajet ${icon('arrow')}</a>
      </div>
    </div>`;
  closePanels();
  $('#qv').showModal(); relock();
  initViewer($('#qv .viewer'), QCLEAN);
}
function closeQV() { if ($('#qv').open) $('#qv').close(); }
function openZoom(id) {
  const p = byId(id); if (!p) return;
  const z = $('#zoom-in'); z.classList.remove('z'); z.innerHTML = tile(p, 'div', '', p.name);
  $('#zoom').showModal(); relock();
}
function relock() { document.documentElement.classList.toggle('lock', $('#qv').open || $('#zoom').open || !!$('.drawer.open, .filters.open')); }

/* ---------- Shporta ---------- */
const subtotal = () => cart.reduce((s, l) => s + byId(l.id).price * l.q, 0);
function bump() {
  $$('[data-count="cart"]').forEach(d => { d.classList.remove('bump'); void d.offsetWidth; d.classList.add('bump'); });
  $$('.act[data-open="cart"] .ic, .bnav [data-open="cart"] .ic').forEach(i => { i.classList.remove('wiggle'); i.getBoundingClientRect(); i.classList.add('wiggle'); });
}
function flyToCart(img) {
  if (reduced || !img) return bump();
  const tgt = $$('.act[data-open="cart"], .bnav [data-open="cart"]').map(el => el.getBoundingClientRect()).find(r => r.width > 0 && r.bottom > 0 && r.top < innerHeight);
  const s = img.getBoundingClientRect();
  if (!tgt || !s.width) return bump();
  const f = img.cloneNode(); f.className = 'fly'; f.removeAttribute('loading'); f.alt = '';
  Object.assign(f.style, { left: s.left + 'px', top: s.top + 'px', width: s.width + 'px', height: s.height + 'px' });
  document.body.append(f);
  const dx = tgt.left + tgt.width / 2 - (s.left + s.width / 2), dy = tgt.top + tgt.height / 2 - (s.top + s.height / 2);
  const a = f.animate([
    { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 140}px) scale(.5) rotate(-10deg)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(.06) rotate(12deg)`, opacity: 0.5 }
  ], { duration: 850, easing: 'cubic-bezier(.4,0,.2,1)' });
  a.onfinish = () => { f.remove(); bump(); };
}
function addToCart(id, q = 1, size = null, o = {}) {
  const p = byId(id); if (!p) return;
  if (p.sizes && !size) { go(`produkt-${id}`); setTimeout(() => toast(`${icon('shoe')}<span>Zgjidh masën para se ta shtosh në shportë.</span>`), 60); return; }
  const l = cart.find(x => x.id === id && x.size === size);
  if (l) l.q = Math.min(10, l.q + q); else cart.push({ id, q, size });
  burst(o.from);
  flyToCart(o.img);
  saveCart();
  if (!o.silent) toast(`${icon('check')}<span><b>U shtua në shportë</b><small>${esc(p.name)}${size ? ` · Masa ${size}` : ''}</small></span><button type="button" data-open="cart">Shiko shportën</button>`);
}
/* Produkte të lira për t'i shtuar shpejt nga shporta */
function xsell() {
  const picks = P.filter(p => !p.sizes && p.price < 60 && !cart.some(l => l.id === p.id)).sort((a, b) => b.sold - a.sold).slice(0, 3);
  if (!picks.length) return '';
  return `<div class="xsell"><h3>Shto edhe këto</h3>${picks.map(p => `<div class="xs">${tile(p, 'span')}<a class="xs-t" href="#produkt-${p.id}">${esc(p.name)}<b>${eur(p.price)}</b></a><button class="add" type="button" data-add="${p.id}" aria-label="Shto në shportë: ${esc(p.name)}">${icon('plus')}</button></div>`).join('')}</div>`;
}
function saveCart() { store.set('ub-cart', cart); renderCart(); }
function renderCart() {
  const n = cart.reduce((s, l) => s + l.q, 0), sub = subtotal();
  $$('[data-count="cart"]').forEach(d => { d.textContent = n; d.hidden = !n; });
  $('#cart-count-h').textContent = n ? `(${n})` : '';
  const left = FREE - sub, ship = $('#cart-ship');
  ship.hidden = !cart.length;
  ship.innerHTML = cart.length ? (left > 0 ? `Shto edhe <b>${eur(left)}</b> dhe dërgesa bëhet <b>falas</b>.` : `${icon('truck')} Dërgesa për këtë porosi është <b>falas</b>.`) + `<div class="bar"><i style="width:${Math.min(100, sub / FREE * 100)}%"></i></div>` : '';
  $('#cart-body').innerHTML = cart.length ? cart.map((l, i) => {
    const p = byId(l.id);
    return `<div class="line">${tile(p)}<div>
      <div class="line-t"><a href="#produkt-${p.id}">${esc(p.name)}</a><small>${l.size ? `Masa ${l.size} · ` : ''}${eur(p.price)} / copë</small></div>
      <div class="line-b"><div class="qty sm" role="group" aria-label="Sasia"><button type="button" data-qty="${i}:-1" aria-label="Pakëso">${icon('minus')}</button><output>${l.q}</output><button type="button" data-qty="${i}:1" aria-label="Rrit">${icon('plus')}</button></div><b class="line-p">${eur(p.price * l.q)}</b></div>
      <button class="rm" type="button" data-rm="${i}">${icon('trash')} Hiqe</button></div></div>`;
  }).join('') + xsell() : empty('cart', 'Shporta është bosh', 'Shiko ofertat e ditës dhe shto produktet që të pëlqejnë.', 'zbritje', 'Shiko zbritjet');
  const foot = $('#cart-foot');
  foot.hidden = !cart.length;
  foot.innerHTML = cart.length ? `<div class="dr-sub"><span>Nëntotali</span><b>${eur(sub)}</b></div>
    <a class="btn btn-primary btn-lg btn-block" href="#arka">Vazhdo te arka ${icon('arrow')}</a>
    <button class="btn btn-soft btn-block" type="button" data-close>Vazhdo blerjen</button>
    <small>${me() ? 'Paguan kur e merr porosinë.' : 'Për të porositur të duhet një llogari falas.'}</small>` : '';
  if (current === 'checkout') { if (cart.length) renderSummary(); else route(); }
}

/* ---------- Favoritet ---------- */
function renderWishN() { $$('[data-count="wish"]').forEach(d => { d.textContent = wish.length; d.hidden = !wish.length; }); }
function toggleWish(id) {
  const i = wish.indexOf(id);
  if (i >= 0) wish.splice(i, 1); else wish.push(id);
  store.set('ub-wish', wish);
  $$(`[data-wish="${id}"]`).forEach(b => b.setAttribute('aria-pressed', wish.includes(id)));
  renderWishN();
  if (current === 'wish') route(true);
  else if (i < 0) toast(`${icon('heart')}<span>U ruajt te favoritet</span><button type="button" data-go="favoritet">Shiko</button>`);
}
function wishView() {
  const items = wish.map(byId).filter(Boolean);
  return `<div class="wrap page">${crumbs(['Favoritet'])}
    <div class="shop-head"><h1>Favoritet <span>· ${plural(items.length, 'produkt', 'produkte')}</span></h1></div>
    ${items.length ? `<div class="grid">${items.map(p => card(p, { rv: true })).join('')}</div>` : empty('heart', 'Ende nuk ke favoritë', 'Shtyp zemrën te çdo produkt dhe do ta gjesh këtu më vonë.', 'dyqani', 'Shfleto produktet')}
  </div>`;
}

/* ---------- Arka ---------- */
function shipCost() {
  const s = $('input[name="ship"]:checked')?.value || 'std';
  return s === 'exp' ? SHIP.exp : (subtotal() >= FREE ? 0 : SHIP.std);
}
const field = (id, label, attrs, err, cls = '', val = '') => `<div class="field ${cls}"><label for="${id}">${label}</label><input id="${id}" ${attrs} value="${esc(val)}"><small class="err">${err}</small></div>`;
const countryOpts = sel => Object.entries(COUNTRIES).map(([k, c]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${c.name}</option>`).join('');
const loginBtns = (next, big = true) => `<div class="hero-cta"><button class="btn btn-primary ${big ? 'btn-lg' : ''}" type="button" data-login="login" data-next="${next}">${icon('user')} Kyçu</button><button class="btn btn-soft ${big ? 'btn-lg' : ''}" type="button" data-login="register" data-next="${next}">Krijo llogari falas</button></div>`;
const PERKS_ACC = `<ul class="co-trust"><li>${icon('check')}Adresa ruhet, nuk e shkruan çdo herë</li><li>${icon('clock')}Të gjitha porositë e tua në një vend</li><li>${icon('return')}Porosit përsëri me një klik</li></ul>`;
function checkoutView() {
  if (!cart.length) return `<div class="wrap page">${crumbs(['Arka'])}${empty('cart', 'Shporta jote është bosh', 'Shto produkte në shportë për të vazhduar me porosinë.', 'dyqani', 'Fillo blerjen')}</div>`;
  const u = me();
  const head = `${crumbs(['Arka'])}
    <h1 class="page-h" style="margin:10px 0 14px">Përfundo porosinë</h1>
    <ol class="steps"><li class="done">Shporta</li><li class="${u ? 'done' : 'on'}">Llogaria</li><li class="${u ? 'on' : ''}">Dërgesa</li><li>Konfirmimi</li></ol>`;
  if (!u) return `<div class="wrap">${head}
    <div class="co"><div class="box gate">
      <span class="gate-ic">${icon('user')}</span>
      <h2>Kyçu për të porositur</h2>
      <p>Porositë në unblej bëhen me llogari. Krijimi i saj është falas dhe zgjat një minutë.</p>
      ${loginBtns('arka')}${PERKS_ACC}
    </div><aside class="box co-sum" id="co-sum" aria-label="Përmbledhja e porosisë"></aside></div></div>`;
  const a = u.address || {};
  return `<div class="wrap">
    ${head}
    <div class="co">
      <form class="co-form" id="co-form" novalidate>
        <div class="who">${icon('user')}<span>Po porosit si <b>${esc(u.name)}</b> · ${esc(u.email)}</span><button class="link" type="button" data-logout>Nuk je ti? Dil</button></div>
        <section class="box"><h2><span class="n">1</span>Ku ta dërgojmë?</h2>
          <div class="grid2">
            ${field('co-name', 'Emri dhe mbiemri', 'required autocomplete="name" placeholder="p.sh. Arta Krasniqi"', 'Shkruaj emrin dhe mbiemrin.', '', u.name)}
            ${field('co-phone', 'Numri i telefonit', 'type="tel" required autocomplete="tel" inputmode="tel" placeholder="+383 4x xxx xxx"', 'Shkruaj një numër telefoni të saktë.', '', u.phone)}
            <div class="field"><label for="co-country">Shteti</label><select id="co-country" autocomplete="country">${countryOpts(a.country || 'ks')}</select></div>
            ${field('co-city', 'Qyteti', 'required autocomplete="address-level2" placeholder="p.sh. Prishtinë"', 'Shkruaj qytetin.', '', a.city)}
            ${field('co-address', 'Adresa', 'required autocomplete="street-address" placeholder="Rruga, numri, hyrja, kati"', 'Shkruaj adresën që korrieri ta gjejë lehtë.', 'full', a.street)}
            <div class="field full"><label for="co-note">Shënim për korrierin <i>(opsional)</i></label><textarea id="co-note" placeholder="p.sh. Më telefononi para se të vini"></textarea></div>
            <label class="chk full"><input type="checkbox" id="co-save" checked><span>Ruaje këtë adresë në llogarinë time</span><em></em></label>
          </div>
        </section>
        <section class="box"><h2><span class="n">2</span>Mënyra e dërgesës</h2>
          <div class="opts">
            <label class="opt"><input type="radio" name="ship" value="std" checked><span><b>Standarde</b><small>1–2 ditë pune në Kosovë, 2–4 ditë në Shqipëri dhe Maqedoni e Veriut</small></span><span class="p" id="ship-std-p"></span></label>
            <label class="opt"><input type="radio" name="ship" value="exp"><span><b>Ekspres</b><small>E merr ditën e nesërme deri në orën 12:00</small></span><span class="p">${eur(SHIP.exp)}</span></label>
          </div>
        </section>
        <section class="box"><h2><span class="n">3</span>Pagesa</h2>
          <div class="opts">
            <label class="opt"><input type="radio" name="pay" value="cod" checked><span><b>Pagesë në dorëzim</b><small>Paguan me para në dorë kur e merr pakon</small></span>${icon('cash')}</label>
            ${CONFIG.paypalClientId ? `<label class="opt"><input type="radio" name="pay" value="paypal"><span><b>PayPal</b><small>Paguaj tani, në mënyrë të sigurt, me llogarinë tënde PayPal</small></span><span class="pp-mark" aria-hidden="true">Pay<b>Pal</b></span></label>` : ''}
            <label class="opt"><input type="radio" name="pay" value="bank"><span><b>Transfer bankar</b><small>Të dhënat e llogarisë bankare i merr me email pas porosisë</small></span>${icon('shield')}</label>
          </div>
        </section>
      </form>
      <aside class="box co-sum" id="co-sum" aria-label="Përmbledhja e porosisë"></aside>
    </div>
  </div>`;
}
const payMethod = () => $('input[name="pay"]:checked')?.value || 'cod';
function renderSummary() {
  const box = $('#co-sum'); if (!box) return;
  const sub = subtotal(), disc = coupon ? Math.round(sub * COUPONS[coupon] * 100) / 100 : 0, ship = shipCost(), total = sub - disc + ship, pay = payMethod();
  const sp = $('#ship-std-p'); if (sp) sp.textContent = sub >= FREE ? 'Falas' : eur(SHIP.std);
  const action = !me()
    ? `<button class="btn btn-primary btn-lg btn-block" type="button" data-login="login" data-next="arka">${icon('user')} Kyçu për të porositur</button>`
    : pay === 'paypal'
      ? '<div id="pp-btns" class="pp-btns"><p class="pp-wait">Po hapet PayPal…</p></div>'
      : '<button class="btn btn-primary btn-lg btn-block" type="submit" form="co-form">Konfirmo porosinë</button>';
  const note = pay === 'paypal' ? 'Pagesa bëhet në faqen e sigurt të PayPal. Ne nuk e shohim llogarinë tënde.' : pay === 'bank' ? 'Të dhënat bankare i merr me email pas porosisë.' : 'Paguan vetëm kur e merr pakon.';
  box.innerHTML = `<h2>Përmbledhja</h2>
    <ul class="sum-items">${cart.map(l => { const p = byId(l.id); return `<li>${tile(p, 'span')}<span class="si-t">${esc(p.name)}<small>${l.q} × ${eur(p.price)}${l.size ? ` · Masa ${l.size}` : ''}</small></span><b>${eur(p.price * l.q)}</b></li>`; }).join('')}</ul>
    <div class="coupon"><label for="co-coupon" class="sr">Kodi i zbritjes</label><input id="co-coupon" placeholder="Kodi i zbritjes" value="${coupon || ''}" autocomplete="off"><button class="btn btn-soft" type="button" data-coupon>Apliko</button></div>
    <dl class="tot">
      <div><dt>Nëntotali</dt><dd>${eur(sub)}</dd></div>
      ${disc ? `<div class="disc"><dt>Zbritja (${coupon})</dt><dd>−${eur(disc)}</dd></div>` : ''}
      <div><dt>Dërgesa</dt><dd>${ship ? eur(ship) : 'Falas'}</dd></div>
      <div class="grand"><dt>Totali</dt><dd>${eur(total)}</dd></div>
    </dl>
    ${action}
    <p class="sum-note">${icon('shield')} ${note}</p>
    <ul class="co-trust"><li>${icon('shield')}Të dhënat përdoren vetëm për dërgesën</li><li>${icon('return')}Kthim falas brenda 14 ditëve</li><li>${icon('phone')}Ndihmë në shqip: ${CONTACT.phone}</li></ul>`;
  if (me() && pay === 'paypal') mountPaypal();
}
async function applyCoupon() {
  const v = ($('#co-coupon')?.value || '').trim().toUpperCase();
  if (!v) { coupon = null; renderSummary(); return; }
  if (!me()) { openAccount('login', 'arka'); return; }
  try { const r = await api('/coupon', { code: v }); coupon = r.code; toast(`${icon('check')}<span>Kodi ${r.code} u aplikua: −${Math.round(r.pct * 100)}%</span>`); }
  catch (e) { coupon = null; toast(`${icon('close')}<span>${esc(e.message)}</span>`); }
  renderSummary();
}
/* Kontrollon formularin e arkës dhe kthen të dhënat për serverin */
function collectOrder() {
  const f = $('#co-form'); if (!f) return null;
  let first = null;
  $$('.field', f).forEach(fl => {
    const i = fl.querySelector('input,select,textarea'); if (!i) return;
    const bad = !i.checkValidity() || (i.required && !i.value.trim()) || (i.id === 'co-phone' && i.value.replace(/\D/g, '').length < 8);
    fl.classList.toggle('bad', bad);
    if (bad && !first) first = i;
  });
  if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast(`${icon('close')}<span>Plotëso fushat e shënuara me të kuqe.</span>`); return null; }
  return {
    items: cart.map(l => ({ id: l.id, q: l.q, size: l.size })), coupon, ship: $('input[name="ship"]:checked')?.value || 'std', pay: payMethod(),
    name: $('#co-name').value.trim(), phone: $('#co-phone').value.trim(), country: $('#co-country').value, city: $('#co-city').value.trim(),
    street: $('#co-address').value.trim(), note: $('#co-note').value.trim(), saveAddress: !!$('#co-save')?.checked
  };
}
function finishOrder(order) {
  LAST = { ...order, first: String(order.name || '').split(/\s+/)[0], count: order.items.reduce((s, l) => s + l.q, 0) };
  if (ME && $('#co-save')?.checked) ME.address = { country: order.country, city: order.city, street: order.street };
  MYORDERS = null;
  cart = []; coupon = null; current = 'done'; saveCart(); go('porosia');
}
let ordering = false;
async function placeOrder() {
  if (!me()) { openAccount('login', 'arka'); return; }
  if (payMethod() === 'paypal') { toast(`${icon('cash')}<span>Për të paguar me PayPal, kliko butonin e verdhë PayPal.</span>`); $('#pp-btns')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  const body = collectOrder(); if (!body || ordering) return;
  ordering = true;
  const btn = $('button[form="co-form"]'); if (btn) { btn.disabled = true; btn.textContent = 'Po dërgohet porosia…'; }
  try { finishOrder((await api('/orders', body)).order); }
  catch (e) { if (e.status === 401) { setMe(null); openAccount('login', 'arka'); } toast(`${icon('close')}<span>${esc(e.message)}</span>`); }
  finally { ordering = false; if (btn?.isConnected) { btn.disabled = false; btn.textContent = 'Konfirmo porosinë'; } }
}

/* ---------- PayPal ---------- */
let paypalLoad = null;
function loadPaypal() {
  if (window.paypal) return Promise.resolve();
  return paypalLoad ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CONFIG.paypalClientId)}&currency=EUR&intent=capture&components=buttons&disable-funding=card,credit,paylater,sepa,bancontact,blik,eps,giropay,ideal,mybank,p24,sofort,venmo`;
    if (CONFIG.nonce) s.dataset.cspNonce = CONFIG.nonce;
    s.onload = res;
    s.onerror = () => { paypalLoad = null; s.remove(); rej(new Error('PayPal nuk u hap. Kontrollo internetin dhe provo përsëri, ose zgjidh pagesë në dorëzim.')); };
    document.head.append(s);
  });
}
async function mountPaypal() {
  const box = $('#pp-btns'); if (!box) return;
  try { await loadPaypal(); } catch (e) { box.innerHTML = `<p class="acc-note">${esc(e.message)}</p>`; return; }
  if (!box.isConnected) return;
  box.innerHTML = '';
  /* Shuma që paguhet është gjithmonë ajo që llogarit serveri nga çmimet e produkteve në shportë */
  const m = v => ({ currency_code: 'EUR', value: Number(v).toFixed(2) });
  let prep = null;
  const flow = CONFIG.paypalMode === 'client' ? {
    createOrder: async (data, actions) => {
      prep = await api('/paypal/prepare', collectOrder());
      return actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: prep.no, invoice_id: prep.no, description: `Porosia ${prep.no} në unblej`,
          amount: { ...m(prep.total), breakdown: { item_total: m(prep.sub), shipping: m(prep.ship), discount: m(prep.disc) } },
          items: prep.items.map(l => ({ name: `${l.name}${l.size ? ` (${l.size})` : ''}`.slice(0, 127), quantity: String(l.q), unit_amount: m(l.price), category: 'PHYSICAL_GOODS' }))
        }],
        application_context: { brand_name: 'unblej', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' }
      });
    },
    onApprove: async (data, actions) => {
      const d = await actions.order.capture();
      const cap = d.purchase_units?.[0]?.payments?.captures?.[0];
      finishOrder((await api('/paypal/confirm', { no: prep.no, paypalOrderId: d.id, captureId: cap?.id, amount: Number(cap?.amount?.value), currency: cap?.amount?.currency_code, status: cap?.status })).order);
    }
  } : {
    createOrder: async () => (await api('/paypal/create', collectOrder())).paypalId,
    onApprove: async data => finishOrder((await api('/paypal/capture', { paypalId: data.orderID })).order)
  };
  window.paypal.Buttons({
    fundingSource: window.paypal.FUNDING.PAYPAL,
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 50 },
    onClick: (data, actions) => (collectOrder() ? actions.resolve() : actions.reject()),
    ...flow,
    onCancel: () => toast(`${icon('close')}<span>Pagesa me PayPal u anulua. Porosia nuk u krye.</span>`),
    onError: err => toast(`${icon('close')}<span>${esc(err?.message || 'PayPal nuk funksionoi. Provo përsëri ose zgjidh pagesë në dorëzim.')}</span>`)
  }).render(box).catch(() => {});
}
function doneView() {
  if (!LAST) return null;
  const paid = LAST.pay === 'paypal';
  return `<div class="wrap"><div class="ok-wrap">
    <span class="ok-ic">${icon('check')}</span>
    <h1 class="page-h">Faleminderit, ${esc(LAST.first)}!</h1>
    <p class="lead">${paid ? 'Pagesa me PayPal u krye dhe porosia u pranua.' : `Porosia jote u pranua. Do të të telefonojmë në <b>${esc(LAST.phone)}</b> për ta konfirmuar.`} Konfirmimin ta dërguam edhe në email.</p>
    <div class="box"><dl class="tot">
      <div><dt>Numri i porosisë</dt><dd>${LAST.no}</dd></div>
      <div><dt>Produkte</dt><dd>${LAST.count}</dd></div>
      <div><dt>Dërgesa në</dt><dd>${esc(LAST.city)}, ${COUNTRIES[LAST.country].name}</dd></div>
      <div><dt>Arrin rreth</dt><dd>${LAST.eta}</dd></div>
      <div><dt>Pagesa</dt><dd>${LAST.payLabel}${paid ? ' · e paguar' : ''}</dd></div>
      <div class="grand"><dt>Totali</dt><dd>${eur(LAST.total)}</dd></div>
    </dl></div>
    <div class="hero-cta"><a class="btn btn-primary btn-lg" href="#dyqani">Vazhdo blerjen ${icon('arrow')}</a><a class="btn btn-soft btn-lg" href="#llogaria">Porositë e mia</a></div>
  </div></div>`;
}

/* ---------- Llogaria ---------- */
let MYORDERS = null, loadingOrders = false;
async function loadOrders() {
  if (loadingOrders) return; loadingOrders = true;
  try { MYORDERS = (await api('/orders')).orders; } catch (e) { MYORDERS = []; if (e.status === 401) setMe(null); }
  loadingOrders = false;
  if (current === 'account') route(true);
}
function orderRow(o) {
  const n = o.items.reduce((s, l) => s + l.q, 0);
  return `<details class="ord"><summary><span class="ord-no"><b>${o.no}</b><small>${fmtDate(o.date)} · ${plural(n, 'produkt', 'produkte')}</small></span><span class="st st-${o.status}">${o.statusLabel}</span><b class="ord-t">${eur(o.total)}</b>${icon('chev-d')}</summary>
    <ul class="sum-items">${o.items.map(l => `<li>${tile({ id: l.id, name: l.name, img: l.img }, 'span')}<span class="si-t">${esc(l.name)}<small>${l.q} × ${eur(l.price)}${l.size ? ` · Masa ${l.size}` : ''}</small></span><b>${eur(l.price * l.q)}</b></li>`).join('')}</ul>
    <dl class="tot"><div><dt>Dërgesa në</dt><dd>${esc(o.street)}, ${esc(o.city)}, ${COUNTRIES[o.country].name}</dd></div><div><dt>Pagesa</dt><dd>${o.payLabel}</dd></div><div><dt>Arrin rreth</dt><dd>${o.eta}</dd></div><div><dt>Dërgesa</dt><dd>${o.ship ? eur(o.ship) : 'Falas'}</dd></div>${o.disc ? `<div><dt>Zbritja</dt><dd>−${eur(o.disc)}</dd></div>` : ''}</dl>
    <button class="btn btn-soft" type="button" data-reorder="${o.no}">${icon('return')} Porosit përsëri</button>
  </details>`;
}
function accountView() {
  const u = me();
  if (!u) return `<div class="wrap page">${crumbs(['Llogaria'])}<div class="box gate gate-page">
      <span class="gate-ic">${icon('user')}</span><h1 class="page-h">Llogaria ime</h1>
      <p>Kyçu për të porositur, për të parë porositë e tua dhe për ta ruajtur adresën e dërgesës.</p>
      ${loginBtns('llogaria')}${PERKS_ACC}</div></div>`;
  if (MYORDERS === null) setTimeout(loadOrders);
  const mine = (MYORDERS || []).filter(o => o.status !== 'cancelled'), a = u.address || {};
  const spent = mine.reduce((s, o) => s + o.total, 0);
  return `<div class="wrap page">${crumbs(['Llogaria'])}
    <div class="acc-head"><span class="avatar">${esc(initials(u))}</span><div><h1 class="page-h">Përshëndetje, ${esc(firstName(u))}</h1><p class="sec-sub">${esc(u.email)} · Anëtar që nga ${fmtDate(u.created)}</p></div>${u.admin ? '<a class="btn btn-dark" href="/admin" data-external>Paneli i administrimit</a>' : ''}<button class="btn btn-soft" type="button" data-logout>Dil nga llogaria</button></div>
    <div class="acc-stats">${[[MYORDERS ? MYORDERS.length : '…', 'porosi'], [eur(spent), 'gjithsej të blera'], [wish.length, 'në favoritë'], [cart.reduce((s, l) => s + l.q, 0), 'në shportë']].map(([n, l]) => `<div><b>${n}</b><small>${l}</small></div>`).join('')}</div>
    <div class="acc-grid">
      <section class="box"><h2>Porositë e mia</h2>${MYORDERS === null ? '<p class="loading">Po ngarkohen porositë…</p>' : MYORDERS.length ? MYORDERS.map(orderRow).join('') : empty('cart', 'Ende nuk ke porosi', 'Kur të porositësh, porositë do të shfaqen këtu.', 'dyqani', 'Fillo blerjen')}</section>
      <div class="acc-side"><section class="box"><h2>Të dhënat e mia</h2>
        <form id="profile-form" class="grid2" novalidate>
          ${field('pf-name', 'Emri dhe mbiemri', 'required autocomplete="name"', 'Shkruaj emrin.', 'full', u.name)}
          ${field('pf-phone', 'Numri i telefonit', 'type="tel" required autocomplete="tel" inputmode="tel"', 'Shkruaj një numër telefoni të saktë.', 'full', u.phone)}
          <div class="field"><label for="pf-country">Shteti</label><select id="pf-country">${countryOpts(a.country || 'ks')}</select></div>
          ${field('pf-city', 'Qyteti', 'autocomplete="address-level2"', '', '', a.city)}
          ${field('pf-street', 'Adresa', 'autocomplete="street-address" placeholder="Rruga, numri, hyrja, kati"', '', 'full', a.street)}
          <button class="btn btn-primary full" type="submit">Ruaj ndryshimet</button>
        </form>
      </section>
      <section class="box"><h2>Fjalëkalimi</h2>
        <form id="pw-form" class="grid2" novalidate>
          <div class="field full"><label for="pc-cur">Fjalëkalimi aktual</label><input id="pc-cur" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="pc-new">I riu</label><input id="pc-new" type="password" autocomplete="new-password" minlength="6"></div>
          <div class="field"><label for="pc-new2">Përsërite</label><input id="pc-new2" type="password" autocomplete="new-password"></div>
          <button class="btn btn-soft full" type="submit">Ndrysho fjalëkalimin</button>
        </form>
      </section></div>
    </div></div>`;
}
function renderAccountUI() {
  const u = me(), b = $('.act[data-open="account"]');
  b.querySelector('.act-l').textContent = u ? firstName(u) : 'Llogaria';
  b.setAttribute('aria-label', u ? `Llogaria ime (${u.name})` : 'Kyçu ose regjistrohu');
  b.classList.toggle('in', !!u);
}
function setMe(u) { ME = u; MYORDERS = null; renderAccountUI(); renderCart(); }
function afterAuth(msg) {
  toast(`${icon('check')}<span><b>${msg}</b><small>Mirë se erdhe, ${esc(firstName(me()))}!</small></span>`);
  const next = afterLogin; afterLogin = null;
  if (next) go(next); else if (current === 'checkout' || current === 'account') route(true);
}
async function accSubmit(f) {
  const reg = $('[data-acc="register"]').getAttribute('aria-selected') === 'true';
  const email = $('#acc-email').value.trim().toLowerCase(), pw = $('#acc-pass').value, note = $('#acc-note');
  const fail = msg => { note.hidden = false; note.textContent = msg; };
  if (!f.checkValidity()) return fail(reg ? 'Plotëso emrin, telefonin, email-in dhe një fjalëkalim me të paktën 6 shenja.' : 'Shkruaj email-in dhe fjalëkalimin.');
  if (reg && $('#acc-phone').value.replace(/\D/g, '').length < 8) return fail('Shkruaj një numër telefoni të saktë.');
  const btn = $('#acc-submit'); btn.disabled = true; note.hidden = true;
  try {
    const r = await api(reg ? '/auth/register' : '/auth/login', reg ? { name: $('#acc-name').value.trim(), phone: $('#acc-phone').value.trim(), email, password: pw } : { email, password: pw });
    setMe(r.user);
  } catch (e) { return fail(e.message); } finally { btn.disabled = false; }
  f.reset(); $('#account').close();
  afterAuth(reg ? 'Llogaria u krijua' : 'U kyçe me sukses');
}
/* ---------- Fjalëkalimi i harruar: kodi 6-shifror vjen në email ---------- */
let RESET_EMAIL = null, resendTimer = 0;
function showFp(on) { $('#acc-form').hidden = on; $('#fp').hidden = !on; if (!on) clearInterval(resendTimer); }
function fpStep(n) {
  $('#fp-form').hidden = n !== 1; $('#rs-form').hidden = n !== 2;
  $$('#fp .fp-steps li').forEach((li, i) => { li.className = i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''; });
}
function openForgot() {
  showFp(true); fpStep(1);
  $('#fp-email').value = $('#acc-email').value.trim();
  $$('#fp .acc-note').forEach(n => { n.hidden = true; });
  setTimeout(() => $('#fp-email').focus(), 30);
}
function startResend() {
  const b = $('#rs-resend'); let left = 30;
  clearInterval(resendTimer); b.disabled = true; b.textContent = `Dërgo kodin përsëri (${left})`;
  resendTimer = setInterval(() => { left--; if (left <= 0) { clearInterval(resendTimer); b.disabled = false; b.textContent = 'Dërgo kodin përsëri'; } else b.textContent = `Dërgo kodin përsëri (${left})`; }, 1000);
}
async function fpSubmit() {
  const email = $('#fp-email').value.trim().toLowerCase(), note = $('#fp-note');
  if (!$('#fp-email').checkValidity() || !email) { note.hidden = false; note.textContent = 'Shkruaj një adresë email të saktë.'; return; }
  const btn = $('#fp-form [type=submit]'); btn.disabled = true;
  try { await api('/auth/forgot', { email }); } catch (e) { note.hidden = false; note.textContent = e.message; return; } finally { btn.disabled = false; }
  RESET_EMAIL = email; note.hidden = true;
  $('#rs-lead').innerHTML = `Nëse ekziston një llogari me <b>${esc(email)}</b>, të dërguam një kod 6-shifror në email. Shkruaje këtu dhe zgjidh një fjalëkalim të ri. Kodi skadon pas 15 minutash. Nëse nuk e gjen, shiko edhe te Spam.`;
  fpStep(2);
  ['rs-code', 'rs-pass', 'rs-pass2'].forEach(id => { $('#' + id).value = ''; }); meter(''); $('#rs-note').hidden = true;
  startResend();
  setTimeout(() => $('#rs-code').focus(), 30);
}
async function resendCode() {
  if (!RESET_EMAIL) return;
  try { await api('/auth/forgot', { email: RESET_EMAIL }); toast(`${icon('mail')}<span>Të dërguam një kod të ri në ${esc(RESET_EMAIL)}.</span>`); startResend(); }
  catch (e) { toast(`${icon('close')}<span>${esc(e.message)}</span>`); }
}
function meter(pw) {
  const score = [pw.length >= 6, pw.length >= 10, /[A-Z]/.test(pw) && /[a-z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const lvl = !pw ? 0 : score <= 1 ? 1 : score <= 3 ? 2 : 3;
  $('#rs-meter').dataset.l = lvl;
  $('#rs-meter-t').textContent = ['Të paktën 6 shenja', 'I dobët: shto shkronja të mëdha, numra ose simbole', 'Mesatar', 'I fortë'][lvl];
}
async function rsSubmit() {
  const note = $('#rs-note'), fail = m => { note.hidden = false; note.textContent = m; };
  const code = $('#rs-code').value.replace(/\D/g, ''), pw = $('#rs-pass').value, pw2 = $('#rs-pass2').value;
  if (code.length !== 6) return fail('Shkruaj kodin 6-shifror nga email-i.');
  if (pw.length < 6) return fail('Fjalëkalimi i ri duhet të ketë të paktën 6 shenja.');
  if (pw !== pw2) return fail('Fjalëkalimet nuk përputhen.');
  const btn = $('#rs-form [type=submit]'); btn.disabled = true;
  try { setMe((await api('/auth/reset', { email: RESET_EMAIL, code, password: pw })).user); }
  catch (e) {
    if (e.data?.restart) { fpStep(1); const n = $('#fp-note'); n.hidden = false; n.textContent = e.message; return; }
    return fail(e.message);
  } finally { btn.disabled = false; }
  RESET_EMAIL = null; $('#account').close();
  afterAuth('Fjalëkalimi u ndryshua');
}
async function pwChange(f) {
  if (!me()) return;
  const cur = $('#pc-cur').value, pw = $('#pc-new').value, pw2 = $('#pc-new2').value;
  const fail = m => toast(`${icon('close')}<span>${esc(m)}</span>`);
  if (pw.length < 6) return fail('Fjalëkalimi i ri duhet të ketë të paktën 6 shenja.');
  if (pw !== pw2) return fail('Fjalëkalimet e reja nuk përputhen.');
  try { await api('/auth/password', { current: cur, password: pw }); f.reset(); toast(`${icon('check')}<span>Fjalëkalimi u ndryshua.</span>`); }
  catch (e) { fail(e.message); }
}
async function logout() {
  try { await api('/auth/logout', {}); } catch {}
  setMe(null);
  toast(`${icon('check')}<span>Dole nga llogaria.</span>`);
  if (current === 'checkout' || current === 'account') route(true);
}

/* ---------- Faqet informuese ---------- */
function infoView(tab) {
  const tabs = `<div class="info-tabs" role="navigation" aria-label="Informacione">${Object.entries(INFO).map(([k, l]) => `<a href="#${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</div>`;
  const copyBtn = v => `<button class="copy" type="button" data-copy="${esc(v)}">${icon('copy')} Kopjo</button>`;
  const body = {
    'rreth-nesh': `<div class="about"><div class="prose">
        <h2>Gjithçka në një vend</h2>
        <p>unblej është dyqani online ku gjen gjithçka në një vend: elektronikë, pajisje shtëpiake, veshje, sport e shumë më tepër.</p>
        <p>Emri vjen nga mënyra si flasim çdo ditë: “un blej”. Ashtu siç e themi, ashtu duhet të jetë edhe blerja: e thjeshtë, e shpejtë dhe pa surpriza.</p>
        <p>Çdo produkt ka çmimin përfundimtar të shkruar qartë. Porosit në pak hapa, paguan kur e merr pakon dhe ke 14 ditë kohë për ta kthyer nëse nuk të pëlqen.</p>
        <div class="hero-cta"><a class="btn btn-primary btn-lg" href="#dyqani">Fillo blerjen ${icon('arrow')}</a></div>
      </div>
      <div class="facts rv">
        <h3>unblej me pak fjalë</h3>
        <dl>${[[P.length, 'produkte në dyqan'], [CATS.length, 'kategori'], [Object.keys(COUNTRIES).length, 'shtete ku dërgojmë'], ['14', 'ditë për kthim falas'], [`${FREE} €`, 'mbi këtë shumë dërgesa është falas'], ['1–2', 'ditë pune dërgesa në Kosovë']].map(([n, l]) => `<div><dt>${n}</dt><dd>${l}</dd></div>`).join('')}</dl>
      </div></div>
      <div class="prose"><h3>Si porosit në unblej</h3></div>
      <ol class="steps-row">${[['search', 'Zgjidh produktin', 'Kërko ose shfleto kategoritë dhe shtoje në shportë.'], ['user', 'Kyçu në llogari', 'Regjistrohu falas me emër, telefon dhe email. Adresa ruhet për herën tjetër.'], ['phone', 'Konfirmo me telefon', 'Të telefonojmë për ta konfirmuar porosinë.'], ['cash', 'Paguaj kur e merr', 'Paguan me para në dorë kur korrieri ta sjell pakon.']].map(([i, t, s]) => `<li class="rv">${icon(i)}<b>${t}</b><small>${s}</small></li>`).join('')}</ol>
      <div class="about-cta rv"><div><h3>Ke një pyetje?</h3><p>Na telefono ose shkruaj në WhatsApp në ${CONTACT.phone}, ose na dërgo email në ${CONTACT.email}.</p></div><a class="btn btn-primary btn-lg" href="#kontakt">Na kontakto ${icon('arrow')}</a></div>
      <div class="values">${[['tag', 'Çmime të ndershme', 'Zbritje të vërteta dhe çmim përfundimtar pa kosto të fshehura.'], ['truck', 'Dërgesë e shpejtë', '1–2 ditë pune në Kosovë, falas mbi 30 €.'], ['cash', 'Pagesë në dorëzim', 'Paguan vetëm kur e ke pakon në dorë.'], ['chat', 'Ndihmë në shqip', 'Na shkruaj ose na telefono çdo ditë pune.']].map(([i, t, s]) => `<div class="val rv">${icon(i)}<b>${t}</b><small>${s}</small></div>`).join('')}</div>`,
    'dergesa': `<div class="prose">
        <h2>Dërgesa</h2>
        <p>Porositë e bëra para orës 15:00 nisen të njëjtën ditë pune. Korrieri të telefonon para se të vijë.</p>
      </div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Zona</th><th>Koha e dërgesës</th><th>Standarde</th><th>Ekspres</th></tr></thead><tbody>
        <tr><td>Kosovë</td><td>1–2 ditë pune</td><td>${eur(SHIP.std)} · falas mbi 30 €</td><td>${eur(SHIP.exp)}</td></tr>
        <tr><td>Shqipëri</td><td>2–4 ditë pune</td><td>${eur(SHIP.std)} · falas mbi 30 €</td><td>${eur(SHIP.exp)}</td></tr>
        <tr><td>Maqedoni e Veriut</td><td>2–4 ditë pune</td><td>${eur(SHIP.std)} · falas mbi 30 €</td><td>${eur(SHIP.exp)}</td></tr>
      </tbody></table></div>
      <div class="prose"><h3>Si ta kthesh një produkt</h3></div>
      <ol class="howto">
        <li><span>Na kontakto brenda 14 ditëve nga marrja e pakos, me telefon ose email, dhe jep numrin e porosisë.</span></li>
        <li><span>Paketoje produktin të papërdorur, në paketimin origjinal, bashkë me faturën.</span></li>
        <li><span>Korrieri vjen e merr pakon në adresën tënde, pa pagesë shtesë.</span></li>
        <li><span>Pasi e kontrollojmë produktin, paratë t’i kthejmë brenda 5 ditëve pune.</span></li>
      </ol>`,
    'pyetje': `<div class="faq">${[
        ['Sa zgjat dërgesa?', 'Në Kosovë 1–2 ditë pune. Në Shqipëri dhe Maqedoni e Veriut 2–4 ditë pune. Me dërgesë ekspres e merr ditën e nesërme deri në orën 12:00.'],
        ['Sa kushton dërgesa?', `Dërgesa standarde është falas për porositë mbi 30 €. Për porositë më të vogla kushton ${eur(SHIP.std)}. Dërgesa ekspres kushton ${eur(SHIP.exp)}.`],
        ['Si mund të paguaj?', 'Me para në dorë kur e merr pakon (pagesë në dorëzim) ose me transfer bankar.'],
        ['A mund ta kthej produktin?', 'Po, brenda 14 ditëve nga marrja, nëse produkti është i papërdorur dhe në paketimin origjinal. Kthimi është falas.'],
        ['A kanë garanci produktet?', 'Po. Afati i garancisë shënohet te specifikimet e çdo produkti, zakonisht 12 ose 24 muaj.'],
        ['Si e gjej masën e duhur të këpucëve?', 'Te çdo palë këpucë ka një udhëzues masash. Mate këmbën nga thembra te gishti më i gjatë dhe krahasoje me tabelën.'],
        ['Si e gjurmoj porosinë?', 'Pas konfirmimit të merr një SMS me numrin e porosisë dhe numrin e korrierit.'],
        ['A më duhet llogari për të porositur?', 'Po. Llogaria është falas dhe krijohet në një minutë me emër, telefon dhe email. Me të e ruan adresën, i sheh të gjitha porositë dhe mund të porositësh përsëri me një klik.'],
        ['Si i shoh porositë e mia?', 'Kyçu dhe hap “Llogaria ime”. Aty janë të gjitha porositë, me produktet, adresën dhe kohën e mbërritjes.']
      ].map(([q, a], i) => `<details ${i === 0 ? 'open' : ''}><summary>${q}${icon('chev-d')}</summary><p>${a}</p></details>`).join('')}</div>`,
    'kontakt': `<div class="contact-cards">
        <div class="cc">${icon('phone')}<small>Telefon dhe WhatsApp</small><b>${CONTACT.phone}</b>${copyBtn(CONTACT.phone)}</div>
        <div class="cc">${icon('mail')}<small>Email</small><b>${CONTACT.email}</b>${copyBtn(CONTACT.email)}</div>
        <div class="cc">${icon('pin')}<small>Zyra</small><b>${CONTACT.city}</b><small>E hënë – e shtunë, 08:00–20:00</small></div>
      </div>`,
    'kushtet': `<div class="prose">
        <h3>Çmimet</h3><p>Të gjitha çmimet janë në euro dhe përfshijnë TVSH-në. Kostoja e dërgesës shfaqet në arkë, para se ta konfirmosh porosinë.</p>
        <h3>Llogaria</h3><p>Për të porositur të duhet një llogari në unblej. Je përgjegjës për ruajtjen e fjalëkalimit dhe për saktësinë e të dhënave që jep.</p>
        <h3>Porosia</h3><p>Pas porosisë të telefonojmë për konfirmim. Porosia niset vetëm pasi ta konfirmosh me telefon.</p>
        <h3>Pagesa</h3><p>Paguan me para në dorë kur e merr pakon, ose me transfer bankar para dërgesës.</p>
        <h3>Kthimi</h3><p>Ke 14 ditë nga marrja për ta kthyer produktin, nëse është i papërdorur dhe në paketimin origjinal. Kthimi është falas.</p>
        <h3>Garancia</h3><p>Afati i garancisë shënohet te çdo produkt. Ruaje faturën: të duhet për çdo kërkesë garancie.</p>
      </div>`,
    'privatesia': `<div class="prose">
        <h3>Çfarë të dhënash mbledhim</h3><p>Për llogarinë: emrin, email-in, numrin e telefonit dhe fjalëkalimin, të cilin e ruajmë vetëm të koduar. Për porosinë: adresën e dërgesës. I përdorim vetëm për llogarinë dhe për ta dërguar porosinë.</p>
        <h3>Shporta dhe favoritet</h3><p>Ruhen vetëm në shfletuesin tënd, në këtë pajisje. Nuk dërgohen te ne.</p>
        <h3>Me kë i ndajmë</h3><p>Vetëm me korrierin që e sjell pakon. Nuk i shesim dhe nuk i japim palëve të tjera.</p>
        <h3>Të drejtat e tua</h3><p>Mund të kërkosh t’i shohësh ose t’i fshish të dhënat e tua në çdo kohë, duke na shkruar në ${CONTACT.email}.</p>
      </div>`
  }[tab];
  return `<div class="wrap page">${crumbs([INFO[tab]])}<h1 class="page-h" style="margin:10px 0 18px">${INFO[tab]}</h1>${tabs}${body}</div>`;
}

/* ---------- Navigimi ---------- */
const app = $('#app');
function go(h) { if (location.hash.slice(1) === h) route(); else location.hash = h; }
function markRail(id) { $$('#rail a').forEach(a => a.dataset.rail === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')); }
function markBnav(v) { $$('.bnav [data-b]').forEach(a => a.dataset.b === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')); }
function route(keepScroll) {
  const h = decodeURIComponent(location.hash.slice(1));
  closePanels(); closeSugg(); closeQV();
  if ($('#zoom').open) $('#zoom').close();
  if ($('#account').open) $('#account').close();
  CLEAN.splice(0).forEach(f => f());
  let html = null, v = 'home';
  if (h === 'dyqani') { resetF(); v = 'shop'; }
  else if (h === 'zbritje') { resetF(); F.sale = true; F.sort = 'off'; v = 'shop'; }
  else if (h === 'te-reja') { resetF(); F.isNew = true; v = 'shop'; }
  else if (h === 'sete') { resetF(); F.set = true; v = 'shop'; }
  else if (h === 'kerko') { const q = F.q; resetF(); F.q = q; v = 'shop'; }
  else if (h.startsWith('kategori-')) { resetF(); F.cats.add(h.slice(9)); v = 'shop'; }
  else if (h.startsWith('produkt-')) { v = 'product'; html = productView(+h.slice(8)); }
  else if (h === 'arka') { v = 'checkout'; html = checkoutView(); }
  else if (h === 'porosia') { v = 'done'; html = doneView(); }
  else if (h === 'favoritet') { v = 'wish'; html = wishView(); }
  else if (h === 'llogaria') { v = 'account'; html = accountView(); }
  else if (INFO[h]) { v = 'info'; html = infoView(h); }
  if (v === 'shop') html = shopView();
  if (!html) { v = 'home'; html = homeView(); }
  current = v;
  const y = window.scrollY;
  app.innerHTML = html;
  app.classList.remove('enter');
  if (keepScroll !== true) { void app.offsetWidth; app.classList.add('enter'); }
  if (v === 'shop') renderResults();
  if (v === 'checkout' && cart.length) renderSummary();
  if (v === 'home') { initRing(); initEmbers(); countUp(); }
  if (v === 'product') initViewer($('.pd .viewer'), CLEAN);
  if (v === 'done' && keepScroll !== true) confetti();
  tick();
  const onlyCat = F.cats.size === 1 && !F.sale && !F.isNew && !F.set && !F.q ? [...F.cats][0] : null;
  markRail(v === 'shop' ? (onlyCat || (!F.cats.size && !F.sale && !F.isNew && !F.set && !F.q ? 'all' : null)) : null);
  markBnav(v);
  window.scrollTo(0, keepScroll === true ? y : 0);
  observeIn(); updateProgress();
}

/* ---------- Panelet ---------- */
function openPanel(el) {
  if (!el) return;
  lastFocus = document.activeElement;
  el.classList.add('open'); $('#scrim').classList.add('on');
  relock();
  setTimeout(() => el.querySelector('.x, button, a')?.focus(), 60);
}
function closePanels() {
  const open = $$('.drawer.open, .filters.open');
  if (!open.length) return;
  open.forEach(e => e.classList.remove('open'));
  $('#scrim').classList.remove('on');
  relock();
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}
function openAccount(tab = 'login', next = null) {
  closePanels(); closeQV(); afterLogin = next; showFp(false); setAccTab(tab);
  $('#acc-title').textContent = next === 'arka' ? 'Kyçu për ta përfunduar porosinë' : 'Mirë se erdhe në unblej';
  $('#account').showModal(); setTimeout(() => $(tab === 'register' ? '#acc-name' : '#acc-email').focus(), 50);
}
function setAccTab(t) {
  const reg = t === 'register';
  $$('[data-acc]').forEach(b => b.setAttribute('aria-selected', b.dataset.acc === t));
  $('#acc-name-f').hidden = !reg; $('#acc-name').required = reg;
  $('#acc-phone-f').hidden = !reg; $('#acc-phone').required = reg;
  $('#forgot-btn').hidden = reg; $('#acc-hint').hidden = !reg;
  $('#acc-pass').autocomplete = reg ? 'new-password' : 'current-password';
  $('#acc-submit').textContent = reg ? 'Krijo llogarinë' : 'Kyçu';
  $('#acc-note').hidden = true;
}

/* ---------- Kërkimi ---------- */
const qIn = $('#q'), sugg = $('#sugg');
function showSugg(v) {
  const t = norm(v.trim());
  if (!t) {
    sugg.innerHTML = `<div class="pop"><span>Kërkimet e njohura</span><div>${['kufje', 'laptop', 'smartwatch', 'çajnik', 'atlete', 'set'].map(w => `<button type="button" class="chip" data-pop="${w}">${icon('search')}${w}</button>`).join('')}</div></div>`;
    sugg.hidden = false; qIn.setAttribute('aria-expanded', 'true'); return;
  }
  const m = P.filter(p => norm(`${p.name} ${p.brand} ${cat(p.cat).name}`).includes(t));
  sugg.innerHTML = m.length
    ? m.slice(0, 6).map(p => `<a class="sg" href="#produkt-${p.id}">${tile(p, 'span')}<span class="sg-t">${esc(p.name)}<small>${cat(p.cat).name}</small></span><b>${eur(p.price)}</b></a>`).join('') + `<a class="sg-all" href="#kerko" data-all>Shiko të gjitha rezultatet (${m.length})</a>`
    : `<div class="sg-none">Nuk gjetëm produkte për “${esc(v.trim())}”. Provo “kufje”, “laptop” ose “çajnik”.</div>`;
  sugg.hidden = false; qIn.setAttribute('aria-expanded', 'true');
}
function closeSugg() { sugg.hidden = true; qIn.setAttribute('aria-expanded', 'false'); }
qIn.addEventListener('input', () => showSugg(qIn.value));
qIn.addEventListener('focus', () => showSugg(qIn.value));
$('#search').addEventListener('submit', e => { e.preventDefault(); F.q = qIn.value.trim(); closeSugg(); qIn.blur(); go('kerko'); });

/* ---------- Njoftimet ---------- */
function toast(html) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
  const box = $('#toasts'); box.append(t);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3550);
}
function copyText(txt, btn) {
  const done = () => { const o = btn.innerHTML; btn.innerHTML = `${icon('check')} U kopjua`; setTimeout(() => { btn.innerHTML = o; }, 1600); };
  const fallback = () => { const el = btn.parentElement.querySelector('b'); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  try { navigator.clipboard.writeText(txt).then(done, fallback); } catch { fallback(); }
}
function tick() {
  const now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end - now) / 1000));
  const t = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');
  $$('[data-cd]').forEach(e => {
    if (e.children.length !== t.length) { e.innerHTML = [...t].map(c => `<i>${c}</i>`).join(''); return; }
    [...t].forEach((c, k) => {
      const s = e.children[k];
      if (s.textContent !== c) { s.textContent = c; s.classList.remove('flip'); void s.offsetWidth; s.classList.add('flip'); }
    });
  });
}

/* ---------- Animacione të vogla ---------- */
function countUp() {
  $$('#app [data-to]').forEach(el => {
    const to = +el.dataset.to, t0 = performance.now() + 450, dur = 1100;
    const step = now => {
      if (!el.isConnected) return;
      const k = clamp((now - t0) / dur, 0, 1);
      el.textContent = `−${Math.round(to * (1 - Math.pow(1 - k, 3)))}%`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
/* Shkëndija që dalin nga butoni kur shton në shportë */
function burst(el) {
  if (reduced || !el) return;
  const r = el.getBoundingClientRect(); if (!r.width) return;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('i');
    s.className = 'spark' + (i % 3 === 0 ? ' star' : '');
    s.style.left = cx + 'px'; s.style.top = cy + 'px';
    document.body.append(s);
    const a = Math.random() * Math.PI * 2, d = 34 + Math.random() * 54;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * d).toFixed(1)}px)) scale(0) rotate(180deg)`, opacity: 0 }
    ], { duration: 600 + Math.random() * 350, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
  }
}
/* Konfeti kur porosia përfundon */
function confetti() {
  if (reduced) return;
  const colors = ['#ff7a0d', '#ffb15c', '#ffffff', '#1a1714', '#ffd27a', '#e0301e'];
  for (let i = 0; i < 110; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    Object.assign(c.style, { left: Math.random() * 100 + 'vw', background: colors[i % colors.length], width: 6 + Math.random() * 6 + 'px', height: 8 + Math.random() * 10 + 'px' });
    document.body.append(c);
    const x = (Math.random() - 0.5) * 220, rot = (Math.random() - 0.5) * 1080;
    c.animate([
      { transform: 'translate(0,-30px) rotate(0deg)', opacity: 1 },
      { transform: `translate(${x.toFixed(0)}px, ${innerHeight + 40}px) rotate(${rot.toFixed(0)}deg)`, opacity: 0.9 }
    ], { duration: 2200 + Math.random() * 1600, delay: Math.random() * 600, easing: 'cubic-bezier(.25,.6,.45,1)', fill: 'backwards' }).onfinish = () => c.remove();
  }
}
/* Titujt e seksioneve dhe shiritat e stokut mbushen kur dalin në ekran */
function observeIn() {
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.remove('pre'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('#app .sec-h h2, #app .stock').forEach(el => { if (el.getBoundingClientRect().top > innerHeight * 0.92) { el.classList.add('pre'); io.observe(el); } });
  CLEAN.push(() => io.disconnect());
}
function updateProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  $('.progress').style.setProperty('--sp', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
}

/* ---------- Kartat 3D që anojnë sipas miut ---------- */
if (finePointer) {
  let tEl = null, mEl = null;
  const reset = el => { el.classList.remove('tilt'); ['--rx', '--ry', '--px', '--py'].forEach(k => el.style.removeProperty(k)); };
  document.addEventListener('pointermove', e => {
    /* Drita që ndjek miun në hero */
    const hero = e.target.closest?.('.hero');
    if (hero) { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px'); hero.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px'); }
    /* Butonat "magnetikë" që tërhiqen drejt miut */
    const m = e.target.closest?.('[data-magnet]') || null;
    if (m !== mEl) { if (mEl) { mEl.style.removeProperty('--mgx'); mEl.style.removeProperty('--mgy'); } mEl = m; }
    if (m) { const r = m.getBoundingClientRect(); m.style.setProperty('--mgx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px'); m.style.setProperty('--mgy', ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px'); }
    const el = reduced ? null : e.target.closest?.('.card, .topcat') || null;
    if (el !== tEl) { if (tEl) reset(tEl); tEl = el; }
    if (!el) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.classList.add('tilt');
    el.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
    el.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
    el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    el.style.setProperty('--px', ((0.5 - x) * 10).toFixed(1) + 'px');
    el.style.setProperty('--py', ((0.5 - y) * 8).toFixed(1) + 'px');
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { if (tEl) { reset(tEl); tEl = null; } });
}

/* ---------- Ngjarjet ---------- */
document.addEventListener('click', e => {
  if (!e.target.closest('#search')) closeSugg();
  if (e.target.closest('[data-skip]')) { e.preventDefault(); app.focus(); return; }
  const a = e.target.closest('a[href^="#"]');
  if (a) {
    e.preventDefault();
    if (ringDragged && a.closest('.ring')) return;
    if (a.hasAttribute('data-all')) F.q = qIn.value.trim();
    go(a.getAttribute('href').slice(1));
    return;
  }
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset, scope = t.closest('[data-scope]');
  if (d.add) addToCart(+d.add, 1, null, { img: t.closest('.card')?.querySelector('.tile img'), from: t });
  else if (d.wish) toggleWish(+d.wish);
  else if (d.qv) openQV(+d.qv);
  else if ('closeQv' in d) closeQV();
  else if (d.v === 'spin') VIEWERS.get(t.closest('.viewer'))?.spin();
  else if (d.v === 'zoom') openZoom(+t.closest('.viewer').dataset.id);
  else if ('closeZoom' in d) $('#zoom').close();
  else if (d.go) go(d.go);
  else if (d.open === 'cart') { closePanels(); openPanel($('#cart')); }
  else if (d.open === 'filters') openPanel($('#filters'));
  else if (d.open === 'account') { if (me()) go('llogaria'); else openAccount(); }
  else if (d.login) openAccount(d.login, d.next || null);
  else if ('logout' in d) logout();
  else if ('forgot' in d) openForgot();
  else if ('fpBack' in d) { showFp(false); setAccTab('login'); }
  else if ('resend' in d) resendCode();
  else if ('pw' in d) { const i = $('#' + (d.pw || 'acc-pass')), show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.setAttribute('aria-label', show ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'); t.classList.toggle('on', show); }
  else if (d.reorder) {
    const o = (MYORDERS || []).find(x => x.no === d.reorder); if (!o) return;
    o.items.forEach(it => { if (!byId(it.id)) return; const l = cart.find(x => x.id === it.id && x.size === it.size); if (l) l.q = Math.min(10, l.q + it.q); else cart.push({ id: it.id, q: it.q, size: it.size }); });
    saveCart(); bump(); toast(`${icon('check')}<span>Produktet e porosisë ${o.no} u shtuan në shportë.</span><button type="button" data-open="cart">Shiko</button>`);
  }
  else if ('close' in d) closePanels();
  else if (d.qty) { const [i, s] = d.qty.split(':').map(Number); const l = cart[i]; if (l) { l.q = clamp(l.q + s, 1, 10); saveCart(); } }
  else if (d.rm) { cart.splice(+d.rm, 1); saveCart(); }
  else if (d.chip) removeChip(d.chip);
  else if ('clear' in d) { resetF(); qIn.value = ''; rerenderShop(); }
  else if (d.page) { F.page = +d.page; renderResults(); window.scrollTo({ top: $('.shop-head').getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' }); }
  else if (d.scroll) { const [id, dir] = d.scroll.split(':'); const s = $('#' + id); s?.scrollBy({ left: +dir * s.clientWidth * 0.9, behavior: 'smooth' }); }
  else if ('addSel' in d) addSelected(scope, false, t);
  else if ('buy' in d) addSelected(scope, true, t);
  else if (d.q && scope) { const st = stateOf(scope); st.q = clamp(st.q + +d.q, 1, 10); scope.querySelector('.q-out').textContent = st.q; }
  else if (d.size && scope) {
    const st = stateOf(scope); st.size = +d.size;
    $$('.size', scope).forEach(b => b.setAttribute('aria-pressed', b === t));
    scope.querySelector('.sizes')?.classList.remove('need');
    scope.querySelector('.sizes .lbl').textContent = `Masa: ${d.size}`;
  }
  else if ('coupon' in d) applyCoupon();
  else if (d.copy) copyText(d.copy, t);
  else if (d.acc) setAccTab(d.acc);
  else if ('closeDialog' in d) $('#account').close();
  else if ('focusSearch' in d) { qIn.focus(); if (qIn.value.trim()) showSugg(qIn.value); }
  else if ('top' in d) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  else if (d.pop) { qIn.value = d.pop; F.q = d.pop; closeSugg(); go('kerko'); }
  else if ('noticeOk' in d) { store.set('ub-notice', 1); $('#notice').hidden = true; }
});
$('#scrim').addEventListener('click', closePanels);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePanels(); closeSugg(); }
  if (e.key === 'Enter' && e.target.id === 'co-coupon') { e.preventDefault(); applyCoupon(); }
});
$('#account').addEventListener('click', e => { if (e.target.id === 'account') e.target.close(); });
$('#account').addEventListener('close', () => { showFp(false); });
$('#rs-pass').addEventListener('input', e => meter(e.target.value));
$('#rs-code').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
$('#qv').addEventListener('click', e => { if (e.target.id === 'qv') closeQV(); });
$('#qv').addEventListener('close', () => { QCLEAN.splice(0).forEach(f => f()); $('#qv-in').innerHTML = ''; QV = null; relock(); });
$('#zoom').addEventListener('click', e => { if (e.target.id === 'zoom') e.target.close(); });
$('#zoom').addEventListener('close', relock);
const zin = $('#zoom-in');
zin.addEventListener('pointermove', e => {
  const r = zin.getBoundingClientRect();
  zin.style.setProperty('--ox', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
  zin.style.setProperty('--oy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  if (e.pointerType === 'mouse') zin.classList.add('z');
});
zin.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') zin.classList.remove('z'); });
zin.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') zin.classList.toggle('z'); });

app.addEventListener('change', e => {
  const el = e.target, k = el.dataset.f;
  if (k && k !== 'maxr') {
    if (k === 'cat') el.checked ? F.cats.add(el.value) : F.cats.delete(el.value);
    else if (k === 'brand') el.checked ? F.brands.add(el.value) : F.brands.delete(el.value);
    else if (k === 'rating') F.rating = +el.value;
    else if (k === 'sort') F.sort = el.value;
    else if (k === 'min' || k === 'max') {
      let mn = clamp(+$('#f-min').value || 0, 0, PMAX), mx = clamp(+$('#f-max').value || PMAX, 0, PMAX);
      if (mn > mx) [mn, mx] = [mx, mn];
      F.min = mn; F.max = mx; $('#f-min').value = mn; $('#f-max').value = mx; $('#f-max-r').value = mx;
    } else F[k] = el.checked;
    F.page = 1; renderResults(); return;
  }
  if (el.name === 'ship' || el.name === 'pay') renderSummary();
});
app.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.f === 'maxr') { F.max = Math.max(+el.value, F.min); $('#f-max').value = F.max; F.page = 1; renderResults(); }
  el.closest('.field')?.classList.remove('bad');
});
document.addEventListener('submit', e => {
  const f = e.target;
  if (f.id === 'co-form') { e.preventDefault(); placeOrder(f); }
  else if (f.id === 'news-form') {
    e.preventDefault();
    const i = $('#news-email');
    if (!i.value.trim() || !i.checkValidity()) { i.focus(); toast(`${icon('mail')}<span>Shkruaj një adresë email të saktë.</span>`); return; }
    api('/newsletter', { email: i.value.trim() })
      .then(() => { i.value = ''; toast(`${icon('check')}<span><b>Faleminderit!</b><small>Do të të shkruajmë kur të kemi oferta të reja.</small></span>`); })
      .catch(err => toast(`${icon('close')}<span>${esc(err.message)}</span>`));
  } else if (f.id === 'acc-form') {
    e.preventDefault(); accSubmit(f);
  } else if (f.id === 'fp-form') {
    e.preventDefault(); fpSubmit();
  } else if (f.id === 'rs-form') {
    e.preventDefault(); rsSubmit();
  } else if (f.id === 'pw-form') {
    e.preventDefault(); pwChange(f);
  } else if (f.id === 'profile-form') {
    e.preventDefault();
    const u = me(); if (!u) return;
    const name = $('#pf-name').value.trim(), phone = $('#pf-phone').value.trim();
    if (!name || phone.replace(/\D/g, '').length < 8) { toast(`${icon('close')}<span>Shkruaj emrin dhe një numër telefoni të saktë.</span>`); return; }
    api('/me', { name, phone, address: { country: $('#pf-country').value, city: $('#pf-city').value.trim(), street: $('#pf-street').value.trim() } }, 'PUT')
      .then(r => { ME = r.user; renderAccountUI(); route(true); toast(`${icon('check')}<span>Të dhënat u ruajtën.</span>`); })
      .catch(err => toast(`${icon('close')}<span>${esc(err.message)}</span>`));
  }
});
let scrollTick = false;
window.addEventListener('scroll', () => {
  if (scrollTick) return; scrollTick = true;
  requestAnimationFrame(() => { scrollTick = false; const y = window.scrollY; $('.hdr').classList.toggle('compact', y > 40); $('#totop').classList.toggle('show', y > 900); updateProgress(); });
}, { passive: true });

/* ---------- Nisja ---------- */
$('#rail').innerHTML = `<a href="#dyqani" data-rail="all" style="--i:0">${icon('grid')}<span>Gjithçka</span></a>` + CATS.map((c, i) => `<a href="#kategori-${c.id}" data-rail="${c.id}" style="--i:${i + 1}">${icon(c.ic)}<span>${c.short}</span></a>`).join('');
window.addEventListener('hashchange', () => route());
renderCart(); renderWishN(); renderAccountUI(); route(); setInterval(tick, 1000);
if (!store.get('ub-notice', 0)) setTimeout(() => { $('#notice').hidden = false; }, 1500);
})();
