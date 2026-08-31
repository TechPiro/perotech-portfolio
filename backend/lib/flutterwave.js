// Flutterwave helper (Standard hosted checkout) — uses Node's global fetch.
// Supports cards + bank transfer / virtual account + USSD on the hosted page,
// for Nigerian and international customers.
const SECRET = () => process.env.FLW_SECRET_KEY || '';

async function initPayment({ amount, currency, tx_ref, email, redirect_url, meta, title, payment_options, payment_plan }) {
  const r = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + SECRET(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref, amount, currency: currency || 'USD', redirect_url,
      // Which methods the hosted checkout offers. Bank transfer / USSD only
      // actually render for NGN transactions; card works for USD + NGN.
      payment_options: payment_options || 'card',
      // When set, Flutterwave binds the card to this plan and auto-renews it.
      ...(payment_plan ? { payment_plan } : {}),
      customer: { email },
      customizations: { title: 'PeroTech', description: title || 'Course purchase' },
      meta,
    }),
  });
  const j = await r.json();
  if (!r.ok || j.status !== 'success') throw new Error((j && j.message) || ('Flutterwave error ' + r.status));
  return j; // { status:'success', data:{ link } }
}

async function verifyTransaction(id) {
  const r = await fetch('https://api.flutterwave.com/v3/transactions/' + encodeURIComponent(id) + '/verify', {
    headers: { Authorization: 'Bearer ' + SECRET() },
  });
  return r.json(); // { status, data:{ status, amount, currency, tx_ref, meta, customer } }
}

// Flutterwave signs webhooks with a secret hash you set in the dashboard,
// delivered in the "verif-hash" header. Compare against FLW_SECRET_HASH.
function verifyWebhook(headerHash) {
  const secret = process.env.FLW_SECRET_HASH || '';
  return !!secret && String(headerHash || '') === secret;
}

const configured = () => !!SECRET();

// ---------- Recurring (payment plans / subscriptions) ----------
// A payment plan defines an amount + interval; attaching its id to a payment
// makes Flutterwave auto-charge the saved card each interval (duration:0 = until
// cancelled). Plans are currency-specific, so we key cached ids by currency too.
async function createPaymentPlan({ amount, name, interval, currency }) {
  const r = await fetch('https://api.flutterwave.com/v3/payment-plans', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + SECRET(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, name, interval: interval || 'monthly', currency: currency || 'USD', duration: 0 }),
  });
  const j = await r.json();
  if (!r.ok || j.status !== 'success' || !j.data) throw new Error((j && j.message) || ('Flutterwave plan error ' + r.status));
  return j.data; // { id, name, amount, interval, currency, ... }
}

// Find the subscription id bound to a customer+plan so we can cancel it.
async function findSubscription(email, planId) {
  const url = 'https://api.flutterwave.com/v3/subscriptions?email=' + encodeURIComponent(email) +
    (planId ? '&plan=' + encodeURIComponent(planId) : '');
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + SECRET() } });
  const j = await r.json();
  const list = (j && j.data) || [];
  // Prefer an active subscription.
  return list.find((s) => String(s.status).toLowerCase() === 'active') || list[0] || null;
}

async function cancelSubscription(id) {
  const r = await fetch('https://api.flutterwave.com/v3/subscriptions/' + encodeURIComponent(id) + '/cancel', {
    method: 'PUT', headers: { Authorization: 'Bearer ' + SECRET() },
  });
  const j = await r.json();
  if (!r.ok || j.status !== 'success') throw new Error((j && j.message) || ('Flutterwave cancel error ' + r.status));
  return j.data;
}

module.exports = { initPayment, verifyTransaction, verifyWebhook, configured, createPaymentPlan, findSubscription, cancelSubscription };
