// Shared branded email HTML templates for PeroTech.
// All use CID images (cid:avatar, cid:signature, cid:verified) attached by the sender.
const fs = require('fs');
const path = require('path');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const HEADER = `
  <tr><td style="background:#e3eaf3;border-radius:14px;padding:14px 18px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;"><img src="cid:avatar" width="38" height="38" alt="" style="display:block;border-radius:50%;" /></td>
      <td style="vertical-align:middle;padding-left:10px;font-size:18px;font-weight:bold;color:#0f1419;">@PeroTechie</td>
      <td style="vertical-align:middle;padding-left:6px;"><img src="cid:verified" width="20" height="20" alt="verified" style="display:block;" /></td>
    </tr></table>
  </td></tr>
  <tr><td style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>`;

const FOOTER = `
  <tr><td align="center" style="padding:22px 0 14px;font-size:13px;">
    <a href="#" style="color:#9aa4b2;text-decoration:underline;margin:0 9px;">Website</a>
    <a href="https://www.youtube.com/@PeroTech" style="color:#9aa4b2;text-decoration:underline;margin:0 9px;">YouTube</a>
    <a href="https://www.instagram.com/perotech/" style="color:#9aa4b2;text-decoration:underline;margin:0 9px;">Instagram</a>
    <a href="https://www.linkedin.com/company/perotech" style="color:#9aa4b2;text-decoration:underline;margin:0 9px;">LinkedIn</a>
  </td></tr>
  <tr><td align="center" style="background:#eef2f7;border-radius:10px;padding:18px;">
    <a href="#" style="color:#9aa4b2;font-size:13px;text-decoration:underline;">Unsubscribe</a>
  </td></tr>
  <tr><td style="height:20px;"></td></tr>`;

function shell(innerHtml, width) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#edf2f7;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf2f7;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="${width || 600}" cellpadding="0" cellspacing="0" style="max-width:${width || 600}px;width:100%;font-family:Arial,Helvetica,sans-serif;">
        ${innerHtml}
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

function getWelcomeTemplate(name) {
  const greeting = name && name !== 'Anonymous' ? name : 'founder';
  const body = `
    <tr><td style="background:#ffffff;border-radius:14px;padding:30px 28px;color:#3f4754;font-size:16px;line-height:1.65;">
      <p style="margin:0 0 16px;">Hey ${greeting} 👋</p>
      <p style="margin:0 0 16px;">Welcome to the PeroTech newsletter — I'm pumped to have you on the list!</p>
      <h2 style="font-size:20px;color:#1a202c;margin:28px 0 10px;">Quick setup</h2>
      <p style="margin:0 0 12px;">Before I start sending you emails, let's make sure everything is set up:</p>
      <ol style="margin:0 0 16px;padding-left:20px;">
        <li style="margin-bottom:8px;">Reply to this email with "I'm in!" (so Google knows you actually want these)</li>
        <li style="margin-bottom:8px;">Click the little star next to this email (so they don't end up in spam)</li>
        <li style="margin-bottom:8px;">If my emails land in your "Promotions" tab, drag them to "Primary"</li>
      </ol>
      <p style="margin:0 0 8px;">Awesome 💪</p>
      <hr style="border:none;border-top:1px solid #e6ebf1;margin:28px 0;" />
      <h2 style="font-size:20px;color:#1a202c;margin:0 0 10px;">What's next?</h2>
      <p style="margin:0 0 12px;">Every week, I'll share actionable advice on bootstrapping a SaaS business, motion design, and building online.</p>
      <hr style="border:none;border-top:1px solid #e6ebf1;margin:28px 0;" />
      <p style="margin:0 0 4px;">Until next time,</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
        <td style="vertical-align:middle;"><img src="cid:avatar" width="58" height="58" alt="PeroTech" style="display:block;border-radius:50%;" /></td>
        <td style="vertical-align:middle;padding-left:18px;"><img src="cid:signature" height="46" alt="PeroTech" style="display:block;" /></td>
      </tr></table>
    </td></tr>`;
  return shell(HEADER + body + FOOTER);
}

function getNotificationTemplate(subscriber) {
  const dateStr = new Date(subscriber.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const row = (label, value) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #eef1f6;color:#8a93a3;font-size:13px;width:90px;">${label}</td>
       <td style="padding:10px 0;border-bottom:1px solid #eef1f6;color:#1a202c;font-size:15px;font-weight:600;">${value}</td></tr>`;
  const first = (subscriber.name || 'them').split(' ')[0];
  const body = `
    <tr><td style="background:#ffffff;border-radius:14px;padding:30px 28px;color:#3f4754;font-size:16px;line-height:1.6;">
      <div style="font-size:34px;line-height:1;margin-bottom:10px;">🎉</div>
      <h1 style="margin:0 0 6px;font-size:22px;color:#1a202c;">New newsletter subscriber!</h1>
      <p style="margin:0 0 22px;color:#6b7280;font-size:15px;">Someone just joined the PeroTech newsletter.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eef1f6;">
        ${row('Name', subscriber.name || 'Anonymous')}
        ${row('Email', `<a href="mailto:${subscriber.email}" style="color:#4770ff;text-decoration:none;">${subscriber.email}</a>`)}
        ${row('Date', dateStr)}
      </table>
      <div style="margin-top:24px;">
        <a href="mailto:${subscriber.email}" style="display:inline-block;background:#4770ff;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:999px;">Reply to ${first}</a>
      </div>
    </td></tr>
    <tr><td align="center" style="padding:18px 0;color:#9aa4b2;font-size:12px;">Sent automatically by your PeroTech newsletter system.</td></tr>`;
  return shell(HEADER + body, 560);
}

// Bulk broadcast: admin supplies a subject (used as heading) and body (HTML or plain text).
function getBroadcastTemplate({ heading, bodyHtml, name }) {
  const greeting = name && name !== 'Anonymous' ? `<p style="margin:0 0 16px;">Hey ${name} 👋</p>` : '';
  const body = `
    <tr><td style="background:#ffffff;border-radius:14px;padding:30px 28px;color:#3f4754;font-size:16px;line-height:1.7;">
      ${heading ? `<h1 style="font-size:23px;color:#1a202c;margin:0 0 18px;">${heading}</h1>` : ''}
      ${greeting}
      <div>${bodyHtml}</div>
      <hr style="border:none;border-top:1px solid #e6ebf1;margin:28px 0;" />
      <p style="margin:0 0 4px;">Until next time,</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
        <td style="vertical-align:middle;"><img src="cid:avatar" width="58" height="58" alt="PeroTech" style="display:block;border-radius:50%;" /></td>
        <td style="vertical-align:middle;padding-left:18px;"><img src="cid:signature" height="46" alt="PeroTech" style="display:block;" /></td>
      </tr></table>
    </td></tr>`;
  return shell(HEADER + body + FOOTER);
}

// Announcement email for newly published content (post / product / service).
// Polished card: kind pill, thumbnail, title, excerpt, "Read more" button, signature.
// The thumbnail is embedded as an inline CID image so it renders in every inbox.
// Returns { html, attachments }.
function getAnnouncementTemplate(data, opts) {
  data = data || {}; opts = opts || {};
  const base = String(opts.baseUrl || '').replace(/\/+$/, '');
  const attachments = [];
  const absUrl = (src) => {
    if (!src) return '';
    if (/^https?:\/\//i.test(src) || /^mailto:/i.test(src)) return src;
    return base + '/' + String(src).replace(/^\//, '');
  };
  // Resolve the thumbnail to an inline CID attachment when it's a local file.
  let thumbSrc = '';
  if (data.imageSrc) {
    if (!/^https?:\/\//i.test(data.imageSrc)) {
      const file = path.join(FRONTEND_DIR, String(data.imageSrc).replace(/^\//, ''));
      if (fs.existsSync(file)) {
        attachments.push({ filename: path.basename(file), path: file, cid: 'annthumb' });
        thumbSrc = 'cid:annthumb';
      } else thumbSrc = absUrl(data.imageSrc);
    } else thumbSrc = data.imageSrc;
  }
  const link = absUrl(data.link);
  const cta = data.ctaLabel || 'Read more';
  const label = data.label || 'New';
  const emoji = data.emoji || '✨';
  const title = (data.title || '').replace(/</g, '&lt;');
  const altTitle = (data.title || '').replace(/"/g, '&quot;');
  const excerpt = data.excerpt
    ? `<p style="margin:0 0 24px;color:#5b6472;font-size:16px;line-height:1.65;">${String(data.excerpt).replace(/</g, '&lt;')}</p>` : '';
  const thumb = thumbSrc ? `
      <a href="${link}" style="text-decoration:none;display:block;margin:0 0 24px;">
        <img src="${thumbSrc}" alt="${altTitle}" width="544"
             style="display:block;width:100%;max-width:544px;height:auto;border-radius:14px;border:1px solid #e6ebf1;" />
      </a>` : '';
  const body = `
    <tr><td style="background:#ffffff;border-radius:14px;padding:28px 28px 30px;color:#3f4754;">
      <div style="margin-bottom:20px;"><span style="display:inline-block;background:#eef3ff;color:#3358e0;font-size:12px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">${emoji}&nbsp; ${label}</span></div>
      ${thumb}
      <h1 style="margin:0 0 12px;font-size:25px;line-height:1.25;color:#10151f;">${title}</h1>
      ${excerpt}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:2px 0 4px;"><tr>
        <td style="border-radius:999px;background:#4770ff;">
          <a href="${link}" style="display:inline-block;padding:13px 30px;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;border-radius:999px;">${cta} &nbsp;&rarr;</a>
        </td></tr></table>
      <hr style="border:none;border-top:1px solid #e6ebf1;margin:28px 0 22px;" />
      <p style="margin:0 0 4px;color:#3f4754;font-size:15px;">Until next time,</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
        <td style="vertical-align:middle;"><img src="cid:avatar" width="54" height="54" alt="PeroTech" style="display:block;border-radius:50%;" /></td>
        <td style="vertical-align:middle;padding-left:16px;"><img src="cid:signature" height="42" alt="PeroTech" style="display:block;" /></td>
      </tr></table>
    </td></tr>`;
  return { html: shell(HEADER + body + FOOTER), attachments };
}

// Turn the admin's content blocks into email-safe HTML.
// - Images are embedded as inline CID attachments (always render, even from localhost).
// - Files / videos / buttons link out via absolute URLs (use PUBLIC_URL when live).
// Returns { html, attachments }.
function renderEmailBlocks(blocks, opts) {
  opts = opts || {};
  const base = String(opts.baseUrl || '').replace(/\/+$/, '');
  const attachments = [];
  let cidN = 0;

  const abs = (src) => {
    if (!src) return '';
    if (/^https?:\/\//i.test(src) || /^mailto:/i.test(src)) return src;
    return base + '/' + String(src).replace(/^\//, '');
  };
  const imgTag = (src, alt, style) => {
    alt = (alt || '').replace(/"/g, '&quot;');
    if (src && !/^https?:\/\//i.test(src)) {
      const file = path.join(FRONTEND_DIR, String(src).replace(/^\//, ''));
      if (fs.existsSync(file)) {
        const cid = 'emimg' + ++cidN;
        attachments.push({ filename: path.basename(file), path: file, cid });
        return `<img src="cid:${cid}" alt="${alt}" style="${style}" />`;
      }
    }
    return `<img src="${abs(src)}" alt="${alt}" style="${style}" />`;
  };
  const ytId = (url) => { const m = String(url || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/); return m ? m[1] : null; };
  const imgStyle = 'display:block;width:100%;max-width:544px;height:auto;border-radius:12px;margin:0 auto;';
  const cta = (url, label) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 0;"><tr><td style="border-radius:999px;background:#4770ff;"><a href="${abs(url)}" style="display:inline-block;padding:12px 26px;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;border-radius:999px;">${label}</a></td></tr></table>`;
  const caption = (t) => t ? `<div style="text-align:center;color:#9aa4b2;font-size:13px;margin-top:8px;">${t}</div>` : '';

  const html = (blocks || []).map((b) => {
    switch (b.type) {
      case 'heading':
        return `<h2 style="font-size:21px;color:#1a202c;margin:26px 0 12px;font-weight:bold;">${b.text || ''}</h2>`;
      case 'paragraph':
        return `<p style="margin:0 0 16px;">${b.text || ''}</p>`;
      case 'divider':
        return `<hr style="border:none;border-top:1px solid #e6ebf1;margin:26px 0;" />`;
      case 'button':
        return b.url ? `<div style="margin:8px 0 20px;">${cta(b.url, b.label || 'Learn more')}</div>` : '';
      case 'image': {
        if (!b.src) return '';
        const img = imgTag(b.src, b.caption, imgStyle);
        const inner = b.url ? `<a href="${abs(b.url)}">${img}</a>` : img;
        return `<div style="margin:18px 0;">${inner}${caption(b.caption)}</div>`;
      }
      case 'video': {
        const id = ytId(b.url || b.src);
        let posterTag = '';
        if (b.poster) posterTag = imgTag(b.poster, b.caption || 'Watch the video', imgStyle);
        else if (id) posterTag = `<img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="Watch the video" style="${imgStyle}" />`;
        const link = abs(b.url || b.src);
        const poster = posterTag ? `<a href="${link}" style="text-decoration:none;">${posterTag}</a>` : '';
        return `<div style="margin:18px 0;text-align:center;">${poster}${cta(b.url || b.src, '&#9654;&nbsp; Watch the video')}${caption(b.caption)}</div>`;
      }
      case 'file': {
        const url = abs(b.src);
        const size = b.size ? ` <span style="color:#9aa4b2;font-weight:normal;">&middot; ${b.size}</span>` : '';
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;"><tr><td style="border:1px solid #e6ebf1;border-radius:12px;padding:14px 16px;background:#f7f9fc;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="font-size:24px;width:36px;vertical-align:middle;">&#128206;</td>
            <td style="font-size:15px;color:#1a202c;font-weight:bold;vertical-align:middle;">${b.name || 'Download'}${size}<div style="font-weight:normal;color:#9aa4b2;font-size:13px;">Click to download</div></td>
            <td align="right" style="vertical-align:middle;"><a href="${url}" style="display:inline-block;padding:9px 18px;background:#4770ff;color:#ffffff;font-weight:bold;font-size:13px;text-decoration:none;border-radius:999px;">Download</a></td>
          </tr></table>
        </td></tr></table>`;
      }
      default: return '';
    }
  }).join('\n');

  return { html, attachments };
}

module.exports = { getWelcomeTemplate, getNotificationTemplate, getBroadcastTemplate, getAnnouncementTemplate, renderEmailBlocks };
