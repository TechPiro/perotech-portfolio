// Decides what paid content a student (identified by email) may access.
// Reads purchases.json: each record grants one course forever, one product
// forever, or an all-access pass until expiresAt. Expired passes are lazily
// downgraded. Subscription (tier) access is layered in via lib/memberships.
const { readJSON, writeJSON } = require('./store');
const { memberHasTier } = require('./memberships');

const norm = (e) => String(e || '').trim().toLowerCase();

// Mark any active all-access pass whose expiresAt has passed as 'expired'.
function pruneExpired(purchases) {
  const now = Date.now();
  let changed = false;
  for (const p of purchases) {
    if (p.status === 'active' && p.type === 'all-access' && p.expiresAt && p.expiresAt < now) {
      p.status = 'expired';
      changed = true;
    }
  }
  if (changed) writeJSON('purchases.json', purchases);
  return purchases;
}

function activePurchases(email) {
  const e = norm(email);
  const all = pruneExpired(readJSON('purchases.json', []));
  return all.filter((p) => norm(p.email) === e && p.status === 'active');
}

// True if the student owns this course outright, holds a live all-access pass,
// or the course is subscription-gated and their membership tier reaches it.
function hasAccess(email, courseId) {
  const c = readJSON('courses.json', []).find((x) => x.id === courseId);
  if (c && c.access === 'subscription' && memberHasTier(email, c.tier)) return true;
  return activePurchases(email).some(
    (p) => (p.type === 'course' && p.courseId === courseId) || p.type === 'all-access'
  );
}

// True if the student owns this product outright, or a subscription tier unlocks it.
function ownsProduct(email, productId) {
  return activePurchases(email).some((p) => p.type === 'product' && p.productId === productId);
}
// Whole-product access check honouring free / one-time / subscription gating.
function productAccess(email, product) {
  if (!product) return false;
  const mode = product.access || 'free';
  if (mode === 'free') return true;
  if (mode === 'subscription') return memberHasTier(email, product.tier);
  if (mode === 'onetime') return ownsProduct(email, product.id);
  return false;
}

// Slugs/ids a student can access right now (for "My Courses"); allAccess flag too.
// Subscription-gated courses the member's tier reaches are included automatically.
function entitlementsFor(email, courses) {
  const active = activePurchases(email);
  const allAccess = active.some((p) => p.type === 'all-access');
  const owned = new Set(active.filter((p) => p.type === 'course').map((p) => p.courseId));
  const list = (courses || []).filter(
    (c) => allAccess || owned.has(c.id) || (c.access === 'subscription' && memberHasTier(email, c.tier))
  );
  return { allAccess, ownedCourseIds: [...owned], courses: list };
}

// Products a student can access right now (for their dashboard). Only sellable
// products (one-time or subscription) are considered "owned"; free ones are open.
function ownedProducts(email, products) {
  return (products || []).filter((p) => {
    const mode = p.access || 'free';
    if (mode === 'onetime') return ownsProduct(email, p.id);
    if (mode === 'subscription') return memberHasTier(email, p.tier);
    return false;
  });
}

module.exports = {
  hasAccess, activePurchases, entitlementsFor, pruneExpired, norm,
  ownsProduct, productAccess, ownedProducts,
};
