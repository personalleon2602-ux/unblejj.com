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
            <label class="opt"><input type="radio" name="pay" value="paypal"><span><b>PayPal</b><small>Paguaj tani, në mënyrë të sigurt, me llogarinë tënde PayPal</small></span><span class="pp-mark" aria-hidden="true">Pay<b>Pal</b></span></label>
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
    ? '<div id="pp-btns" class="pp-btns"><p class="pp-wait">Po hapet PayPal…</p></div>'
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
    <p class="sum-note">${icon('shield')} ${pay === 'paypal' ? 'Pagesa bëhet në faqen e sigurt të PayPal. Ne nuk e shohim llogarinë tënde.' : 'Paguan vetëm kur e merr pakon.'}</p>
    <ul class="co-trust"><li>${icon('shield')}Të dhënat përdoren vetëm për dërgesën</li><li>${icon('return')}Kthim falas brenda 14 ditëve</li><li>${icon('phone')}Ndihmë në shqip: ${CONTACT.phone}</li></ul>`;
  if (pay === 'paypal') mountPaypal();
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
    shipMethod, pay, payLabel: pay === 'paypal' ? 'PayPal' : 'Pagesë në dorëzim', eta: eta(country)
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
  const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  if (!r.ok) throw new Error('Porosia nuk u dërgua. Kontrollo internetin dhe provo përsëri.');
}
function finishOrder(o) {
  const u = me();
  if (u) { orders.push({ ...o, email: u.email, pay: o.payLabel }); store.set('ub-orders', orders); }
  LAST = { ...o, first: o.name.split(/\s+/)[0], count: o.items.reduce((s, l) => s + l.q, 0) };
  cart = []; coupon = null; current = 'done'; saveCart(); go('porosia');
}
let ordering = false;
async function placeOrder() {
  if (payMethod() === 'paypal') { toast(`${icon('cash')}<span>Për të paguar me PayPal, kliko butonin e verdhë PayPal.</span>`); $('#pp-btns')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  const o = collectOrder(); if (!o || ordering) return;
  ordering = true;
  const btn = $('button[form="co-form"]'); if (btn) { btn.disabled = true; btn.textContent = 'Po dërgohet porosia…'; }
  try { await sendOrder(o); finishOrder(o); }
  catch (e) { toast(`${icon('close')}<span>${esc(e.message)}</span>`); }
  finally { ordering = false; if (btn?.isConnected) { btn.disabled = false; btn.textContent = 'Konfirmo porosinë'; } }
}

/* ---------- PayPal: paratë shkojnë direkt në llogarinë PayPal të dyqanit ---------- */
const PAYPAL_CLIENT_ID = 'BAAqMo787obOl9KpEOJkM-bJ5TbfsJfzEVXWc4_5ziyeoB11tbZLRnKEImU-NhtGxzPWCSCqussvbT3AHY';
let paypalLoad = null;
function loadPaypal() {
  if (window.paypal) return Promise.resolve();
  return paypalLoad ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&intent=capture&components=buttons&disable-funding=card,credit,paylater,sepa,bancontact,blik,eps,giropay,ideal,mybank,p24,sofort,venmo`;
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
  const m = v => ({ currency_code: 'EUR', value: Number(v).toFixed(2) });
  let cur = null;
  window.paypal.Buttons({
    fundingSource: window.paypal.FUNDING.PAYPAL,
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 50 },
    onClick: (data, actions) => (collectOrder() ? actions.resolve() : actions.reject()),
    /* Shuma = çmimi i produkteve × sasia + dërgesa − kuponi */
    createOrder: (data, actions) => {
      cur = collectOrder();
      return actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: cur.no, invoice_id: cur.no, description: `Porosia ${cur.no} në unblej`,
          amount: { ...m(cur.total), breakdown: { item_total: m(cur.sub), shipping: m(cur.ship), discount: m(cur.disc) } },
          items: cur.items.map(l => ({ name: `${l.name}${l.size ? ` (${l.size})` : ''}`.slice(0, 127), quantity: String(l.q), unit_amount: m(l.price), category: 'PHYSICAL_GOODS' }))
        }],
        application_context: { brand_name: 'unblej', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' }
      });
    },
    onApprove: async (data, actions) => {
      const d = await actions.order.capture();
      const cap = d.purchase_units?.[0]?.payments?.captures?.[0];
      cur.payLabel = 'PayPal · e paguar';
      try { await sendOrder(cur, `ID e pagesës: ${cap?.id || d.id} · ${cap?.amount?.value || cur.total} ${cap?.amount?.currency_code || 'EUR'}`); } catch {}
      finishOrder(cur);
    },
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
    <p class="lead">${paid ? 'Pagesa me PayPal u krye dhe porosia u pranua.' : `Porosia jote u pranua. Do të të telefonojmë në <b>${esc(LAST.phone)}</b> për ta konfirmuar.`}</p>
    <div class="box"><dl class="tot">
      <div><dt>Numri i porosisë</dt><dd>${LAST.no}</dd></div>
      <div><dt>Produkte</dt><dd>${LAST.count}</dd></div>
      <div><dt>Dërgesa në</dt><dd>${esc(LAST.city)}, ${COUNTRIES[LAST.country].name}</dd></div>
      <div><dt>Arrin rreth</dt><dd>${LAST.eta}</dd></div>
      <div><dt>Pagesa</dt><dd>${LAST.payLabel}</dd></div>
      <div class="grand"><dt>Totali</dt><dd>${eur(LAST.total)}</dd></div>
    </dl></div>
    <div class="hero-cta"><a class="btn btn-primary btn-lg" href="#dyqani">Vazhdo blerjen ${icon('arrow')}</a></div>
  </div></div>`;
}
