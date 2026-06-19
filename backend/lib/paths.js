// Central place for all runtime (mutable) storage locations.
//
// In development these default to folders inside the repo, so nothing changes
// locally. In production set DATA_DIR and UPLOAD_DIR in .env to persistent
// folders that live OUTSIDE the git working tree (e.g. /srv/perotech/data and
// /srv/perotech/uploads) so that `git pull` deployments can never overwrite or
// delete live subscribers, analytics, admin-edited content, or uploaded files.
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..');
const PROJECT_DIR = path.join(BACKEND_DIR, '..');

// Where the mutable JSON lives (content, subscribers, analytics, settings).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(BACKEND_DIR, 'data');

// Where user-uploaded files (images, videos, downloads) are stored.
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_DIR, 'frontend', 'assets', 'uploads');

// Committed first-run defaults used to populate DATA_DIR on a fresh server.
const SEED_DIR = path.join(BACKEND_DIR, 'seed');

// Public URL path that UPLOAD_DIR is served at (keeps stored paths stable).
const UPLOAD_URL_PATH = '/assets/uploads';

function ensureDirs() {
  for (const dir of [DATA_DIR, UPLOAD_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { DATA_DIR, UPLOAD_DIR, SEED_DIR, UPLOAD_URL_PATH, BACKEND_DIR, PROJECT_DIR, ensureDirs };
