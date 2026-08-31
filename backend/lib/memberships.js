// Recurring membership logic. Tiers are defined in memberships.json (admin-editable);
// live subscriptions live in subscriptions.json. Access is TIERED: a member can
// reach any content/product whose required tier rank is <= their active tier rank.
const { readJSON, writeJSON } = require('./store');

const norm = (e) => String(e || '').trim().toLowerCase();

// Renewals arrive by webhook; give a short grace window so a member isn't locked
// out in the hours between period end and the auto-charge landing.
const GRACE_MS = 2 * 86400000; // 2 days

function config() {
  const m = readJSON('memberships.json', {});
  if (!Array.isArray(m.tiers)) m.tiers = [];
  return m;
}
// Tiers sorted cheapest -> most expensive (by rank).
function tiers() {
  return config().tiers.slice().sort((a, b) => (a.rank || 0) - (b.rank || 0));
}
function tierById(id) {
  return tiers().find((t) => t.id === id) || null;
}
function rankOf(id) {
  const t = tierById(id);
  return t ? Number(t.rank) || 0 : 0;
}

// Server-authoritative price for a tier + interval (never trust the client).
function subscriptionPrice(tierId, interval) {
  const t = tierById(tierId);
  if (!t) return null;
  const yearly = interval === 'yearly';
  const amount = yearly ? Number(t.yearly) : Number(t.monthly);
  if (!(amount > 0)) return null;
  return {
    tier: tierId,
    interval: yearly ? 'yearly' : 'monthly',
    amount, // USD
    days: yearly ? 365 : 30,
    title: `${t.title} membership (${yearly ? 'yearly' : 'monthly'})`,
    flwInterval: yearly ? 'yearly' : 'monthly',
  };
}

// Mark active subscriptions past their grace window as expired (lazy, idempotent).
function pruneSubs(subs) {
  const now = Date.now();
  let changed = false;
  for (const s of subs) {
    if (s.status === 'active' && s.currentPeriodEnd && s.currentPeriodEnd + GRACE_MS < now) {
      s.status = 'expired';
      changed = true;
    }
  }
  if (changed) writeJSON('subscriptions.json', subs);
  return subs;
}

function allSubs() {
  return pruneSubs(readJSON('subscriptions.json', []));
}

// A subscription still granting access right now (active, within grace).
function isLive(s) {
  return s && s.status === 'active' && (!s.currentPeriodEnd || s.currentPeriodEnd + GRACE_MS >= Date.now());
}

// The member's current effective subscription: highest live tier, latest period.
function activeSubscription(email) {
  const e = norm(email);
  const mine = allSubs().filter((s) => norm(s.email) === e && isLive(s));
  if (!mine.length) return null;
  mine.sort((a, b) => rankOf(b.tier) - rankOf(a.tier) || (b.currentPeriodEnd || 0) - (a.currentPeriodEnd || 0));
  return mine[0];
}

function memberRank(email) {
  const s = activeSubscription(email);
  return s ? rankOf(s.tier) : 0;
}
// True when the member's active tier is at least the required tier.
function memberHasTier(email, requiredTierId) {
  if (!requiredTierId) return false;
  return memberRank(email) >= rankOf(requiredTierId);
}

// Public-facing tier data for the pricing page (no Flutterwave plan ids leaked).
function publicConfig() {
  const m = config();
  return {
    enabled: m.enabled !== false,
    heading: m.heading || 'Choose your plan',
    subheading: m.subheading || '',
    yearlyDiscountPct: Number(m.yearlyDiscountPct) || 20,
    tiers: tiers().map((t) => ({
      id: t.id, rank: t.rank, title: t.title, description: t.description || '',
      monthly: Number(t.monthly) || 0, yearly: Number(t.yearly) || 0,
      featured: !!t.featured, ctaText: t.ctaText || `Get ${t.title}`,
      features: Array.isArray(t.features) ? t.features : [],
    })),
  };
}

module.exports = {
  norm, config, tiers, tierById, rankOf, subscriptionPrice,
  pruneSubs, allSubs, activeSubscription, memberRank, memberHasTier, publicConfig,
};
