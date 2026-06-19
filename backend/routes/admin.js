// Admin API: auth-protected CRUD, subscribers, analytics, and bulk email.
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();

// ---------- File uploads ----------
const { UPLOAD_DIR } = require('../lib/paths');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+/, '');
    cb(null, Date.now() + '-' + safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const { readJSON, writeJSON } = require('../lib/store');
const { issue, requireAuth } = require('../lib/auth');
const { createTransporter, mailFrom, brandAttachments, smtpConfigured } = require('../lib/mailer');
const { getBroadcastTemplate, renderEmailBlocks } = require('../emailTemplates');
const { countryName, flagEmoji, suggestionFor } = require('../lib/geo');

// Subscribers live in DATA_DIR (persistent) via the shared store.
const readSubs = () => readJSON('subscribers.json', []);
const writeSubs = (s) => writeJSON('subscribers.json', s);

const slugify = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item-' + Date.now();

// ---------- Auth ----------
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const U = process.env.ADMIN_USER || 'admin';
  const P = process.env.ADMIN_PASS || 'perotech123';
  if (username === U && password === P) {
    return res.json({ token: issue(username), user: username });
  }
  res.status(401).json({ error: 'Invalid username or password' });
});

router.use(requireAuth); // everything below requires a valid token

router.get('/me', (req, res) => res.json({ user: req.admin.user }));

// Upload an image/file -> returns a site-relative path, original name and human size
const humanSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (n >= 10 || i === 0 ? Math.round(n) : Math.round(n * 10) / 10) + ' ' + u[i];
};
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    path: 'assets/uploads/' + req.file.filename,
    name: req.file.originalname,
    size: humanSize(req.file.size),
  });
});

// ---------- Generic collection CRUD (posts / motion / products) ----------
const COLLECTIONS = { posts: 'posts.json', motion: 'motion.json', products: 'products.json', services: 'services.json', timeline: 'timeline.json', tools: 'tools.json', videos: 'videos.json' };

Object.entries(COLLECTIONS).forEach(([name, file]) => {
  router.get(`/${name}`, (req, res) => res.json(readJSON(file, [])));

  router.post(`/${name}`, (req, res) => {
    const items = readJSON(file, []);
    const body = req.body || {};
    let id = body.id || body.slug || slugify(body.title);
    // ensure unique id
    let base = id, n = 2;
    while (items.some((i) => i.id === id)) id = base + '-' + n++;
    const item = { ...body, id };
    if (name === 'posts') item.slug = id;
    items.unshift(item);
    writeJSON(file, items);
    res.json(item);
  });

  router.put(`/${name}/:id`, (req, res) => {
    const items = readJSON(file, []);
    const idx = items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const merged = { ...items[idx], ...req.body, id: items[idx].id };
    if (name === 'posts') merged.slug = items[idx].id;
    items[idx] = merged;
    writeJSON(file, items);
    res.json(merged);
  });

  router.delete(`/${name}/:id`, (req, res) => {
    const items = readJSON(file, []);
    const next = items.filter((i) => i.id !== req.params.id);
    writeJSON(file, next);
    res.json({ ok: true, removed: items.length - next.length });
  });
});

// ---------- Settings ----------
router.get('/settings', (req, res) => res.json(readJSON('settings.json', {})));
router.put('/settings', (req, res) => {
  const merged = { ...readJSON('settings.json', {}), ...req.body };
  writeJSON('settings.json', merged);
  res.json(merged);
});

// ---------- Subscribers ----------
router.get('/subscribers', (req, res) => res.json(readSubs()));
router.delete('/subscribers/:id', (req, res) => {
  const subs = readSubs();
  const next = subs.filter((s) => String(s.id) !== String(req.params.id));
  writeSubs(next);
  res.json({ ok: true, removed: subs.length - next.length });
});

// ---------- Comments moderation ----------
router.get('/comments', (req, res) => {
  const all = readJSON('comments.json', []);
  const posts = readJSON('posts.json', []);
  const title = {};
  posts.forEach((p) => (title[p.slug || p.id] = p.title));
  res.json(all.slice().sort((a, b) => b.ts - a.ts).map((c) => ({ ...c, postTitle: title[c.postId] || c.postId })));
});
router.delete('/comments/:id', (req, res) => {
  const all = readJSON('comments.json', []);
  const next = all.filter((c) => c.id !== req.params.id);
  writeJSON('comments.json', next);
  res.json({ ok: true, removed: all.length - next.length });
});

// ---------- Chat leads ----------
router.get('/leads', (req, res) => {
  const leads = readJSON('leads.json', []).slice().sort((a, b) => (b.lastSeen || b.ts) - (a.lastSeen || a.ts));
  res.json(leads.map((l) => ({
    ...l,
    countryName: l.country ? countryName(l.country) : '',
    flag: l.country ? flagEmoji(l.country) : '',
  })));
});
router.delete('/leads/:id', (req, res) => {
  const all = readJSON('leads.json', []);
  const next = all.filter((l) => l.id !== req.params.id);
  writeJSON('leads.json', next);
  res.json({ ok: true, removed: all.length - next.length });
});

// ---------- Analytics / dashboard stats ----------
router.get('/stats', (req, res) => {
  const events = readJSON('analytics.json', []);
  const subs = readSubs();
  const dayMs = 86400000;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const visitsToday = events.filter((e) => e.ts >= todayMs).length;
  const uniqueVisitors = new Set(events.map((e) => e.ip)).size;

  // helpers for a 7-day window of any timestamped list
  const dayBuckets = (items, getTs) => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const start = d.getTime(), end = start + dayMs;
      out.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toISOString().slice(0, 10),
        count: items.filter((x) => { const t = getTs(x); return t >= start && t < end; }).length,
      });
    }
    return out;
  };
  const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : (cur > 0 ? 100 : 0));
  const inWindow = (items, getTs, from, to) => items.filter((x) => { const t = getTs(x); return t >= from && t < to; }).length;

  const subTs = (s) => new Date(s.date).getTime();
  const now = Date.now();
  const series = dayBuckets(events, (e) => e.ts);
  const uniqSeries = (() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const start = d.getTime(), end = start + dayMs;
      out.push({ label: series[6 - i].label, count: new Set(events.filter((e) => e.ts >= start && e.ts < end).map((e) => e.ip)).size });
    }
    return out;
  })();
  const subSeries = dayBuckets(subs, subTs);

  // deltas: last 7 days vs previous 7 days
  const v7 = inWindow(events, (e) => e.ts, now - 7 * dayMs, now);
  const vPrev7 = inWindow(events, (e) => e.ts, now - 14 * dayMs, now - 7 * dayMs);
  const u7 = new Set(events.filter((e) => e.ts >= now - 7 * dayMs).map((e) => e.ip)).size;
  const uPrev7 = new Set(events.filter((e) => e.ts >= now - 14 * dayMs && e.ts < now - 7 * dayMs).map((e) => e.ip)).size;
  const s7 = inWindow(subs, subTs, now - 7 * dayMs, now);
  const sPrev7 = inWindow(subs, subTs, now - 14 * dayMs, now - 7 * dayMs);

  // top pages
  const pageCounts = {};
  events.forEach((e) => { pageCounts[e.path] = (pageCounts[e.path] || 0) + 1; });
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count]) => ({ path, count }));

  const recent = events.slice(-12).reverse().map((e) => ({ path: e.path, ts: e.ts, ref: e.ref, country: e.country }));

  // ---- per-section content analytics ----
  const posts = readJSON('posts.json', []);
  const motion = readJSON('motion.json', []);
  const products = readJSON('products.json', []);
  const timeline = readJSON('timeline.json', []);
  const videos = readJSON('videos.json', []);
  const cnt = (re) => events.filter((e) => re.test(e.path || '')).length;

  const content = {
    posts: { count: posts.length, views: cnt(/^\/(blog\.html|article\.html)/) },
    motion: { count: motion.length, views: cnt(/^\/motion\.html/) },
    products: { count: products.length, views: cnt(/^\/products\.html/) },
    timeline: { count: timeline.length, views: cnt(/^\/($|index\.html)/) },
    videos: { count: videos.length, views: cnt(/^\/($|index\.html)/) },
    subscribers: { count: subs.length, views: cnt(/^\/newsletter\.html/) },
  };

  // most-viewed blog articles (from tracked /article.html?slug=…)
  const slugTitle = {}; posts.forEach((p) => (slugTitle[p.slug || p.id] = p.title));
  const artCounts = {};
  events.forEach((e) => {
    const m = (e.path || '').match(/article\.html\?slug=([^&]+)/);
    if (m) { const slug = decodeURIComponent(m[1]); artCounts[slug] = (artCounts[slug] || 0) + 1; }
  });
  const topArticles = Object.entries(artCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([slug, views]) => ({ slug, title: slugTitle[slug] || slug, views }));

  // ---- country aggregation (for the map) ----
  const byCountry = {};
  events.forEach((e) => {
    if (!e.country) return;
    const v = byCountry[e.country] || (byCountry[e.country] = { count: 0, ll: null });
    v.count++; if (e.ll) v.ll = e.ll;
  });
  const geoTotal = Object.values(byCountry).reduce((a, v) => a + v.count, 0);
  let countries = Object.entries(byCountry).map(([code, v]) => ({
    code, name: countryName(code), flag: flagEmoji(code), count: v.count,
    pct: geoTotal ? Math.round((v.count / geoTotal) * 100) : 0,
    lat: v.ll ? v.ll[0] : 0, lng: v.ll ? v.ll[1] : 0,
  })).sort((a, b) => b.count - a.count);
  const topCountry = countries[0] || null;
  const suggestion = suggestionFor(topCountry);
  countries = countries.slice(0, 8);

  res.json({
    totals: {
      visits: events.length, visitsToday, uniqueVisitors,
      subscribers: subs.length,
      posts: readJSON('posts.json', []).length,
      motion: readJSON('motion.json', []).length,
      products: readJSON('products.json', []).length,
    },
    sparks: { visits: series.map((d) => d.count), uniques: uniqSeries.map((d) => d.count), subs: subSeries.map((d) => d.count) },
    changes: { visits: pct(v7, vPrev7), uniques: pct(u7, uPrev7), subs: pct(s7, sPrev7) },
    series, topPages, recent,
    countries, geoTotal, suggestion,
    content, topArticles,
    mailReady: smtpConfigured(),
  });
});

// ---------- Bulk email ----------
router.post('/broadcast', async (req, res) => {
  const { subject, heading, body, blocks, recipientIds } = req.body || {};
  const hasBlocks = Array.isArray(blocks) && blocks.length;
  if (!subject || (!body && !hasBlocks)) return res.status(400).json({ error: 'Subject and message content are required' });

  let subs = readSubs();
  if (Array.isArray(recipientIds) && recipientIds.length) {
    subs = subs.filter((s) => recipientIds.map(String).includes(String(s.id)));
  }
  if (!subs.length) return res.status(400).json({ error: 'No recipients selected' });

  // Render rich content once (images become inline CID attachments shared by all sends).
  const baseUrl = process.env.PUBLIC_URL || (req.protocol + '://' + req.get('host'));
  let blockHtml = '', blockAttachments = [];
  if (hasBlocks) { const r = renderEmailBlocks(blocks, { baseUrl }); blockHtml = r.html; blockAttachments = r.attachments; }
  const bodyHtml = (body ? `<div>${body}</div>` : '') + blockHtml;
  const attachments = brandAttachments().concat(blockAttachments);

  let transporter;
  try { transporter = await createTransporter(); }
  catch (e) { return res.status(500).json({ error: 'Mail transport unavailable: ' + e.message }); }

  let sent = 0, failed = 0;
  const errors = [];
  for (const sub of subs) {
    try {
      await transporter.sendMail({
        from: mailFrom(),
        to: sub.email,
        subject,
        html: getBroadcastTemplate({ heading: heading || subject, bodyHtml, name: (sub.name || '').split(' ')[0] }),
        attachments,
      });
      sent++;
    } catch (e) {
      failed++;
      if (errors.length < 5) errors.push(`${sub.email}: ${e.message}`);
    }
  }
  res.json({ ok: true, sent, failed, total: subs.length, errors });
});

module.exports = router;
