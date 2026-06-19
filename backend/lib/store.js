// Tiny JSON file store for PeroTech admin/content data.
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./paths');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function filePath(name) {
  return path.join(DATA_DIR, name);
}
function readJSON(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath(name), 'utf8'));
  } catch (e) {
    return fallback;
  }
}
function writeJSON(name, data) {
  ensure();
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

module.exports = { DATA_DIR, ensure, filePath, readJSON, writeJSON };
