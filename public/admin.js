/* Paneli i administrimit të unblej: porositë, produktet dhe klientët */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = v => { const [i, d] = (Math.round(v * 100) / 100).toFixed(2).split('.'); return i.replace(/\B(?=(\d{3})+$)/g, '.') + ',' + d + ' €'; };
const MON = ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gus', 'sht', 'tet', 'nën', 'dhj'];
const when = ts => { const d = new Date(ts), p = n => String(n).padStart(2, '0'); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`; };
const src = f => (!f ? '' : f.startsWith('/') ? f : `/assets/${f}`);
const CATS = { elektro: 'Elektro Shtëpiake', audio: 'Televizor & Audio', it: 'IT & Kompjuterë', telefon: 'Telefona & Ora', mobilje: 'Mobilje', veshje: 'Veshje', kepuce: 'Këpucë', femije: 'Fëmijë & Lodra', shtepiak: 'Artikuj Shtëpiak', vegla: 'Vegla Pune', kopsht: 'Kopsht', sport: 'Sport & Fitnes', kozmetike: 'Kozmetikë', market: 'Market' };
const COUNTRY = { ks: 'Kosovë', al: 'Shqipëri', mk: 'Maqedoni e Veriut' };

async function api(path, body, method) {
  const r = await fetch('/api' + path, { method: method || (body ? 'POST' : 'GET'), credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(data.error || 'Nuk u lidh dot me serverin.'), { status: r.status });
  return data;
}
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3000); }

let tab = 'home', STATUSES = {}, orderFilter = '', openOrder = null, ORDERS = [], PRODUCTS = [], pq = '', editing = null;
const view = $('#view');

/* ---------- Hyrja ---------- */
async function boot() {
  const { user } = await api('/me');
  if (!user?.admin) {
    $('#login').hidden = false; $('#tabs').hidden = true; view.innerHTML = '';
    $('#who').innerHTML = user ? `${esc(user.email)} nuk është administrator · <button type="button" data-logout>Dil</button>` : '';
    return;
  }
  $('#login').hidden = true; $('#tabs').hidden = false;
  $('#who').innerHTML = `${esc(user.name)} · <button type="button" data-logout>Dil</button>`;
  show(location.hash.slice(1) || 'home');
}
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#l-err'); err.hidden = true;
  try { await api('/auth/login', { email: $('#l-email').value.trim(), password: $('#l-pass').value }); boot(); }
  catch (x) { err.textContent = x.message; err.hidden = false; }
});

/* ---------- Navigimi ---------- */
function show(t) {
  tab = ['home', 'orders', 'products', 'customers'].includes(t) ? t : 'home';
  history.replaceState(null, '', '#' + tab);
  $$('#tabs [data-tab]').forEach(b => b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  ({ home: home, orders: orders, products: products, customers: customers })[tab]();
}

async function home() {
  view.innerHTML = '<p class="empty">Po ngarkohet…</p>';
  const [s, o] = await Promise.all([api('/admin/stats'), api('/admin/orders?status=new')]);
  badge(s.waiting);
  STATUSES = o.statuses; ORDERS = o.orders;
  view.innerHTML = `<div class="h"><h1>Përmbledhja</h1><a class="btn" href="/" target="_blank" rel="noopener">Hap dyqanin ↗</a></div>
    <div class="cards">
      <div class="card hot"><small>Presin konfirmim</small><b>${s.waiting}</b></div>
      <div class="card"><small>Porosi sot</small><b>${s.today.n}</b></div>
      <div class="card"><small>Shitje sot</small><b>${eur(s.today.s)}</b></div>
      <div class="card"><small>Shitje gjithsej</small><b>${eur(s.all.s)}</b></div>
      <div class="card"><small>Klientë</small><b>${s.customers}</b></div>
      <div class="card"><small>Abonentë</small><b>${s.subscribers}</b></div>
    </div>
    <div class="box"><h2>Porositë që presin konfirmim</h2>${o.orders.length ? orderTable(o.orders) : '<p class="empty">Nuk ka porosi të reja. Kur dikush porosit, del këtu dhe merr njoftim në email.</p>'}</div>`;
}
function badge(n) { const b = $('#badge-new'); b.textContent = n; b.hidden = !n; }

/* ---------- Porositë ---------- */
async function orders() {
  view.innerHTML = '<p class="empty">Po ngarkohen porositë…</p>';
  const r = await api('/admin/orders' + (orderFilter ? `?status=${orderFilter}` : ''));
  STATUSES = r.statuses; ORDERS = r.orders;
  const filters = [['', 'Të gjitha'], ...Object.entries(STATUSES).filter(([k]) => k !== 'pending_payment')];
  view.innerHTML = `<div class="h"><h1>Porositë</h1><div class="filters">${filters.map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${k === orderFilter}">${l}</button>`).join('')}</div></div>
    <div class="box">${ORDERS.length ? orderTable(ORDERS) : '<p class="empty">Nuk ka porosi me këtë status.</p>'}</div>`;
}
function orderTable(list) {
  return `<div class="tbl-wrap"><table><thead><tr><th>Porosia</th><th>Klienti</th><th>Produkte</th><th>Totali</th><th>Pagesa</th><th>Statusi</th><th></th></tr></thead><tbody>
    ${list.map(o => `<tr class="${openOrder === o.no ? 'open' : ''}">
      <td><b>${o.no}</b><small>${when(o.date)}</small></td>
      <td>${esc(o.name)}<small>${esc(o.phone)} · ${esc(o.city)}</small></td>
      <td class="num">${o.items.reduce((s, l) => s + l.q, 0)}</td>
      <td class="num"><b>${eur(o.total)}</b></td>
      <td>${o.pay === 'paypal' ? `<span class="pill paid">PayPal · e paguar</span>${o.verify ? '<small>Kontrolloje te PayPal para dërgesës</small>' : ''}` : esc(o.payLabel)}</td>
      <td><select class="status" data-status="${o.no}" aria-label="Statusi i ${o.no}">${Object.entries(STATUSES).filter(([k]) => k !== 'pending_payment').map(([k, l]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><button class="btn sm" type="button" data-open-order="${o.no}">${openOrder === o.no ? 'Mbyll' : 'Detajet'}</button></td>
    </tr>${openOrder === o.no ? `<tr><td colspan="7" style="padding:0">${orderDetail(o)}</td></tr>` : ''}`).join('')}
  </tbody></table></div>`;
}
function orderDetail(o) {
  return `<div class="detail">
    <div><h3>Produktet</h3><ul>${o.items.map(l => `<li><span>${l.q} × ${esc(l.name)}${l.size ? ` · Masa ${l.size}` : ''}</span><b>${eur(l.price * l.q)}</b></li>`).join('')}
      <li><span>Nëntotali</span><span>${eur(o.sub)}</span></li>${o.disc ? `<li><span>Zbritja ${esc(o.coupon)}</span><span>−${eur(o.disc)}</span></li>` : ''}<li><span>Dërgesa (${o.ship_method === 'exp' ? 'ekspres' : 'standarde'})</span><span>${o.ship ? eur(o.ship) : 'Falas'}</span></li><li><b>Totali</b><b>${eur(o.total)}</b></li></ul></div>
    <div><h3>Dërgesa</h3><p>${esc(o.name)}<br>${esc(o.street)}<br>${esc(o.city)}, ${COUNTRY[o.country] || ''}<br>Tel: ${esc(o.phone)}<br>Email: ${esc(o.email)}</p>${o.note ? `<h3>Shënimi</h3><p>${esc(o.note)}</p>` : ''}</div>
    <div><h3>Pagesa</h3><p>${esc(o.payLabel)}${o.captureId ? `<br>ID e pagesës PayPal: <b>${esc(o.captureId)}</b>` : ''}${o.verify ? '<br>Gjeje këtë ID te paypal.com → Aktiviteti dhe sigurohu që pagesa ka ardhur para se ta nisësh porosinë.' : ''}<br>Arrin rreth: ${esc(o.eta)}</p></div>
  </div>`;
}

/* ---------- Produktet ---------- */
async function products() {
  view.innerHTML = '<p class="empty">Po ngarkohen produktet…</p>';
  PRODUCTS = (await api('/admin/products')).products;
  renderProducts();
}
function renderProducts() {
  const q = pq.toLowerCase(), list = PRODUCTS.filter(p => !q || `${p.name} ${p.brand} ${CATS[p.cat]}`.toLowerCase().includes(q));
  view.innerHTML = `<div class="h"><h1>Produktet</h1><div class="filters"><input class="search" id="pq" placeholder="Kërko produkt…" value="${esc(pq)}" aria-label="Kërko produkt"><button class="btn primary" type="button" data-new-product>+ Produkt i ri</button></div></div>
    <div class="box"><div class="tbl-wrap"><table><thead><tr><th></th><th>Produkti</th><th>Kategoria</th><th>Çmimi</th><th>Stoku</th><th>Statusi</th><th></th></tr></thead><tbody>
    ${list.map(p => `<tr>
      <td><img class="thumb" src="${src(p.img || p.imgs?.[0])}" alt=""></td>
      <td><b>${esc(p.name)}</b><small>${esc(p.brand || '')} · #${p.id}</small></td>
      <td>${CATS[p.cat] || esc(p.cat)}</td>
      <td class="num"><b>${eur(p.price)}</b>${p.old ? `<small><s>${eur(p.old)}</s></small>` : ''}</td>
      <td class="num">${typeof p.stock === 'number' ? (p.stock === 0 ? '<span class="pill off">0 · pa stok</span>' : p.stock) : '<small>pa kufi</small>'}</td>
      <td>${p.active ? '<span class="pill confirmed">Në shitje</span>' : '<span class="pill off">Jo në shitje</span>'}</td>
      <td><button class="btn sm" type="button" data-edit="${p.id}">Ndrysho</button></td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">Asnjë produkt.</td></tr>'}
    </tbody></table></div></div>`;
}
function openProduct(p) {
  editing = p ? p.id : null;
  const f = $('#pform');
  $('#pdlg-t').textContent = p ? 'Ndrysho produktin' : 'Produkt i ri';
  $('#p-cat').innerHTML = Object.entries(CATS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  $('#p-name').value = p?.name || ''; $('#p-cat').value = p?.cat || 'elektro'; $('#p-brand').value = p?.brand || '';
  $('#p-price').value = p?.price ?? ''; $('#p-old').value = p?.old ?? ''; $('#p-stock').value = typeof p?.stock === 'number' ? p.stock : '';
  $('#p-sizes').value = (p?.sizes || []).join(','); $('#p-desc').value = p?.desc || '';
  $('#p-feat').value = (p?.feat || []).join('\n');
  $('#p-specs').value = Object.entries(p?.specs || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  $$('fieldset input[value]', f).forEach(c => { c.checked = (p?.tags || []).includes(c.value); });
  $('#p-active').checked = p ? p.active : true;
  f.dataset.img = p?.img || ''; f.dataset.imgs = p?.imgs ? JSON.stringify(p.imgs) : '';
  preview(p?.img || p?.imgs?.[0]);
  $('#p-err').hidden = true;
  $('#pdlg').showModal();
}
function preview(img) { $('#p-preview').innerHTML = img ? `<img src="${src(img)}" alt="">` : '<span>Pa foto</span>'; }
$('#p-file').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const fd = new FormData(); fd.append('image', file);
  $('#p-preview').innerHTML = '<span>Po ngarkohet…</span>';
  const r = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  e.target.value = '';
  if (!r.ok) { preview($('#pform').dataset.img); toast(j.error || 'Fotoja nuk u ngarkua.'); return; }
  $('#pform').dataset.img = j.url; $('#pform').dataset.imgs = ''; preview(j.url);
});
$('#pform').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#p-err');
  const specs = {};
  $('#p-specs').value.split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) specs[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  const prev = PRODUCTS.find(p => p.id === editing);
  const body = {
    name: $('#p-name').value.trim(), cat: $('#p-cat').value, brand: $('#p-brand').value.trim(),
    price: $('#p-price').value, old: $('#p-old').value || null, stock: $('#p-stock').value,
    sizes: $('#p-sizes').value.split(',').map(s => s.trim()).filter(Boolean), desc: $('#p-desc').value.trim(),
    feat: $('#p-feat').value.split('\n').map(s => s.trim()).filter(Boolean), specs,
    tags: $$('fieldset input[value]', f).filter(c => c.checked).map(c => c.value), active: $('#p-active').checked,
    img: f.dataset.img || undefined, imgs: f.dataset.imgs ? JSON.parse(f.dataset.imgs) : undefined,
    rating: prev?.rating ?? 0, reviews: prev?.reviews ?? 0, sold: prev?.sold ?? 0
  };
  try {
    await api(editing ? `/admin/products/${editing}` : '/admin/products', body, editing ? 'PUT' : 'POST');
    $('#pdlg').close(); toast('Produkti u ruajt.'); products();
  } catch (x) { err.textContent = x.message; err.hidden = false; }
});

/* ---------- Klientët ---------- */
async function customers() {
  view.innerHTML = '<p class="empty">Po ngarkohen klientët…</p>';
  const r = await api('/admin/customers');
  view.innerHTML = `<div class="h"><h1>Klientët</h1></div>
    <div class="box"><h2>Llogaritë (${r.customers.length})</h2><div class="tbl-wrap"><table><thead><tr><th>Emri</th><th>Email</th><th>Telefoni</th><th>Porosi</th><th>Ka blerë</th><th>Që nga</th></tr></thead><tbody>
      ${r.customers.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td class="num">${c.orders}</td><td class="num">${eur(c.spent)}</td><td>${when(c.created)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Ende asnjë klient.</td></tr>'}
    </tbody></table></div></div>
    <div class="box" style="margin-top:18px"><h2>Abonentët e ofertave (${r.subscribers.length})</h2><div class="tbl-wrap"><table><thead><tr><th>Email</th><th>Data</th></tr></thead><tbody>
      ${r.subscribers.map(s => `<tr><td>${esc(s.email)}</td><td>${when(s.created)}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">Ende asnjë abonent.</td></tr>'}
    </tbody></table></div></div>`;
}

/* ---------- Ngjarjet ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.tab) show(d.tab);
  else if ('logout' in d) { await api('/auth/logout', {}); location.reload(); }
  else if ('filter' in d) { orderFilter = d.filter; openOrder = null; orders(); }
  else if (d.openOrder) {
    openOrder = openOrder === d.openOrder ? null : d.openOrder;
    const box = t.closest('.box'); box.innerHTML = (box.querySelector('h2')?.outerHTML || '') + orderTable(ORDERS);
  }
  else if ('newProduct' in d) openProduct(null);
  else if (d.edit) openProduct(PRODUCTS.find(p => p.id === +d.edit));
  else if ('close' in d) t.closest('dialog').close();
});
document.addEventListener('change', async e => {
  const s = e.target.closest('[data-status]'); if (!s) return;
  s.disabled = true;
  try {
    const r = await api(`/admin/orders/${s.dataset.status}`, { status: s.value }, 'PATCH');
    const o = ORDERS.find(x => x.no === r.order.no); if (o) Object.assign(o, r.order);
    toast(`${r.order.no}: ${r.order.statusLabel}. Klienti u njoftua me email.`);
    if (tab === 'home') home();
  } catch (x) { toast(x.message); } finally { s.disabled = false; }
});
document.addEventListener('input', e => { if (e.target.id === 'pq') { pq = e.target.value; renderProducts(); const i = $('#pq'); i.focus(); i.setSelectionRange(pq.length, pq.length); } });

boot().catch(x => { view.innerHTML = `<p class="empty">${esc(x.message)}</p>`; });
})();
