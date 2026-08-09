// First-run data initialization.
//
// On a fresh server DATA_DIR is empty, so we populate it from the committed
// seed/ snapshot. This only ever fills in files that are MISSING — it never
// overwrites live data, so it is safe to run on every boot (including after a
// `git pull` deployment).
const fs = require('fs');
const path = require('path');
const { DATA_DIR, SEED_DIR, BACKEND_DIR, ensureDirs } = require('./paths');
const { uniqueShortId } = require('./ids');

const CONTENT_FILES = ['posts.json', 'motion.json', 'products.json', 'services.json', 'timeline.json', 'tools.json', 'videos.json', 'settings.json', 'courses.json', 'zentra.json'];

function copyIfMissing(name, fromDir) {
  const dest = path.join(DATA_DIR, name);
  if (fs.existsSync(dest)) return false;
  const src = path.join(fromDir, name);
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, dest);
  return true;
}

function writeIfMissing(name, value) {
  const dest = path.join(DATA_DIR, name);
  if (fs.existsSync(dest)) return false;
  fs.writeFileSync(dest, JSON.stringify(value, null, 2));
  return true;
}

function initData() {
  ensureDirs();
  const seeded = [];

  // Content: copy from the committed seed snapshot when absent.
  for (const name of CONTENT_FILES) {
    if (copyIfMissing(name, SEED_DIR)) seeded.push(name);
  }

  // Subscribers: migrate the legacy backend/subscribers.json once, else start empty.
  if (!fs.existsSync(path.join(DATA_DIR, 'subscribers.json'))) {
    const legacy = path.join(BACKEND_DIR, 'subscribers.json');
    if (fs.existsSync(legacy)) {
      fs.copyFileSync(legacy, path.join(DATA_DIR, 'subscribers.json'));
      seeded.push('subscribers.json (migrated)');
    } else if (copyIfMissing('subscribers.json', SEED_DIR)) {
      seeded.push('subscribers.json');
    } else if (writeIfMissing('subscribers.json', [])) {
      seeded.push('subscribers.json (empty)');
    }
  }

  // Learning platform: courses come from seed (or empty); students/purchases start empty.
  if (!fs.existsSync(path.join(DATA_DIR, 'courses.json')) && writeIfMissing('courses.json', [])) seeded.push('courses.json (empty)');
  if (writeIfMissing('students.json', [])) seeded.push('students.json (empty)');
  if (writeIfMissing('purchases.json', [])) seeded.push('purchases.json (empty)');

  // Analytics: always start empty if absent.
  if (writeIfMissing('analytics.json', [])) seeded.push('analytics.json (empty)');

  // Backfill short public ids on any existing posts that predate the feature.
  ensurePostShortIds();

  if (seeded.length) console.log('🌱 Initialized data files:', seeded.join(', '));
  return seeded;
}

// Give every blog post a short, unique public id (used in /blog/<shortId>).
// Idempotent: only writes when something was missing.
function ensurePostShortIds() {
  const file = path.join(DATA_DIR, 'posts.json');
  let posts;
  try { posts = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return; }
  if (!Array.isArray(posts)) return;
  const used = new Set(posts.map((p) => p.shortId).filter(Boolean));
  let changed = false;
  for (const p of posts) {
    if (!p.shortId) { p.shortId = uniqueShortId(used); used.add(p.shortId); changed = true; }
  }
  if (changed) { fs.writeFileSync(file, JSON.stringify(posts, null, 2)); console.log('🔗 Assigned short ids to', [...used].length, 'posts'); }
}

module.exports = { initData };
