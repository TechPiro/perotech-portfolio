// Public API: content the frontend reads, plus visit tracking.
const express = require('express');
const router = express.Router();
const geoip = require('geoip-lite');
const { readJSON, writeJSON } = require('../lib/store');

router.get('/posts', (req, res) => res.json(readJSON('posts.json', [])));
router.get('/posts/:id', (req, res) => {
  const post = readJSON('posts.json', []).find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});
router.get('/motion', (req, res) => res.json(readJSON('motion.json', [])));
router.get('/products', (req, res) => res.json(readJSON('products.json', [])));
router.get('/timeline', (req, res) => res.json(readJSON('timeline.json', [])));
router.get('/tools', (req, res) => res.json(readJSON('tools.json', [])));
router.get('/videos', (req, res) => res.json(readJSON('videos.json', [])));
router.get('/settings', (req, res) => res.json(readJSON('settings.json', {})));

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
