// Shared payment/access helpers: authoritative pricing, student upsert,
// access-granted + crypto-pending emails. Used by routes/pay.js and routes/admin.js.
const { readJSON, writeJSON } = require('./store');
const { norm } = require('./entitlements');
const { issueMagic } = require('./auth');
const { createTransporter, mailFrom, brandAttachments } = require('./mailer');
const { getAccessGrantedTemplate, getCryptoPendingTemplate } = require('../emailTemplates');
const memberships = require('./memberships');
const flutterwave = require('./flutterwave');

// Prices are stored/displayed in USD. This rate converts to NGN at charge time
// for Nigerian buyers (bank transfer requires NGN). Admin-editable in Settings.
const usdToNgn = () => Number(readJSON('settings.json', {}).usdToNgn) || Number(process.env.USD_TO_NGN) || 1600;

// Given a USD price + buyer country, decide the charge currency and amount.
// Nigeria -> NGN (unlocks bank transfer/USSD); everyone else -> USD (their card
// network converts USD to their local currency automatically).
function chargeFor(usdAmount, country) {
  if (String(country || '').toUpperCase() === 'NG') return { currency: 'NGN', amount: Math.round(usdAmount * usdToNgn()) };
  return { currency: 'USD', amount: Math.round(usdAmount * 100) / 100 };
}

// Server-side price (USD) — never trust an amount sent by the client.
// `id` is the courseId for courses / productId for products (unused otherwise).
function priceFor(type, id) {
  if (type === 'all-access') {
    const aa = (readJSON('settings.json', {}).allAccess) || {};
    if (!aa.enabled) return { ok: false, error: 'The all-access pass is not available right now.' };
    return { ok: true, amount: Number(aa.price) || 0, planDays: Number(aa.days) || 30, title: 'All-access pass' };
  }
  if (type === 'product') {
    const p = readJSON('products.json', []).find((x) => x.id === id);
    if (!p) return { ok: false, error: 'Product not found.' };
    if (p.access !== 'onetime') return { ok: false, error: 'This product is not sold individually.' };
    return { ok: true, amount: Number(p.price) || 0, title: p.title };
  }
  const c = readJSON('courses.json', []).find((x) => x.id === id);
  if (!c || !c.published) return { ok: false, error: 'Course not found.' };
  if (c.allAccessOnly) return { ok: false, error: 'This course is available only via the all-access pass.' };
  if (c.access === 'subscription') return { ok: false, error: 'This course is available with a membership.' };
  return { ok: true, amount: Number(c.price) || 0, title: c.title };
}

// ---------- Membership subscriptions ----------
// Ensure a Flutterwave payment plan exists for (tier, interval, currency) and
// return its id, caching it back into memberships.json so we create each once.
async function ensurePaymentPlan(tierId, interval, currency, chargeAmount) {
  const m = memberships.config();
  const tier = (m.tiers || []).find((t) => t.id === tierId);
  if (!tier) return null;
  tier.flw = tier.flw || {};
  const key = `${interval}:${currency}`;
  if (tier.flw[key]) return tier.flw[key];
  const plan = await flutterwave.createPaymentPlan({
    amount: chargeAmount,
    name: `PeroTech ${tier.title} (${interval}, ${currency})`,
    interval,
    currency,
  });
  tier.flw[key] = plan.id;
  writeJSON('memberships.json', m);
  return plan.id;
}

// Reverse-map a Flutterwave plan id back to { tierId, interval } — used to
// recognise auto-renewal charges arriving by webhook (they carry no meta).
function tierFromPlanId(planId) {
  const pid = String(planId || '');
  if (!pid) return null;
  for (const t of memberships.tiers()) {
    for (const [key, id] of Object.entries(t.flw || {})) {
      if (String(id) === pid) return { tierId: t.id, interval: key.split(':')[0] };
    }
  }
  return null;
}

// Create or extend a member's subscription. Idempotent per (email, provider ref):
// a duplicate flwTxId is ignored so replayed webhooks don't double-extend.
function grantSubscription({ email, tier, interval, provider, flwPlanId, flwSubId, flwTxId, amountUsd, status, days }) {
  email = norm(email);
  const subs = readJSON('subscriptions.json', []);
  if (flwTxId && subs.some((s) => s.flwTxId && String(s.flwTxId) === String(flwTxId))) {
    return subs.find((s) => String(s.flwTxId) === String(flwTxId));
  }
  const now = Date.now();
  const spec = memberships.subscriptionPrice(tier, interval) || {};
  const periodDays = Number(days) || spec.days || (interval === 'yearly' ? 365 : 30);
  // Reuse the member's existing record (upgrade / renew) instead of stacking.
  let s = subs.find((x) => norm(x.email) === email && x.status === 'active');
  const base = {
    email, tier, interval: interval || 'monthly', provider: provider || 'flutterwave',
    status: status || 'active', amountUsd: amountUsd != null ? amountUsd : spec.amount || 0,
    currentPeriodEnd: now + periodDays * 86400000, cancelAtPeriodEnd: false, updatedAt: now,
  };
  if (flwPlanId) base.flwPlanId = flwPlanId;
  if (flwSubId) base.flwSubId = flwSubId;
  if (flwTxId) base.flwTxId = flwTxId;
  if (s) {
    Object.assign(s, base);
  } else {
    s = { id: 'sub' + now + Math.random().toString(36).slice(2, 6), createdAt: now, ...base };
    subs.push(s);
  }
  writeJSON('subscriptions.json', subs);
  return s;
}

function upsertStudent(email, name) {
  email = norm(email);
  const students = readJSON('students.json', []);
  let s = students.find((x) => norm(x.email) === email);
  if (!s) { s = { id: 's' + Date.now() + Math.random().toString(36).slice(2, 6), email, name: name || '', createdAt: Date.now() }; students.push(s); writeJSON('students.json', students); }
  else if (name && !s.name) { s.name = name; writeJSON('students.json', students); }
  return s;
}

const cleanBase = (b) => String(b || '').replace(/\/+$/, '');
function buildAccessLink(baseUrl, email, next) {
  return cleanBase(baseUrl) + '/student-auth?token=' + encodeURIComponent(issueMagic(email)) + '&next=' + encodeURIComponent(next || '/learn-dashboard');
}

async function sendAccessEmail(email, itemTitle, baseUrl, next) {
  const s = upsertStudent(email);
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: mailFrom(), to: email, subject: 'Your PeroTech access is ready 🎉',
    html: getAccessGrantedTemplate({ name: s.name, itemTitle, link: buildAccessLink(baseUrl, email, next) }),
    attachments: brandAttachments(),
  });
}

async function sendCryptoPending(email, itemTitle, coin, txHash) {
  const s = upsertStudent(email);
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: mailFrom(), to: email, subject: 'We received your payment ⏳',
    html: getCryptoPendingTemplate({ name: s.name, itemTitle, coin, txHash }),
    attachments: brandAttachments(),
  });
}

module.exports = {
  priceFor, chargeFor, usdToNgn, upsertStudent, buildAccessLink, sendAccessEmail, sendCryptoPending, norm,
  ensurePaymentPlan, tierFromPlanId, grantSubscription,
};
