// Public API: content the frontend reads, plus visit tracking.
const express = require('express');
const router = express.Router();
const geoip = require('geoip-lite');
const { readJSON, writeJSON } = require('../lib/store');
const { chat } = require('../lib/chatbot');

router.get('/posts', (req, res) => res.json(readJSON('posts.json', [])));
router.get('/posts/:id', (req, res) => {
  const post = readJSON('posts.json', []).find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});
router.get('/motion', (req, res) => res.json(readJSON('motion.json', [])));
router.get('/products', (req, res) => res.json(readJSON('products.json', [])));
router.get('/services', (req, res) => res.json(readJSON('services.json', [])));
router.get('/timeline', (req, res) => res.json(readJSON('timeline.json', [])));
router.get('/tools', (req, res) => res.json(readJSON('tools.json', [])));
router.get('/videos', (req, res) => res.json(readJSON('videos.json', [])));
router.get('/settings', (req, res) => res.json(readJSON('settings.json', {})));

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
  res.json(all.filter((c) => c.postId === req.params.id).sort((a, b) => b.ts - a.ts));
});
router.post('/posts/:id/comments', (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 60);
  const text = String((req.body && req.body.text) || '').trim().slice(0, 2000);
  if (!name || !text) return res.status(400).json({ error: 'Name and comment are required' });
  const all = readJSON('comments.json', []);
  let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  ip = ip.replace(/^::ffff:/, '');
  const comment = { id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6), postId: req.params.id, name, text, ts: Date.now(), date: new Date().toISOString(), ip };
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
