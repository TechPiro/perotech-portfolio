// In-memory live-visitor presence + a tiny user-agent parser.
// Ephemeral per process (fine for the single PM2 instance): tracks who is on the
// site right now, on which page, from which device/country — for the admin "Live"
// panel. Nothing is persisted; sessions expire shortly after the last heartbeat.
const SESSIONS = new Map(); // sid -> { sid, path, ua, ip, country, ll, first, last, views }
const TTL_MS = 45000;       // a session counts as "live" for 45s after its last ping

// Best-effort UA parse — device class, OS, browser. No external deps.
function parseUA(ua) {
  ua = String(ua || '');
  const isTablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua);
  const isMobile = !isTablet && /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini/i.test(ua);
  const device = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';
  let os = 'Unknown';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua)) browser = 'Safari';
  return { device, os, browser, label: `${device} · ${os} · ${browser}` };
}

function ping(sid, data) {
  if (!sid) return;
  const now = Date.now();
  const prev = SESSIONS.get(sid);
  const path = data.path || (prev && prev.path) || '/';
  SESSIONS.set(sid, {
    sid,
    path,
    ua: data.ua || (prev && prev.ua) || '',
    ip: data.ip || (prev && prev.ip) || '',
    country: data.country || (prev && prev.country) || null,
    ll: data.ll || (prev && prev.ll) || null,
    first: prev ? prev.first : now,
    last: now,
    // count a new "view" whenever the path changes between pings
    views: prev ? prev.views + (prev.path !== path ? 1 : 0) : 1,
  });
  if (SESSIONS.size > 5000) prune();
}

function prune() {
  const cut = Date.now() - TTL_MS;
  for (const [k, v] of SESSIONS) if (v.last < cut) SESSIONS.delete(k);
}

function list() { prune(); return [...SESSIONS.values()].sort((a, b) => b.last - a.last); }
function count() { prune(); return SESSIONS.size; }
// Drop a session immediately (used on page-hide beacon).
function drop(sid) { if (sid) SESSIONS.delete(sid); }

module.exports = { ping, list, count, drop, parseUA, TTL_MS };
