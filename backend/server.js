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

// Populate persistent data dir on first run (safe no-op when data already exists).
initData();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || '';

// Behind a reverse proxy (Nginx) in production: trust X-Forwarded-* so HTTPS
// detection and the real visitor IP (used for geo analytics) work correctly.
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '6mb' }));
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------- API ----------
app.use('/api', publicRoutes);          // content + visit tracking
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

// Build per-article OG/Twitter tags so shared blog links preview with the post
// cover + title + description (social crawlers don't run JS, so we inject here).
function articleOgTags(post) {
  const title = escapeHtml(post.title) + ' — PeroTech';
  const rawDesc = post.excerpt || ((post.blocks || []).find((b) => b.type === 'paragraph') || {}).text || '';
  const desc = escapeHtml(String(rawDesc).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180));
  let img = post.cover || 'assets/img/og-image.png';
  if (!/^https?:/i.test(img)) img = SITE_URL + '/' + img.replace(/^\//, '');
  const url = SITE_URL + '/blog/' + encodeURIComponent(post.slug || post.id);
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
  const post = posts.find((p) => (p.slug || p.id) === req.params.slug);
  if (post) {
    // remove the file's default <title>, then inject article-specific tags
    html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
    html = html.replace('</head>', '    ' + articleOgTags(post) + '\n</head>');
  }
  res.type('html').send(html);
});

// Old/alternate article URLs -> canonical /blog/:slug
app.get(['/article', '/article.html'], (req, res) => {
  if (req.query.slug) return res.redirect(301, '/blog/' + encodeURIComponent(req.query.slug));
  res.redirect(301, '/blog');
});

// /home -> homepage; *.html -> clean URL
app.get('/home', (req, res) => res.redirect(301, '/'));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
['newsletter', 'products', 'motion', 'blog', 'chat'].forEach((p) =>
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
});
