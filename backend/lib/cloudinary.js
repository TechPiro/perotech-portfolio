// Cloudinary helper — used for signed, direct-from-browser uploads of files that
// are too large for the server / Cloudflare path. The browser uploads straight
// to Cloudinary (bypassing our origin and the CDN's ~100MB cap); we only sign
// the request so the API secret never leaves the server.
//
// Configure with CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
const crypto = require('crypto');

function parse() {
  const url = process.env.CLOUDINARY_URL || '';
  const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (m) return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
  // Fall back to individual vars if someone set them separately.
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return { apiKey: process.env.CLOUDINARY_API_KEY, apiSecret: process.env.CLOUDINARY_API_SECRET, cloudName: process.env.CLOUDINARY_CLOUD_NAME };
  }
  return null;
}

const cfg = parse();
const configured = () => !!cfg;

// Sign the given params (Cloudinary rule: sort alphabetically, join key=value with
// &, append the API secret, SHA-1). `file`, `api_key`, `resource_type`, `cloud_name`
// are never signed.
function signParams(params) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + cfg.apiSecret).digest('hex');
}

// Produce everything the browser needs to POST a signed upload.
function signUpload(folder) {
  if (!cfg) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const safeFolder = String(folder || 'perotech').replace(/[^\w/-]/g, '').slice(0, 60) || 'perotech';
  const params = { folder: safeFolder, timestamp };
  return { cloudName: cfg.cloudName, apiKey: cfg.apiKey, timestamp, folder: safeFolder, signature: signParams(params) };
}

module.exports = { configured, signUpload };
