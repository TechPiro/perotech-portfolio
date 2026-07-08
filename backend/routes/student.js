// Student API: passwordless (magic-link) identity, course catalog,
// entitlement-gated lesson content, and protected video streaming.
const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const router = express.Router();

const { readJSON, writeJSON } = require('../lib/store');
const { COURSE_DIR } = require('../lib/paths');
const { issueMagic, issueStudent, verifyAud, requireStudent } = require('../lib/auth');
const { entitlementsFor, hasAccess, norm } = require('../lib/entitlements');
const { createTransporter, mailFrom, brandAttachments } = require('../lib/mailer');
const { getMagicLinkTemplate } = require('../emailTemplates');

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clientIp = (req) =>
  ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');

// Light rate limit: max 4 magic-link requests per key per 10 minutes.
const reqLog = new Map();
function allow(key) {
  const now = Date.now(), WIN = 10 * 60 * 1000, MAX = 4;
  const arr = (reqLog.get(key) || []).filter((t) => now - t < WIN);
  if (arr.length >= MAX) { reqLog.set(key, arr); return false; }
  arr.push(now); reqLog.set(key, arr);
  if (reqLog.size > 5000) for (const [k, v] of reqLog) if (!v.some((t) => now - t < WIN)) reqLog.delete(k);
  return true;
}

const baseUrl = (req) => (process.env.PUBLIC_URL || (req.protocol + '://' + req.get('host'))).replace(/\/+$/, '');

// Request a sign-in / access link by email.
router.post('/student/request-link', async (req, res) => {
  const email = norm(req.body && req.body.email);
  const name = String((req.body && req.body.name) || '').trim().slice(0, 80);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (!allow('e:' + email) || !allow('ip:' + clientIp(req)))
    return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });

  // Upsert the student record.
  const students = readJSON('students.json', []);
  let s = students.find((x) => norm(x.email) === email);
  if (!s) { s = { id: 's' + Date.now() + Math.random().toString(36).slice(2, 6), email, name, createdAt: Date.now() }; students.push(s); }
  else if (name && !s.name) s.name = name;
  writeJSON('students.json', students);

  const link = baseUrl(req) + '/student-auth?token=' + encodeURIComponent(issueMagic(email));
  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: mailFrom(), to: email, subject: 'Your PeroTech sign-in link',
      html: getMagicLinkTemplate(link), attachments: brandAttachments(),
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('🔑 Magic-link preview:', preview);
    res.json({ ok: true, ...(preview ? { preview } : {}) });
  } catch (e) {
    console.error('[student] mail error:', e.message);
    res.status(500).json({ error: 'Could not send the email right now. Please try again shortly.' });
  }
});

// Exchange a magic token (from the email link) for a 30-day session token.
router.post('/student/exchange', (req, res) => {
  const payload = verifyAud(String((req.body && req.body.token) || ''), 'magic');
  if (!payload) return res.status(401).json({ error: 'This link has expired. Please request a new one.' });
  const email = payload.sub;
  const students = readJSON('students.json', []);
  const s = students.find((x) => norm(x.email) === norm(email));
  if (s) { s.lastLogin = Date.now(); writeJSON('students.json', students); }
  res.json({ token: issueStudent(email), email, name: (s && s.name) || '' });
});

// Current student profile + what they can access.
router.get('/student/me', requireStudent, (req, res) => {
  const email = req.student.email;
  const students = readJSON('students.json', []);
  const s = students.find((x) => norm(x.email) === norm(email)) || { email };
  const courses = readJSON('courses.json', []);
  const ent = entitlementsFor(email, courses);
  res.json({ email, name: s.name || '', allAccess: ent.allAccess, ownedCourseIds: ent.ownedCourseIds });
});

// ---------- Course catalog (public) ----------
const lessonMeta = (l) => ({
  id: l.id, title: l.title || '', summary: l.summary || '', duration: l.duration || '',
  free: !!l.free, hasVideo: !!(l.video && l.video.kind && l.video.kind !== 'none'),
  videoKind: l.video ? l.video.kind : null,
});
const toList = (v) => Array.isArray(v) ? v.filter(Boolean) : (typeof v === 'string' ? v.split('\n').map((s) => s.trim()).filter(Boolean) : []);
const courseCard = (c) => ({
  id: c.id, slug: c.slug || c.id, title: c.title || '', subtitle: c.subtitle || '',
  description: c.description || '', cover: c.cover || '', level: c.level || '',
  price: c.price || 0, allAccessOnly: !!c.allAccessOnly, badge: c.badge || '',
  lessonCount: (c.lessons || []).length,
  author: c.author || '', category: c.category || '',
  rating: c.rating != null ? Number(c.rating) : null,
  students: c.students != null ? Number(c.students) : null,
  // Optional Udemy-style detail fields (all render conditionally).
  outcomes: toList(c.outcomes), requirements: toList(c.requirements),
  authorBio: c.authorBio || '', language: c.language || 'English',
});
// A lesson with content only when unlocked (entitled) or it's a free preview.
function detailLesson(l, unlocked) {
  const base = lessonMeta(l);
  if (unlocked || l.free) { base.locked = false; base.video = l.video || null; base.blocks = l.blocks || []; }
  else base.locked = true;
  return base;
}

router.get('/courses', (req, res) =>
  res.json(readJSON('courses.json', []).filter((c) => c.published).map(courseCard)));

router.get('/courses/:slug', (req, res) => {
  const c = readJSON('courses.json', []).find((x) => (x.slug || x.id) === req.params.slug && x.published);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  res.json({ ...courseCard(c), lessons: (c.lessons || []).map((l) => detailLesson(l, false)) });
});

// Full course content — requires a valid session AND entitlement.
router.get('/student/courses/:slug', requireStudent, (req, res) => {
  const c = readJSON('courses.json', []).find((x) => (x.slug || x.id) === req.params.slug);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  if (!hasAccess(req.student.email, c.id)) return res.status(403).json({ error: 'You do not have access to this course yet.', locked: true });
  res.json({ ...courseCard(c), unlocked: true, lessons: (c.lessons || []).map((l) => detailLesson(l, true)) });
});

// Courses the signed-in student can access (for their dashboard).
router.get('/student/my-courses', requireStudent, (req, res) => {
  const courses = readJSON('courses.json', []).filter((c) => c.published);
  const ent = entitlementsFor(req.student.email, courses);
  res.json({ allAccess: ent.allAccess, courses: ent.courses.map(courseCard) });
});

// ---------- Protected video streaming (Range support) ----------
function streamFile(req, res, file) {
  const stat = fs.statSync(file);
  const total = stat.size;
  const type = file.toLowerCase().endsWith('.webm') ? 'video/webm' : file.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
  res.setHeader('Content-Type', type);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, no-store');
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : total - 1;
    if (isNaN(start) || start < 0) start = 0;
    if (isNaN(end) || end >= total) end = total - 1;
    if (start > end) { res.status(416).setHeader('Content-Range', `bytes */${total}`); return res.end(); }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.setHeader('Content-Length', total);
  fs.createReadStream(file).pipe(res);
}

// Free previews stream to anyone; paid lessons need a valid token + entitlement.
// Token may arrive via ?t= (HTML5 <video> can't set Authorization headers).
router.get('/lessons/:slug/:lessonId/video', (req, res) => {
  const c = readJSON('courses.json', []).find((x) => (x.slug || x.id) === req.params.slug);
  if (!c) return res.sendStatus(404);
  const l = (c.lessons || []).find((x) => x.id === req.params.lessonId);
  if (!l || !l.video || l.video.kind !== 'mp4' || !l.video.src) return res.sendStatus(404);
  if (!l.free) {
    const token = req.query.t || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const payload = verifyAud(String(token || ''), 'student');
    if (!payload || !hasAccess(payload.sub, c.id)) return res.sendStatus(403);
  }
  const file = path.join(COURSE_DIR, path.basename(String(l.video.src))); // basename blocks path traversal
  if (!fs.existsSync(file)) return res.sendStatus(404);
  streamFile(req, res, file);
});

module.exports = router;
