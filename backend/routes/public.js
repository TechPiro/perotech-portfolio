// Public API: content the frontend reads, plus visit tracking.
const express = require('express');
const router = express.Router();
const geoip = require('geoip-lite');
const { readJSON, writeJSON } = require('../lib/store');
const { chat } = require('../lib/chatbot');
const memberships = require('../lib/memberships');
const presence = require('../lib/presence');

// Shared client-IP + country resolution (Cloudflare header first, then GeoIP).
const clientIp = (req) => (req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '').replace(/^::ffff:/, '');
function geoOf(req) {
  const ip = clientIp(req);
  const geo = geoip.lookup(ip); // null on localhost/private
  const cf = String(req.headers['cf-ipcountry'] || '').toUpperCase();
  const country = (cf.length === 2 && cf !== 'XX' && cf !== 'T1') ? cf : (geo ? geo.country : null);
  return { ip, country, ll: geo ? geo.ll : null };
}
// Append an analytics event, keeping the store bounded (last 10k).
function pushEvent(ev) {
  const events = readJSON('analytics.json', []);
  events.push(ev);
  if (events.length > 10000) events.splice(0, events.length - 10000);
  writeJSON('analytics.json', events);
}

// Drafts (published === false) are hidden from the public; existing posts with
// no `published` field are treated as published for backward compatibility.
router.get('/posts', (req, res) => res.json(readJSON('posts.json', []).filter((p) => p.published !== false)));
router.get('/posts/:id', (req, res) => {
  const post = readJSON('posts.json', []).find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!post || post.published === false) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});
router.get('/motion', (req, res) => res.json(readJSON('motion.json', [])));
// Products: never expose the members-only deliverable url to the public — only
// the marketing fields + how the item is gated (free / one-time / subscription).
router.get('/products', (req, res) => {
  const list = readJSON('products.json', []).map((p) => {
    const { deliverable, ...rest } = p;
    return { ...rest, access: p.access || 'free', hasDeliverable: !!(deliverable && deliverable.url) };
  });
  res.json(list);
});

// Public membership tiers for the pricing page.
router.get('/memberships', (req, res) => res.json(memberships.publicConfig()));
router.get('/services', (req, res) => res.json(readJSON('services.json', [])));
router.get('/timeline', (req, res) => res.json(readJSON('timeline.json', [])));
router.get('/tools', (req, res) => res.json(readJSON('tools.json', [])));
router.get('/videos', (req, res) => res.json(readJSON('videos.json', [])));
router.get('/settings', (req, res) => res.json(readJSON('settings.json', {})));

// Zentra landing page content (public read; seeded defaults on first run).
router.get('/zentra', (req, res) => res.json(readJSON('zentra.json', {})));

// ---------- Blog likes ----------
// likes.json shape: { [postId]: ["visitorId", ...] }
router.get('/posts/:id/reactions', (req, res) => {
  const likes = readJSON('likes.json', {});
  const voters = likes[req.params.id] || [];
  const visitor = String(req.query.visitor || '');
  res.json({ count: voters.length, liked: visitor ? voters.includes(visitor) : false });
});
router.post('/posts/:id/like', (req, res) => {
  const visitor = String((req.body && req.body.visitorId) || '').slice(0, 64);
  if (!visitor) return res.status(400).json({ error: 'visitorId required' });
  const likes = readJSON('likes.json', {});
  const voters = new Set(likes[req.params.id] || []);
  let liked;
  if (voters.has(visitor)) { voters.delete(visitor); liked = false; }
  else { voters.add(visitor); liked = true; }
  likes[req.params.id] = [...voters];
  writeJSON('likes.json', likes);
  res.json({ count: voters.size, liked });
});

// ---------- Blog comments ----------
router.get('/posts/:id/comments', (req, res) => {
  const all = readJSON('comments.json', []);
  // Never expose stored visitor IPs to the public.
  const pub = all
    .filter((c) => c.postId === req.params.id)
    .sort((a, b) => b.ts - a.ts)
    .map(({ ip, ...rest }) => rest);
  res.json(pub);
});
router.post('/posts/:id/comments', (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 60);
  const text = String((req.body && req.body.text) || '').trim().slice(0, 2000);
  if (!name || !text) return res.status(400).json({ error: 'Name and comment are required' });
  const all = readJSON('comments.json', []);
  // Optional reply target — single-level threads (replies to a reply attach to its top parent).
  let parentId = String((req.body && req.body.parentId) || '').slice(0, 40) || null;
  if (parentId) {
    const parent = all.find((c) => c.id === parentId && c.postId === req.params.id);
    if (!parent) parentId = null;
    else if (parent.parentId) parentId = parent.parentId;
  }
  let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  ip = ip.replace(/^::ffff:/, '');
  const comment = { id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6), postId: req.params.id, name, text, ts: Date.now(), date: new Date().toISOString(), ip, parentId };
  all.push(comment);
  if (all.length > 20000) all.splice(0, all.length - 20000);
  writeJSON('comments.json', all);
  const { ip: _omit, ...pub } = comment;
  res.json(pub);
});

// ---------- Chatbot ----------
router.post('/chat', async (req, res) => {
  try {
    const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
    const name = String((req.body && req.body.name) || '').trim().slice(0, 80);
    // Log the visitor's latest question as a search signal (what people want).
    try {
      const lastUser = [...messages].reverse().find((m) => m && m.role === 'user' && m.content);
      if (lastUser) {
        const g = geoOf(req);
        pushEvent({ type: 'search', q: String(lastUser.content).slice(0, 120), source: 'chat', ip: g.ip, country: g.country, ts: Date.now() });
      }
    } catch (_) {}
    const result = await chat(messages, { name });
    res.json(result);
  } catch (e) {
    console.error('Chat error:', e.message);
    res.status(500).json({ reply: "Sorry — I hit a snag. Mind trying that again?", cards: [], suggestions: [] });
  }
});

// ---------- Chat leads (name + email + location) ----------
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
router.post('/lead', (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 80);
  const email = String((req.body && req.body.email) || '').trim().slice(0, 160);
  if (!name || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid name and email.' });

  let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  ip = ip.replace(/^::ffff:/, '');
  const geo = geoip.lookup(ip); // null on localhost/private IPs
  const loc = geo ? { country: geo.country, region: geo.region, city: geo.city, ll: geo.ll } : { country: null, region: null, city: null, ll: null };

  const leads = readJSON('leads.json', []);
  const now = Date.now();
  const firstMessage = String((req.body && req.body.firstMessage) || '').trim().slice(0, 400);
  const existing = leads.find((l) => (l.email || '').toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.name = name;
    existing.lastSeen = now;
    existing.chats = (existing.chats || 1) + 1;
    Object.assign(existing, loc, { ip });
    if (firstMessage && !existing.firstMessage) existing.firstMessage = firstMessage;
    writeJSON('leads.json', leads);
    return res.json({ ok: true, id: existing.id, returning: true });
  }
  const lead = { id: 'l' + now + Math.random().toString(36).slice(2, 6), name, email, ...loc, ip, firstMessage: firstMessage || '', chats: 1, ts: now, date: new Date().toISOString(), lastSeen: now };
  leads.push(lead);
  if (leads.length > 50000) leads.splice(0, leads.length - 50000);
  writeJSON('leads.json', leads);
  res.json({ ok: true, id: lead.id });
});

// ---------- Live presence (heartbeat) ----------
// The page pings this every ~15s. We keep an in-memory picture of who is on the
// site right now (path + device + country) for the admin "Live" panel.
router.post('/presence/ping', (req, res) => {
  const sid = String((req.body && req.body.sid) || '').slice(0, 64);
  if (!sid) return res.status(400).json({ error: 'sid required' });
  const g = geoOf(req);
  presence.ping(sid, {
    path: String((req.body && req.body.path) || '/').slice(0, 200),
    ua: req.headers['user-agent'] || '',
    ip: g.ip, country: g.country, ll: g.ll,
  });
  res.json({ ok: true });
});
// Beacon fired on page-hide so a leaver drops off the live list promptly.
router.post('/presence/leave', (req, res) => {
  presence.drop(String((req.body && req.body.sid) || '').slice(0, 64));
  res.json({ ok: true });
});

// ---------- Interaction / search events ----------
// Explicit signals: a card click, a search submission, a topic open. Stored as
// typed analytics events (kept separate from page views in the stats endpoint).
router.post('/track/event', (req, res) => {
  const b = req.body || {};
  const type = ['search', 'click', 'interaction'].includes(b.type) ? b.type : 'interaction';
  const g = geoOf(req);
  pushEvent({
    type,
    q: String(b.q || '').slice(0, 120),
    label: String(b.label || '').slice(0, 160),
    kind: String(b.kind || '').slice(0, 40),
    itemId: String(b.id || '').slice(0, 80),
    path: String(b.path || '').slice(0, 200),
    ip: g.ip, country: g.country, ts: Date.now(),
  });
  res.json({ ok: true });
});

// Visit tracking
router.post('/track', (req, res) => {
  const events = readJSON('analytics.json', []);
  let ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '';
  ip = ip.replace(/^::ffff:/, ''); // normalise IPv4-mapped IPv6
  const geo = geoip.lookup(ip); // null for localhost/private IPs
  events.push({
    path: String(req.body.path || '/').slice(0, 200),
    ref: String(req.body.ref || '').slice(0, 200),
    ua: String(req.headers['user-agent'] || '').slice(0, 250),
    ip,
    country: geo ? geo.country : null,
    ll: geo ? geo.ll : null,
    ts: Date.now(),
  });
  // keep last 10k events
  if (events.length > 10000) events.splice(0, events.length - 10000);
  writeJSON('analytics.json', events);
  res.json({ ok: true });
});

module.exports = router;
