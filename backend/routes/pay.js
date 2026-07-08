// Payment routes: Flutterwave (card / bank transfer) + crypto (manual). Mounted at /api/pay.
const express = require('express');
const router = express.Router();
const geoip = require('geoip-lite');
const { readJSON, writeJSON } = require('../lib/store');
const flutterwave = require('../lib/flutterwave');
const { priceFor, chargeFor, usdToNgn, upsertStudent, buildAccessLink, sendAccessEmail, sendCryptoPending, norm } = require('../lib/grant');

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COINS = ['BTC', 'USDT', 'SOL', 'ETH'];
const baseUrl = (req) => (process.env.PUBLIC_URL || (req.protocol + '://' + req.get('host'))).replace(/\/+$/, '');
// Prefer Cloudflare's real client IP, then X-Forwarded-For, then the socket.
const clientIp = (req) => (req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '').replace(/^::ffff:/, '');

// Light per-IP rate limit (shared for init + crypto submit).
const hits = new Map();
function allow(ip) {
  const now = Date.now(), WIN = 10 * 60 * 1000, MAX = 12;
  const arr = (hits.get(ip) || []).filter((t) => now - t < WIN);
  if (arr.length >= MAX) { hits.set(ip, arr); return false; }
  arr.push(now); hits.set(ip, arr); return true;
}

// Cloudflare stamps every request with the visitor's country (CF-IPCountry).
// It's far more reliable than a bundled GeoIP database — especially for Nigerian
// mobile/ISP and IPv6 ranges — so we trust it first. "XX"/"T1" mean unknown/Tor.
const cfCountry = (req) => { const c = String(req.headers['cf-ipcountry'] || '').toUpperCase(); return (c.length === 2 && c !== 'XX' && c !== 'T1') ? c : ''; };
// Detect the buyer's country: DEV override (local only) → Cloudflare → GeoIP.
const countryOf = (req) => (process.env.DEV_FORCE_COUNTRY || cfCountry(req) || (geoip.lookup(clientIp(req)) || {}).country || '').toUpperCase();

// Rails that are live + the buyer's detected country + NGN rate (for showing an
// "≈ ₦X" estimate to Nigerian buyers). Prices themselves are always shown in USD.
// Never cache — the country is per-visitor and must not be served stale.
router.get('/config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ flutterwave: flutterwave.configured(), country: countryOf(req), ngnRate: usdToNgn() });
});

// Diagnostic: shows how the server sees the caller's location (no secrets).
// Handy for confirming Cloudflare geo works: visit /api/pay/whereami.
router.get('/whereami', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    resolvedCountry: countryOf(req),
    cfIpCountry: req.headers['cf-ipcountry'] || null,
    geoipCountry: (geoip.lookup(clientIp(req)) || {}).country || null,
    ip: clientIp(req),
    wouldChargeIn: chargeFor(1, countryOf(req)).currency,
  });
});

// ---------- Flutterwave (card / bank transfer / USSD, NG + international) ----------
router.post('/flutterwave/init', async (req, res) => {
  const { type, courseId } = req.body || {};
  const email = norm((req.body || {}).email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!allow(clientIp(req))) return res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
  if (!flutterwave.configured()) return res.status(503).json({ error: 'Card/transfer payments are not enabled yet. Try crypto.' });
  const p = priceFor(type, courseId);
  if (!p.ok) return res.status(400).json({ error: p.error });
  if (p.amount <= 0) return res.status(400).json({ error: 'This item is free — no payment needed.' });
  try {
    // Buyer country is detected from their IP only (no manual choice). Nigeria
    // pays NGN (unlocks bank transfer); everyone else pays USD.
    const charge = chargeFor(p.amount, countryOf(req)); // { currency, amount }
    const options = charge.currency === 'NGN' ? 'card,banktransfer,ussd,account' : 'card';
    const tx_ref = 'pt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const init = await flutterwave.initPayment({
      amount: charge.amount, currency: charge.currency, tx_ref, email, title: p.title,
      payment_options: options,
      // Carry the course context so a failed/cancelled payment can return the
      // buyer to the right course page with a helpful message.
      redirect_url: baseUrl(req) + '/api/pay/flutterwave/callback?ctx=' + encodeURIComponent(type === 'course' ? courseId : ''),
      meta: { type, courseId: type === 'course' ? courseId : null, planDays: p.planDays || null, email, usd: p.amount },
    });
    if (init && init.data && init.data.link) {
      upsertStudent(email);
      return res.json({ link: init.data.link, currency: charge.currency, amount: charge.amount });
    }
    return res.status(502).json({ error: (init && init.message) || 'Could not start checkout.' });
  } catch (err) {
    console.error('[flutterwave init]', err.message);
    res.status(502).json({ error: 'Could not reach the payment provider.' });
  }
});

// Grant access from a verified Flutterwave transaction (idempotent by tx id).
async function grantFromFlutterwave(data, req) {
  const purchases = readJSON('purchases.json', []);
  if (purchases.some((x) => x.flwId === String(data.id) || (data.tx_ref && x.flwRef === data.tx_ref))) return; // already granted
  if (data.status !== 'successful') return;
  const meta = data.meta || {};
  const type = meta.type === 'all-access' ? 'all-access' : 'course';
  const courseId = meta.courseId || null;
  const p = priceFor(type, courseId);
  if (!p.ok) { console.warn('[flutterwave] invalid item for tx', data.id); return; }
  // Recompute the expected charge in the currency the buyer actually paid in.
  const exp = chargeFor(p.amount, data.currency === 'NGN' ? 'NG' : 'XX');
  if (data.currency !== exp.currency || Number(data.amount) < exp.amount) { console.warn('[flutterwave] amount/currency mismatch on tx', data.id); return; }
  const email = norm(meta.email || (data.customer && data.customer.email));
  if (!email) { console.warn('[flutterwave] no buyer email for tx', data.id); return; }
  const now = Date.now();
  const purchase = { id: 'pay' + now + Math.random().toString(36).slice(2, 6), email, type, method: 'card', provider: 'flutterwave', flwId: String(data.id), flwRef: data.tx_ref || '', amount: p.amount, currency: 'USD', charged: { currency: data.currency, amount: data.amount }, status: 'active', createdAt: now, approvedAt: now };
  if (type === 'course') purchase.courseId = courseId;
  else { purchase.planDays = p.planDays; purchase.expiresAt = now + (p.planDays || 30) * 86400000; }
  purchases.push(purchase);
  writeJSON('purchases.json', purchases);
  try { await sendAccessEmail(email, p.title, baseUrl(req), type === 'course' ? '/learn/' + courseId : '/learn-dashboard'); }
  catch (e) { console.error('[flutterwave] access email', e.message); }
}

router.post('/flutterwave/webhook', async (req, res) => {
  if (!flutterwave.verifyWebhook(req.headers['verif-hash'])) return res.sendStatus(401);
  const evt = req.body;
  const id = evt && evt.data && evt.data.id;
  if (id) {
    try {
      const v = await flutterwave.verifyTransaction(id); // re-verify server-side
      if (v && v.status === 'success' && v.data) await grantFromFlutterwave(v.data, req);
    } catch (e) { console.error('[flutterwave webhook]', e.message); }
  }
  res.sendStatus(200);
});

router.get('/flutterwave/callback', async (req, res) => {
  const id = req.query.transaction_id;
  const status = req.query.status;
  // Where to send the buyer if the payment didn't complete (course page if known).
  const backTo = req.query.ctx ? '/learn/' + encodeURIComponent(req.query.ctx) : '/learn';
  if (!id || status === 'cancelled') return res.redirect(backTo + '?pay=cancelled');
  try {
    const v = await flutterwave.verifyTransaction(id);
    if (v && v.status === 'success' && v.data && v.data.status === 'successful') {
      await grantFromFlutterwave(v.data, req);
      const meta = v.data.meta || {};
      const next = meta.type === 'course' && meta.courseId ? '/learn/' + meta.courseId : '/learn-dashboard';
      return res.redirect(buildAccessLink(baseUrl(req), norm(meta.email || (v.data.customer && v.data.customer.email)), next)); // sign them in
    }
  } catch (e) { console.error('[flutterwave callback]', e.message); }
  res.redirect(backTo + '?pay=failed');
});

// ---------- Crypto (manual) ----------
router.post('/crypto/submit', async (req, res) => {
  const { type, courseId, coin, txHash } = req.body || {};
  const email = norm((req.body || {}).email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!allow(clientIp(req))) return res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
  if (!COINS.includes(coin)) return res.status(400).json({ error: 'Choose a valid coin.' });
  const tx = String(txHash || '').trim();
  if (tx.length < 6) return res.status(400).json({ error: 'Enter your transaction hash.' });
  const p = priceFor(type, courseId);
  if (!p.ok) return res.status(400).json({ error: p.error });
  const purchases = readJSON('purchases.json', []);
  if (purchases.some((x) => x.txHash && x.txHash.toLowerCase() === tx.toLowerCase())) return res.status(400).json({ error: 'This transaction was already submitted.' });
  const now = Date.now();
  const purchase = { id: 'pay' + now + Math.random().toString(36).slice(2, 6), email, type, method: 'crypto', coin, txHash: tx, amount: p.amount, currency: 'USD', status: 'pending', createdAt: now };
  if (type === 'course') purchase.courseId = courseId; else purchase.planDays = p.planDays;
  purchases.push(purchase);
  writeJSON('purchases.json', purchases);
  upsertStudent(email);
  try { await sendCryptoPending(email, p.title, coin, tx); } catch (e) { console.error('[crypto pending email]', e.message); }
  res.json({ ok: true, id: purchase.id });
});

// Poll a submitted crypto payment's status (used by the "confirming" screen).
// Returns only the status — no emails / tx data leaked.
router.get('/crypto/status', (req, res) => {
  const p = readJSON('purchases.json', []).find((x) => x.id === String(req.query.id || ''));
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ status: p.status });
});

module.exports = router;
