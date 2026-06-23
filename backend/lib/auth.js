// Lightweight signed-token auth (no external deps; uses Node crypto HMAC).
const crypto = require('crypto');

const SECRET = process.env.ADMIN_SECRET || 'perotech-dev-secret-change-me';

const b64 = (s) => Buffer.from(s).toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url').toString();

function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}

function verify(token) {
  if (!token || token.indexOf('.') === -1) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(unb64(body));
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch (e) {
    return null;
  }
}

// Absolute session lifetime (idle logout is handled client-side). Default 12h.
const TTL_HOURS = Number(process.env.ADMIN_TOKEN_TTL_HOURS) || 12;
function issue(user) {
  const now = Date.now();
  return sign({ user, iat: now, exp: now + TTL_HOURS * 60 * 60 * 1000 });
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.replace(/^Bearer\s+/i, '');
  const payload = verify(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.admin = payload;
  next();
}

module.exports = { sign, verify, issue, requireAuth };
