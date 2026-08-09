// Short, URL-safe public IDs for content (e.g. /blog/<id>).
// 8 chars of base36 (a-z0-9) — mixed letters+digits, ~2.8 trillion combos.
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function makeShortId(len = 8) {
  let s = '';
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

// Generate an id not present in the given Set of used ids.
function uniqueShortId(used, len = 8) {
  let id;
  do { id = makeShortId(len); } while (used && used.has(id));
  return id;
}

module.exports = { makeShortId, uniqueShortId };
