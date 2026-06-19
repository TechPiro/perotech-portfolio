// Shared mail transport for PeroTech (welcome, notification, and bulk broadcasts).
const nodemailer = require('nodemailer');
const path = require('path');

const EMAIL_ASSETS = path.join(__dirname, '..', 'email-assets');

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function mailFrom() {
  const name = process.env.MAIL_FROM_NAME || 'PeroTech Newsletter';
  const email = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || 'newsletter@perotech.com';
  return `"${name}" <${email}>`;
}

async function createTransporter() {
  if (smtpConfigured()) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = port === 465;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      requireTLS: !secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
  }
  // Fallback: Ethereal test inbox (preview only)
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

// Brand images embedded via CID (used by templates that reference cid:avatar etc.)
function brandAttachments() {
  return [
    { filename: 'avatar.png', path: path.join(EMAIL_ASSETS, 'email-avatar.png'), cid: 'avatar' },
    { filename: 'signature.png', path: path.join(EMAIL_ASSETS, 'email-signature.png'), cid: 'signature' },
    { filename: 'verified.png', path: path.join(EMAIL_ASSETS, 'email-verified.png'), cid: 'verified' },
  ];
}

module.exports = { EMAIL_ASSETS, smtpConfigured, mailFrom, createTransporter, brandAttachments };
