// Decides what paid content a student (identified by email) may access.
// Reads purchases.json: each record grants either one course forever, or an
// all-access pass until expiresAt. Expired passes are lazily downgraded.
const { readJSON, writeJSON } = require('./store');

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

// True if the student owns this course outright, or holds a live all-access pass.
function hasAccess(email, courseId) {
  return activePurchases(email).some(
    (p) => (p.type === 'course' && p.courseId === courseId) || p.type === 'all-access'
  );
}

// Slugs/ids a student can access right now (for "My Courses"); allAccess flag too.
function entitlementsFor(email, courses) {
  const active = activePurchases(email);
  const allAccess = active.some((p) => p.type === 'all-access');
  const owned = new Set(active.filter((p) => p.type === 'course').map((p) => p.courseId));
  const list = (courses || []).filter((c) => allAccess || owned.has(c.id));
  return { allAccess, ownedCourseIds: [...owned], courses: list };
}

module.exports = { hasAccess, activePurchases, entitlementsFor, pruneExpired, norm };
