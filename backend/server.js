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

// ---------- Static files (after API) ----------
// Serve uploads from the (possibly external) persistent upload dir first, so
// stored "assets/uploads/..." paths resolve even when UPLOAD_DIR lives outside
// the frontend folder in production.
app.use(UPLOAD_URL_PATH, express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

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
