// Flutterwave helper (Standard hosted checkout) — uses Node's global fetch.
// Supports cards + bank transfer / virtual account + USSD on the hosted page,
// for Nigerian and international customers.
const SECRET = () => process.env.FLW_SECRET_KEY || '';

async function initPayment({ amount, currency, tx_ref, email, redirect_url, meta, title, payment_options }) {
  const r = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + SECRET(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref, amount, currency: currency || 'USD', redirect_url,
      // Which methods the hosted checkout offers. Bank transfer / USSD only
      // actually render for NGN transactions; card works for USD + NGN.
      payment_options: payment_options || 'card',
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

module.exports = { initPayment, verifyTransaction, verifyWebhook, configured };
