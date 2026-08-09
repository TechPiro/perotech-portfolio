require('dotenv').config(); // load SMTP / mail / admin settings from backend/.env
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const { createTransporter, mailFrom, smtpConfigured, brandAttachments } = require('./lib/mailer');
const { getWelcomeTemplate, getNotificationTemplate } = require('./emailTemplates');
const { UPLOAD_DIR, UPLOAD_URL_PATH } = require('./lib/paths');
const { readJSON, writeJSON } = require('./lib/store');
const { initData } = require('./lib/initData');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const payRoutes = require('./routes/pay');

// Populate persistent data dir on first run (safe no-op when data already exists).
initData();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || '';

// Behind a reverse proxy (Nginx) in production: trust X-Forwarded-* so HTTPS
// detection and the real visitor IP (used for geo analytics) work correctly.
app.set('trust proxy', 1);

// ---------- Security headers ----------
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', req.path.startsWith('/admin') ? 'DENY' : 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '6mb' }));
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------- API ----------
app.use('/api', publicRoutes);          // content + visit tracking
app.use('/api', studentRoutes);          // student identity + gated content
app.use('/api/pay', payRoutes);          // Flutterwave + crypto payments
app.use('/api/admin', adminRoutes);      // auth-protected admin

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'PeroTech' }));

// Subscribers storage (persistent DATA_DIR via the shared store)
const getSubscribers = () => readJSON('subscribers.json', []);
const saveSubscriber = (subscriber) => {
  const subscribers = getSubscribers();
  subscribers.push(subscriber);
  writeJSON('subscribers.json', subscribers);
};

// Welcome + owner-notification emails (background)
const sendWelcomeEmail = async (subscriber) => {
  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from: mailFrom(),
    to: subscriber.email,
    subject: 'Welcome to the weekly SaaS newsletter',
    html: getWelcomeTemplate(subscriber.name),
    attachments: brandAttachments(),
  });
  console.log('Welcome email sent to %s (%s)', subscriber.email, info.messageId);
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log('📧 Email preview URL:', preview);

  if (NOTIFY_EMAIL) {
    try {
      await transporter.sendMail({
        from: mailFrom(),
        to: NOTIFY_EMAIL,
        subject: `🎉 New newsletter subscriber: ${subscriber.email}`,
        html: getNotificationTemplate(subscriber),
        text: `New subscriber:\nName: ${subscriber.name}\nEmail: ${subscriber.email}\nDate: ${subscriber.date}\n`,
        attachments: brandAttachments(),
      });
      console.log('Owner notification sent to %s', NOTIFY_EMAIL);
    } catch (e) {
      console.warn('Could not send owner notification:', e.message);
    }
  }
};

// Subscribe
app.post('/api/subscribe', (req, res) => {
  const { name, email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    const newSubscriber = { id: Date.now(), name: name || 'Anonymous', email, date: new Date().toISOString() };
    saveSubscriber(newSubscriber);
    console.log(`New subscriber saved: ${email}`);

    res.json({ success: true, message: "You're subscribed — welcome aboard! 🎉" });

    sendWelcomeEmail(newSubscriber).catch((mailErr) => {
      console.warn(`⚠️  Subscriber saved, but welcome email could not be sent: ${mailErr.message}`);
    });
  } catch (error) {
    console.error('Error processing subscription:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/unsubscribe', (req, res) => {
  res.json({ success: true, message: 'Unsubscribed successfully' });
});

// ---------- Pretty URLs + social (Open Graph) previews ----------
const FRONTEND = path.join(__dirname, '..', 'frontend');
const SITE_URL = (process.env.PUBLIC_URL || 'https://perotechie.com').replace(/\/+$/, '');
const escapeHtml = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Remove a page's existing <title>, description, canonical, and og:/twitter: meta
// tags so freshly injected ones don't duplicate the static defaults.
function stripSeoTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta[^>]*(?:property=["']og:[^"']*["']|name=["']twitter:[^"']*["']|name=["']description["'])[^>]*>\s*/gi, '')
    .replace(/<link[^>]*rel=["']canonical["'][^>]*>\s*/gi, '');
}
// Inject fresh SEO/OG tags into <head>, replacing any existing ones.
function injectHead(html, tags) {
  return stripSeoTags(html).replace('</head>', '    ' + tags + '\n</head>');
}

// Build per-article OG/Twitter tags so shared blog links preview with the post
// cover + title + description (social crawlers don't run JS, so we inject here).
function articleOgTags(post) {
  const title = escapeHtml(post.title) + ' — PeroTech';
  const rawDesc = post.excerpt || ((post.blocks || []).find((b) => b.type === 'paragraph') || {}).text || '';
  const desc = escapeHtml(String(rawDesc).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180));
  let img = post.cover || 'assets/img/og-image.png';
  if (!/^https?:/i.test(img)) img = SITE_URL + '/' + img.replace(/^\//, '');
  const url = SITE_URL + '/blog/' + encodeURIComponent(post.shortId || post.slug || post.id);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="PeroTech" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    `<meta name="twitter:site" content="@PeroTechie" />`,
  ].join('\n    ');
}

// Serve a single article at /blog/:slug with injected preview tags.
app.get('/blog/:slug', (req, res, next) => {
  let html;
  try { html = fs.readFileSync(path.join(FRONTEND, 'article.html'), 'utf8'); }
  catch (e) { return next(); }
  const posts = readJSON('posts.json', []);
  const param = req.params.slug;
  const post = posts.find((p) => [p.shortId, p.slug, p.id].includes(param) && p.published !== false);
  if (post) {
    // Canonicalize legacy long slug/id URLs to the short id (keeps old links working).
    if (post.shortId && param !== post.shortId) return res.redirect(301, '/blog/' + post.shortId);
    html = injectHead(html, articleOgTags(post));
  }
  res.type('html').send(html);
});

// Old/alternate article URLs -> canonical /blog/:slug
app.get(['/article', '/article.html'], (req, res) => {
  if (req.query.slug) return res.redirect(301, '/blog/' + encodeURIComponent(req.query.slug));
  res.redirect(301, '/blog');
});

// Blog index with social-preview tags (uses the newest post's cover as the card image).
app.get('/blog', (req, res, next) => {
  let html;
  try { html = fs.readFileSync(path.join(FRONTEND, 'blog.html'), 'utf8'); }
  catch (e) { return next(); }
  const posts = readJSON('posts.json', []).filter((p) => p.published !== false);
  const settings = readJSON('settings.json', {});
  const title = 'PeroTech — Blog';
  const desc = escapeHtml(settings.blogDescription || 'Tutorials, insights, and behind-the-scenes on motion design, ads, AI, and building a business online.');
  let img = (posts[0] && posts[0].cover) || 'assets/img/og-image.png';
  if (!/^https?:/i.test(img)) img = SITE_URL + '/' + String(img).replace(/^\//, '');
  const url = SITE_URL + '/blog';
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="PeroTech" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ].join('\n    ');
  html = injectHead(html, tags);
  res.type('html').send(html);
});

// Course detail at /learn/:slug with social preview tags injected.
app.get('/learn/:slug', (req, res, next) => {
  let html;
  try { html = fs.readFileSync(path.join(FRONTEND, 'learn-course.html'), 'utf8'); }
  catch (e) { return next(); }
  const course = readJSON('courses.json', []).find((c) => (c.slug || c.id) === req.params.slug && c.published);
  if (course) {
    const title = escapeHtml(course.title) + ' — PeroTech Learn';
    const desc = escapeHtml(String(course.subtitle || course.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180));
    let img = course.cover || 'assets/img/og-image.png';
    if (!/^https?:/i.test(img)) img = SITE_URL + '/' + img.replace(/^\//, '');
    const url = SITE_URL + '/learn/' + encodeURIComponent(course.slug || course.id);
    const tags = [
      `<title>${title}</title>`,
      `<meta name="description" content="${desc}" />`,
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="PeroTech" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${desc}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:image" content="${img}" />`,
      `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${desc}" />`,
      `<meta name="twitter:image" content="${img}" />`,
    ].join('\n    ');
    html = injectHead(html, tags);
  }
  res.type('html').send(html);
});

// Section-level social previews for Products & Motion (listing pages have no
// per-item URL, so we show a representative image + title + description).
function sectionOg(res, next, fileHtml, { title, desc, img }) {
  let html;
  try { html = fs.readFileSync(path.join(FRONTEND, fileHtml), 'utf8'); }
  catch (e) { return next(); }
  let image = img || 'assets/img/og-image.png';
  if (!/^https?:/i.test(image)) image = SITE_URL + '/' + String(image).replace(/^\//, '');
  const url = SITE_URL + '/' + fileHtml.replace(/\.html$/, '');
  const d = escapeHtml(desc);
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="PeroTech" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join('\n    ');
  html = injectHead(html, tags);
  res.type('html').send(html);
}
app.get('/products', (req, res, next) => {
  const items = readJSON('products.json', []);
  sectionOg(res, next, 'products.html', {
    title: 'PeroTech — SaaS Products',
    desc: 'Bootstrapped SaaS products built and shipped by PeroTech — explore the tools I’ve launched.',
    img: (items[0] && items[0].image) || 'assets/img/og-image.png',
  });
});
app.get('/motion', (req, res, next) => {
  const items = readJSON('motion.json', []);
  sectionOg(res, next, 'motion.html', {
    title: 'PeroTech — Motion Design & Ads',
    desc: 'Motion graphics, explainer videos and ads PeroTech designs for brands. See the latest work.',
    img: (items[0] && (items[0].thumb || items[0].cover)) || 'assets/img/og-image.png',
  });
});

// Zentra landing page at /zentra with SEO/OG tags injected from the DB content.
app.get('/zentra', (req, res, next) => {
  let html;
  try { html = fs.readFileSync(path.join(FRONTEND, 'zentra.html'), 'utf8'); }
  catch (e) { return next(); }
  const z = readJSON('zentra.json', {});
  const meta = z.meta || {};
  const title = escapeHtml(meta.title || 'Zentra — White-Label Trading Platform');
  const desc = escapeHtml(meta.description || 'Launch your own Stock, Forex & Crypto trading platform.');
  let img = meta.ogImage || 'assets/img/zentra/desktop.png';
  if (!/^https?:/i.test(img)) img = SITE_URL + '/' + img.replace(/^\//, '');
  const url = SITE_URL + '/zentra';
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Zentra" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ].join('\n    ');
  html = injectHead(html, tags);
  res.type('html').send(html);
});
// Protected content manager for the Zentra page (auth handled client-side + API).
app.get('/zentra/admin', (req, res, next) => {
  try { res.type('html').send(fs.readFileSync(path.join(FRONTEND, 'zentra-admin.html'), 'utf8')); }
  catch (e) { next(); }
});

// /home -> homepage; *.html -> clean URL
app.get('/home', (req, res) => res.redirect(301, '/'));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
['newsletter', 'products', 'motion', 'blog', 'chat', 'learn'].forEach((p) =>
  app.get('/' + p + '.html', (req, res) => res.redirect(301, '/' + p)));

// ---------- Static files (after API) ----------
// Serve uploads from the (possibly external) persistent upload dir first, so
// stored "assets/uploads/..." paths resolve even when UPLOAD_DIR lives outside
// the frontend folder in production.
app.use(UPLOAD_URL_PATH, express.static(UPLOAD_DIR));
// `extensions: ['html']` makes /newsletter serve newsletter.html, etc.
app.use(express.static(FRONTEND, { extensions: ['html'] }));

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`🔐 Admin dashboard: http://localhost:${PORT}/admin/`);
  if (smtpConfigured()) {
    console.log(`✉️  Mail: real SMTP via ${process.env.SMTP_HOST} (from ${mailFrom()})`);
    if (NOTIFY_EMAIL) console.log(`🔔 New-subscriber notifications go to ${NOTIFY_EMAIL}`);
  } else {
    console.log('✉️  Mail: TEST mode (Ethereal). Add SMTP settings to backend/.env for real email.');
  }
  // Production safety: refuse to run silently with insecure defaults.
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET === 'perotech-dev-secret-change-me')
      console.warn('⚠️  SECURITY: set a strong ADMIN_SECRET in backend/.env (tokens are signed with it).');
    if (!process.env.ADMIN_PASS || process.env.ADMIN_PASS === 'perotech123')
      console.warn('⚠️  SECURITY: change the default ADMIN_PASS in backend/.env.');
  }
});
