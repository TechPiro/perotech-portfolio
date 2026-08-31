// Payment routes: Flutterwave (card / bank transfer) + crypto (manual). Mounted at /api/pay.
const express = require('express');
const router = express.Router();
const geoip = require('geoip-lite');
const { readJSON, writeJSON } = require('../lib/store');
const flutterwave = require('../lib/flutterwave');
const memberships = require('../lib/memberships');
const { requireStudent } = require('../lib/auth');
const {
  priceFor, chargeFor, usdToNgn, upsertStudent, buildAccessLink, sendAccessEmail, sendCryptoPending, norm,
  ensurePaymentPlan, tierFromPlanId, grantSubscription,
} = require('../lib/grant');

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COINS = ['BTC', 'USDT', 'SOL', 'ETH'];
const INTERVALS = ['monthly', 'yearly'];
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
// One-time purchases: courses, products, and the legacy all-access pass.
router.post('/flutterwave/init', async (req, res) => {
  const { type, courseId, productId } = req.body || {};
  const itemId = type === 'product' ? productId : courseId;
  const email = norm((req.body || {}).email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!allow(clientIp(req))) return res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
  if (!flutterwave.configured()) return res.status(503).json({ error: 'Card/transfer payments are not enabled yet. Try crypto.' });
  const p = priceFor(type, itemId);
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
      // Carry the item context so a failed/cancelled payment can return the
      // buyer to the right page with a helpful message.
      redirect_url: baseUrl(req) + '/api/pay/flutterwave/callback?ctx=' + encodeURIComponent(type === 'course' ? courseId : ''),
      meta: { type, courseId: type === 'course' ? courseId : null, productId: type === 'product' ? productId : null, planDays: p.planDays || null, email, usd: p.amount },
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

// ---------- Membership subscriptions (recurring) ----------
// Starts a tier checkout. When Flutterwave + a payment plan are available the
// card auto-renews each cycle; otherwise it falls back to a one-time charge that
// grants a renewable time-boxed membership (same as crypto/bank).
router.post('/subscription/init', async (req, res) => {
  const { tierId, interval } = req.body || {};
  const email = norm((req.body || {}).email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!allow(clientIp(req))) return res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
  if (!flutterwave.configured()) return res.status(503).json({ error: 'Card payments are not enabled yet. Try crypto.' });
  if (memberships.config().enabled === false) return res.status(503).json({ error: 'Memberships are not available right now.' });
  if (!INTERVALS.includes(interval)) return res.status(400).json({ error: 'Choose monthly or yearly billing.' });
  const spec = memberships.subscriptionPrice(tierId, interval);
  if (!spec) return res.status(400).json({ error: 'That plan is not available.' });
  try {
    const charge = chargeFor(spec.amount, countryOf(req)); // { currency, amount }
    const tx_ref = 'pt-sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    // Best-effort: create/reuse an auto-renewing plan for this currency. If it
    // fails (e.g. account without plans), fall back to a one-time charge.
    let planId = null;
    try { planId = await ensurePaymentPlan(tierId, spec.flwInterval, charge.currency, charge.amount); }
    catch (e) { console.warn('[subscription] plan unavailable, falling back to one-time:', e.message); }
    const init = await flutterwave.initPayment({
      amount: charge.amount, currency: charge.currency, tx_ref, email, title: spec.title,
      payment_options: charge.currency === 'NGN' ? 'card,account' : 'card',
      payment_plan: planId || undefined,
      redirect_url: baseUrl(req) + '/api/pay/flutterwave/callback?sub=1',
      meta: { type: 'subscription', tier: tierId, interval: spec.interval, planDays: spec.days, email, usd: spec.amount, autoRenew: !!planId },
    });
    if (init && init.data && init.data.link) {
      upsertStudent(email);
      return res.json({ link: init.data.link, currency: charge.currency, amount: charge.amount, autoRenew: !!planId });
    }
    return res.status(502).json({ error: (init && init.message) || 'Could not start checkout.' });
  } catch (err) {
    console.error('[subscription init]', err.message);
    res.status(502).json({ error: 'Could not reach the payment provider.' });
  }
});

// Current membership for the signed-in student.
router.get('/subscription/me', requireStudent, (req, res) => {
  const s = memberships.activeSubscription(req.student.email);
  res.json({ subscription: s ? publicSub(s) : null, tiers: memberships.publicConfig().tiers });
});

// Cancel auto-renew. Access remains until the current period ends.
router.post('/subscription/cancel', requireStudent, async (req, res) => {
  const subs = readJSON('subscriptions.json', []);
  const s = subs.find((x) => norm(x.email) === norm(req.student.email) && x.status === 'active');
  if (!s) return res.status(404).json({ error: 'No active membership to cancel.' });
  // Stop the recurring charge at Flutterwave when it's an auto-renewing card sub.
  if (s.provider === 'flutterwave' && s.flwPlanId) {
    try {
      const found = s.flwSubId ? { id: s.flwSubId } : await flutterwave.findSubscription(s.email, s.flwPlanId);
      if (found && found.id) await flutterwave.cancelSubscription(found.id);
    } catch (e) { console.warn('[subscription cancel] flw:', e.message); }
  }
  s.cancelAtPeriodEnd = true;
  s.updatedAt = Date.now();
  writeJSON('subscriptions.json', subs);
  res.json({ ok: true, subscription: publicSub(s) });
});

// Shape a subscription record for the client (no provider internals).
function publicSub(s) {
  const t = memberships.tierById(s.tier);
  return {
    tier: s.tier, tierTitle: t ? t.title : s.tier, rank: memberships.rankOf(s.tier),
    interval: s.interval, status: s.status, provider: s.provider,
    currentPeriodEnd: s.currentPeriodEnd || null, cancelAtPeriodEnd: !!s.cancelAtPeriodEnd,
    autoRenew: s.provider === 'flutterwave' && !!s.flwPlanId && !s.cancelAtPeriodEnd,
    amountUsd: s.amountUsd || 0, startedAt: s.createdAt || null,
  };
}

// Grant access from a verified Flutterwave transaction (idempotent by tx id).
// Handles one-time items (course/product/all-access) and recurring memberships.
async function grantFromFlutterwave(data, req) {
  if (data.status !== 'successful') return;
  const meta = data.meta || {};
  const email = norm(meta.email || (data.customer && data.customer.email));
  if (!email) { console.warn('[flutterwave] no buyer email for tx', data.id); return; }

  // ----- Membership subscription? Detected via the plan id (auto-renewals carry
  // no meta) or via meta.type on the first charge. -----
  const fromPlan = tierFromPlanId(data.payment_plan);
  if (fromPlan || meta.type === 'subscription') {
    const subs = readJSON('subscriptions.json', []);
    if (subs.some((x) => x.flwTxId && String(x.flwTxId) === String(data.id))) return; // already granted this charge
    const tier = (fromPlan && fromPlan.tierId) || meta.tier;
    const interval = (fromPlan && fromPlan.interval) || meta.interval || 'monthly';
    const spec = memberships.subscriptionPrice(tier, interval);
    if (!spec) { console.warn('[flutterwave] unknown membership tier for tx', data.id); return; }
    const exp = chargeFor(spec.amount, data.currency === 'NGN' ? 'NG' : 'XX');
    if (data.currency !== exp.currency || Number(data.amount) < exp.amount) { console.warn('[flutterwave] membership amount mismatch on tx', data.id); return; }
    grantSubscription({
      email, tier, interval, provider: 'flutterwave',
      flwPlanId: data.payment_plan || (memberships.tierById(tier) && (memberships.tierById(tier).flw || {})[`${interval}:${data.currency}`]) || null,
      flwTxId: String(data.id), amountUsd: spec.amount, days: spec.days,
    });
    try { await sendAccessEmail(email, spec.title, baseUrl(req), '/learn-dashboard'); }
    catch (e) { console.error('[flutterwave] membership email', e.message); }
    return;
  }

  // ----- One-time purchase (course / product / all-access) -----
  const purchases = readJSON('purchases.json', []);
  if (purchases.some((x) => x.flwId === String(data.id) || (data.tx_ref && x.flwRef === data.tx_ref))) return; // already granted
  const type = meta.type === 'all-access' ? 'all-access' : meta.type === 'product' ? 'product' : 'course';
  const itemId = type === 'product' ? meta.productId : meta.courseId;
  const p = priceFor(type, itemId);
  if (!p.ok) { console.warn('[flutterwave] invalid item for tx', data.id); return; }
  const exp = chargeFor(p.amount, data.currency === 'NGN' ? 'NG' : 'XX');
  if (data.currency !== exp.currency || Number(data.amount) < exp.amount) { console.warn('[flutterwave] amount/currency mismatch on tx', data.id); return; }
  const now = Date.now();
  const purchase = { id: 'pay' + now + Math.random().toString(36).slice(2, 6), email, type, method: 'card', provider: 'flutterwave', flwId: String(data.id), flwRef: data.tx_ref || '', amount: p.amount, currency: 'USD', charged: { currency: data.currency, amount: data.amount }, status: 'active', createdAt: now, approvedAt: now };
  if (type === 'course') purchase.courseId = itemId;
  else if (type === 'product') purchase.productId = itemId;
  else { purchase.planDays = p.planDays; purchase.expiresAt = now + (p.planDays || 30) * 86400000; }
  purchases.push(purchase);
  writeJSON('purchases.json', purchases);
  const next = type === 'course' ? '/learn/' + itemId : '/learn-dashboard';
  try { await sendAccessEmail(email, p.title, baseUrl(req), next); }
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
  // Subscriptions bounce back to the pricing page on failure; items to /learn.
  res.redirect((req.query.sub ? '/pricing' : backTo) + '?pay=failed');
});

// ---------- Crypto (manual) ----------
// Handles one-time items AND memberships. A membership pays for one term up front
// (renewable): it becomes an active subscription when the admin approves it.
router.post('/crypto/submit', async (req, res) => {
  const { type, courseId, productId, tierId, interval, coin, txHash } = req.body || {};
  const email = norm((req.body || {}).email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!allow(clientIp(req))) return res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
  if (!COINS.includes(coin)) return res.status(400).json({ error: 'Choose a valid coin.' });
  const tx = String(txHash || '').trim();
  if (tx.length < 6) return res.status(400).json({ error: 'Enter your transaction hash.' });

  let p, extra = {};
  if (type === 'subscription') {
    if (!INTERVALS.includes(interval)) return res.status(400).json({ error: 'Choose monthly or yearly billing.' });
    const spec = memberships.subscriptionPrice(tierId, interval);
    if (!spec) return res.status(400).json({ error: 'That plan is not available.' });
    p = { ok: true, amount: spec.amount, title: spec.title, planDays: spec.days };
    extra = { tier: tierId, interval: spec.interval };
  } else {
    const itemId = type === 'product' ? productId : courseId;
    p = priceFor(type, itemId);
    if (!p.ok) return res.status(400).json({ error: p.error });
    if (type === 'product') extra = { productId }; else if (type === 'course') extra = { courseId };
  }

  const purchases = readJSON('purchases.json', []);
  if (purchases.some((x) => x.txHash && x.txHash.toLowerCase() === tx.toLowerCase())) return res.status(400).json({ error: 'This transaction was already submitted.' });
  const now = Date.now();
  const purchase = { id: 'pay' + now + Math.random().toString(36).slice(2, 6), email, type, method: 'crypto', coin, txHash: tx, amount: p.amount, currency: 'USD', status: 'pending', createdAt: now, ...extra };
  if (type !== 'course' && type !== 'product') purchase.planDays = p.planDays;
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
