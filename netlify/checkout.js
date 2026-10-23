function checkoutView() {
  if (!cart.length) return `<div class="wrap page">${crumbs(['Arka'])}${empty('cart', 'Shporta jote është bosh', 'Shto produkte në shportë për të vazhduar me porosinë.', 'dyqani', 'Fillo blerjen')}</div>`;
  const u = me(), a = u?.address || {};
  return `<div class="wrap">
    ${crumbs(['Arka'])}
    <h1 class="page-h" style="margin:10px 0 14px">Përfundo porosinë</h1>
    <ol class="steps"><li class="done">Shporta</li><li class="on">Dërgesa dhe pagesa</li><li>Konfirmimi</li></ol>
    <div class="co">
      <form class="co-form" id="co-form" novalidate>
        <section class="box"><h2><span class="n">1</span>Ku ta dërgojmë?</h2>
          <div class="grid2">
            ${field('co-name', 'Emri dhe mbiemri', 'required autocomplete="name" placeholder="p.sh. Arta Krasniqi"', 'Shkruaj emrin dhe mbiemrin.', '', u?.name || '')}
            ${field('co-phone', 'Numri i telefonit', 'type="tel" required autocomplete="tel" inputmode="tel" placeholder="+383 4x xxx xxx"', 'Shkruaj një numër telefoni të saktë.', '', u?.phone || '')}
            <div class="field"><label for="co-country">Shteti</label><select id="co-country" autocomplete="country">${countryOpts(a.country || 'ks')}</select></div>
            ${field('co-city', 'Qyteti', 'required autocomplete="address-level2" placeholder="p.sh. Prishtinë"', 'Shkruaj qytetin.', '', a.city || '')}
            ${field('co-address', 'Adresa', 'required autocomplete="street-address" placeholder="Rruga, numri, hyrja, kati"', 'Shkruaj adresën që korrieri ta gjejë lehtë.', 'full', a.street || '')}
            ${field('co-email', 'Email <i>(opsional, për konfirmim)</i>', 'type="email" autocomplete="email" placeholder="emri@shembull.com"', 'Ky email nuk duket i saktë.', 'full', u?.email || '')}
            <div class="field full"><label for="co-note">Shënim për korrierin <i>(opsional)</i></label><textarea id="co-note" placeholder="p.sh. Më telefononi para se të vini"></textarea></div>
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
            <label class="opt"><input type="radio" name="pay" value="paypal"><span><b>PayPal</b><small>Paguaj tani me llogarinë tënde PayPal, në faqen e sigurt të PayPal</small></span><span class="pp-mark" aria-hidden="true">Pay<b>Pal</b></span></label>
          </div>
        </section>
      </form>
      <aside class="box co-sum" id="co-sum" aria-label="Përmbledhja e porosisë"></aside>
    </div>
  </div>`;
}
const payMethod = () => $('input[name="pay"]:checked')?.value || 'cod';
const r2 = v => Math.round(v * 100) / 100;
function totals() {
  const sub = r2(subtotal()), disc = coupon ? r2(sub * COUPONS[coupon]) : 0, ship = shipCost();
  return { sub, disc, ship, total: r2(sub - disc + ship) };
}
function renderSummary() {
  const box = $('#co-sum'); if (!box) return;
  const { sub, disc, ship, total } = totals(), pay = payMethod();
  const sp = $('#ship-std-p'); if (sp) sp.textContent = sub >= FREE ? 'Falas' : eur(SHIP.std);
  const action = pay === 'paypal'
    ? `<div class="pp-how"><b>Si paguhet me PayPal</b><ol><li>Kliko butonin e verdhë. Hapet faqja jonë e pagesës te PayPal.</li><li>Shkruaj shumën <b>${eur(total)}</b>.</li><li>Te shënimi shkruaj numrin e porosisë që të shfaqet.</li></ol></div>
       <button class="btn btn-lg btn-block pp-go" type="submit" form="co-form">Paguaj ${eur(total)} me <span class="pp-word">Pay<b>Pal</b></span></button>`
    : '<button class="btn btn-primary btn-lg btn-block" type="submit" form="co-form">Konfirmo porosinë</button>';
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
    <p class="sum-note">${icon('shield')} ${pay === 'paypal' ? 'Pagesa bëhet në faqen e sigurt të PayPal. Porosinë e nisim pasi të marrim pagesën.' : 'Paguan vetëm kur e merr pakon.'}</p>
    <ul class="co-trust"><li>${icon('shield')}Të dhënat përdoren vetëm për dërgesën</li><li>${icon('return')}Kthim falas brenda 14 ditëve</li><li>${icon('phone')}Ndihmë në shqip: ${CONTACT.phone}</li></ul>`;
}
function applyCoupon() {
  const v = ($('#co-coupon')?.value || '').trim().toUpperCase();
  if (COUPONS[v]) { coupon = v; toast(`${icon('check')}<span>Kodi ${v} u aplikua: −${COUPONS[v] * 100}%</span>`); }
  else { coupon = null; toast(`${icon('close')}<span>Ky kod nuk është i vlefshëm.</span>`); }
  renderSummary();
}
/* Kontrollon formularin dhe kthen porosinë me çmimet e produkteve në shportë */
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
  const country = $('#co-country').value, shipMethod = $('input[name="ship"]:checked')?.value || 'std', pay = payMethod();
  return {
    no: 'UB-' + (Math.floor(Math.random() * 900000) + 100000), date: Date.now(), ...totals(), coupon,
    items: cart.map(l => { const p = byId(l.id); return { id: l.id, name: p.name, q: l.q, size: l.size, price: p.price }; }),
    name: $('#co-name').value.trim(), phone: $('#co-phone').value.trim(), email: $('#co-email').value.trim(), country,
    city: $('#co-city').value.trim(), street: $('#co-address').value.trim(), note: $('#co-note').value.trim(),
    shipMethod, pay, payLabel: pay === 'paypal' ? 'PayPal (kontrollo pagesën te PayPal para dërgesës)' : 'Pagesë në dorëzim', eta: eta(country)
  };
}
/* Porosia dërgohet te Netlify Forms; Netlify ta dërgon në email */
async function sendOrder(o, paypalInfo = '') {
  const body = new URLSearchParams({
    'form-name': 'porosi', numri: o.no, emri: o.name, telefoni: o.phone, email: o.email,
    shteti: COUNTRIES[o.country].name, qyteti: o.city, adresa: o.street, shenimi: o.note,
    produktet: o.items.map(l => `${l.q} × ${l.name}${l.size ? ` (masa ${l.size})` : ''} = ${eur(l.price * l.q)}`).join('\n'),
    dergesa: `${o.shipMethod === 'exp' ? 'Ekspres' : 'Standarde'}: ${o.ship ? eur(o.ship) : 'Falas'}`,
    kuponi: o.coupon ? `${o.coupon} (−${eur(o.disc)})` : '', totali: eur(o.total), pagesa: o.payLabel, paypal: paypalInfo
  });
  if (location.protocol === 'file:') throw new Error('Porosia dërgohet vetëm kur faqja hapet nga adresa e Netlify (…netlify.app), jo nga skedari në kompjuter.');
  let r;
  try { r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }); }
  catch { throw new Error(`Porosia nuk u dërgua. Kontrollo internetin dhe provo përsëri, ose na telefono në ${CONTACT.phone}.`); }
  if (r.status === 404) throw new Error(`Porosia nuk u dërgua: formulari i porosive nuk është aktiv ende. Na telefono në ${CONTACT.phone}.`);
  if (!r.ok) throw new Error(`Porosia nuk u dërgua. Provo përsëri pas pak, ose na telefono në ${CONTACT.phone}.`);
}
function finishOrder(o) {
  const u = me();
  if (u) { orders.push({ ...o, email: u.email, pay: o.payLabel }); store.set('ub-orders', orders); }
  LAST = { ...o, first: o.name.split(/\s+/)[0], count: o.items.reduce((s, l) => s + l.q, 0) };
  cart = []; coupon = null; current = 'done'; saveCart(); go('porosia');
}
/* ---------- PayPal: lidhja e pagesës së dyqanit (paratë shkojnë direkt në llogarinë PayPal) ---------- */
const PAYPAL_LINK = 'https://www.paypal.com/ncp/payment/JRH4NJ9LURJPY';
let ordering = false;
async function placeOrder() {
  const o = collectOrder(); if (!o || ordering) return;
  /* Faqja e PayPal hapet menjëherë me klikimin, që shfletuesi të mos e bllokojë */
  const tab = o.pay === 'paypal' ? window.open(PAYPAL_LINK, '_blank') : null;
  if (tab) try { tab.opener = null; } catch {}
  ordering = true;
  const btn = $('button[form="co-form"]'), label = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.textContent = 'Po dërgohet porosia…'; }
  try { await sendOrder(o); o.paypalOpened = !!tab; finishOrder(o); }
  catch (e) { toast(`${icon('close')}<span>${esc(e.message)}</span>`); }
  finally { ordering = false; if (btn?.isConnected) { btn.disabled = false; btn.innerHTML = label; } }
}
function doneView() {
  if (!LAST) return null;
  const pp = LAST.pay === 'paypal';
  const amount = LAST.total.toFixed(2);
  return `<div class="wrap"><div class="ok-wrap">
    <span class="ok-ic">${icon('check')}</span>
    <h1 class="page-h">Faleminderit, ${esc(LAST.first)}!</h1>
    ${pp ? `<p class="lead">Porosia u ruajt. Tani përfundo pagesën te PayPal.</p>
    <div class="box pp-pay">
      <ol>
        <li>${LAST.paypalOpened ? 'Faqja e PayPal u hap në një skedë të re. Nëse nuk e sheh, kliko butonin më poshtë.' : 'Kliko butonin më poshtë për të hapur PayPal-in.'}</li>
        <li>Shkruaj shumën: <b>${eur(LAST.total)}</b> <button class="copy" type="button" data-copy="${amount}">${icon('copy')} Kopjo</button></li>
        <li>Te shënimi shkruaj numrin e porosisë: <b>${LAST.no}</b> <button class="copy" type="button" data-copy="${LAST.no}">${icon('copy')} Kopjo</button></li>
      </ol>
      <a class="btn btn-lg btn-block pp-go" href="${PAYPAL_LINK}" target="_blank" rel="noopener">Hap PayPal dhe paguaj ${eur(LAST.total)}</a>
      <small>Porosinë e nisim sapo të marrim pagesën. Nëse ke pyetje, na telefono në ${CONTACT.phone}.</small>
    </div>` : `<p class="lead">Porosia jote u pranua. Do të të telefonojmë në <b>${esc(LAST.phone)}</b> për ta konfirmuar.</p>`}
    <div class="box"><dl class="tot">
      <div><dt>Numri i porosisë</dt><dd>${LAST.no}</dd></div>
      <div><dt>Produkte</dt><dd>${LAST.count}</dd></div>
      <div><dt>Dërgesa në</dt><dd>${esc(LAST.city)}, ${COUNTRIES[LAST.country].name}</dd></div>
      <div><dt>Arrin rreth</dt><dd>${LAST.eta}</dd></div>
      <div><dt>Pagesa</dt><dd>${pp ? 'PayPal' : LAST.payLabel}</dd></div>
      <div class="grand"><dt>Totali</dt><dd>${eur(LAST.total)}</dd></div>
    </dl></div>
    <div class="hero-cta"><a class="btn btn-primary btn-lg" href="#dyqani">Vazhdo blerjen ${icon('arrow')}</a></div>
  </div></div>`;
}
