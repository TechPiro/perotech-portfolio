// Shared payment/access helpers: authoritative pricing, student upsert,
// access-granted + crypto-pending emails. Used by routes/pay.js and routes/admin.js.
const { readJSON, writeJSON } = require('./store');
const { norm } = require('./entitlements');
const { issueMagic } = require('./auth');
const { createTransporter, mailFrom, brandAttachments } = require('./mailer');
const { getAccessGrantedTemplate, getCryptoPendingTemplate } = require('../emailTemplates');

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
function priceFor(type, courseId) {
  if (type === 'all-access') {
    const aa = (readJSON('settings.json', {}).allAccess) || {};
    if (!aa.enabled) return { ok: false, error: 'The all-access pass is not available right now.' };
    return { ok: true, amount: Number(aa.price) || 0, planDays: Number(aa.days) || 30, title: 'All-access pass' };
  }
  const c = readJSON('courses.json', []).find((x) => x.id === courseId);
  if (!c || !c.published) return { ok: false, error: 'Course not found.' };
  if (c.allAccessOnly) return { ok: false, error: 'This course is available only via the all-access pass.' };
  return { ok: true, amount: Number(c.price) || 0, title: c.title };
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

module.exports = { priceFor, chargeFor, usdToNgn, upsertStudent, buildAccessLink, sendAccessEmail, sendCryptoPending, norm };
