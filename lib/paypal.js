/* PayPal Checkout (REST API v2): krijimi dhe marrja e pagesës në server */
const base = () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
export const paypalEnabled = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

let cached = { token: null, exp: 0 };
async function accessToken() {
  if (cached.token && Date.now() < cached.exp - 60000) return cached.token;
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${base()}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!r.ok) throw new Error(`PayPal token ${r.status}`);
  const j = await r.json();
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cached.token;
}
async function call(path, body) {
  const r = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.details?.[0]?.description || j.message || `PayPal ${r.status}`), { paypal: j });
  return j;
}
const money = v => ({ currency_code: 'EUR', value: v.toFixed(2) });

export async function createPaypalOrder(o) {
  const j = await call('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: o.no,
      invoice_id: o.no,
      description: `Porosia ${o.no} në unblej`,
      amount: { ...money(o.total), breakdown: { item_total: money(o.sub), shipping: money(o.ship), discount: money(o.disc) } },
      items: o.items.map(l => ({ name: l.name.slice(0, 127) + (l.size ? ` (${l.size})` : ''), quantity: String(l.q), unit_amount: money(l.price), category: 'PHYSICAL_GOODS' }))
    }],
    payment_source: { paypal: { experience_context: { brand_name: 'unblej', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } } }
  });
  return j.id;
}

/* Kthen shumën e paguar, ose gabim nëse pagesa nuk u krye */
export async function capturePaypalOrder(id) {
  const j = await call(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`);
  const cap = j.purchase_units?.[0]?.payments?.captures?.[0];
  if (j.status !== 'COMPLETED' || !cap || cap.status !== 'COMPLETED') throw new Error('Pagesa me PayPal nuk u krye.');
  return { amount: Number(cap.amount.value), currency: cap.amount.currency_code, captureId: cap.id };
}
