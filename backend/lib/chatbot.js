// PeroTech chatbot brain.
//
// Uses the Claude API when ANTHROPIC_API_KEY is set (a warm, human-like
// PeroTech persona), and falls back to a capable rule-based responder when it
// isn't — so the chat always works. In both modes the model only *chooses*
// which posts/products/services to show (by id); the server then attaches the
// real card data from our own JSON, so thumbnails and links are always accurate.
const { readJSON } = require('./store');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

// ---------- Catalog ----------
function getPosts() {
  return readJSON('posts.json', [])
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
function getProducts() { return readJSON('products.json', []); }
function getServices() { return readJSON('services.json', []); }

function cardFor(type, id) {
  if (type === 'post') {
    const p = getPosts().find((x) => (x.slug || x.id) === id || x.id === id);
    if (!p) return null;
    return {
      type: 'post', id: p.slug || p.id, title: p.title,
      text: p.excerpt || '', image: p.cover || '',
      url: 'article.html?slug=' + encodeURIComponent(p.slug || p.id),
      meta: p.readTime || '', badge: p.badge || '',
    };
  }
  if (type === 'product') {
    const p = getProducts().find((x) => x.id === id);
    if (!p) return null;
    return { type: 'product', id: p.id, title: p.title, text: p.subtitle || '', image: p.image || '', url: p.url || '#', external: true };
  }
  if (type === 'service') {
    const s = getServices().find((x) => x.id === id);
    if (!s) return null;
    return { type: 'service', id: s.id, title: s.title, text: s.subtitle || '', image: s.image || '', url: s.url || '#', cta: s.cta || 'Learn more' };
  }
  return null;
}

function mapCards(refs) {
  const out = [];
  const seen = new Set();
  for (const r of refs || []) {
    if (!r || !r.type || !r.id) continue;
    const key = r.type + ':' + r.id;
    if (seen.has(key)) continue;
    const card = cardFor(r.type, r.id);
    if (card) { out.push(card); seen.add(key); }
    if (out.length >= 4) break;
  }
  return out;
}

// ---------- Rule-based responder (fallback, also powers the first greeting) ----------
function lastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return String(messages[i].content || '').toLowerCase();
  }
  return '';
}

function ruleBased(messages, opts) {
  opts = opts || {};
  const who = opts.name ? opts.name.split(' ')[0] : '';
  const posts = getPosts();
  const latest = posts[0];
  const text = lastUserText(messages);
  // Whole-word matching so "yo" doesn't match "you", "ad" doesn't match "brand", etc.
  const has = (...words) => words.some((w) => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text));

  // First contact / empty -> warm welcome + newest post
  if (!text) {
    return {
      reply: `Hey${who ? ' ' + who : ' there'}, welcome to PeroTech! 👋 I'm PeroTech — I build motion graphics & ads, automate things with AI, and ship bootstrapped SaaS. What can I help you with today? You can ask about my latest posts, my services, or the products I've built.`,
      cards: latest ? [{ type: 'post', id: latest.slug || latest.id }] : [],
      suggestions: ['Show me recent posts', 'What services do you offer?', 'Show your products'],
    };
  }

  if (has('post', 'blog', 'article', 'update', 'latest', 'read', 'news', 'recent')) {
    return {
      reply: "Here are some of my latest posts — tap one to read it. Want anything more specific, like motion design or AI workflows?",
      cards: posts.slice(0, 3).map((p) => ({ type: 'post', id: p.slug || p.id })),
      suggestions: ['What services do you offer?', 'Show your products'],
    };
  }
  if (has('service', 'services', 'offer', 'hire', 'work', 'help', 'motion', 'animation', 'animate', 'ad', 'ads', 'advert', 'video', 'videos', 'automate', 'automation', 'consult', 'consulting', 'project', 'brand')) {
    return {
      reply: "Here's how I can help you. Tell me a bit about your project and I'll point you the right way — or book a chat and we'll dig in.",
      cards: getServices().map((s) => ({ type: 'service', id: s.id })),
      suggestions: ['Show me recent posts', 'Show your products'],
    };
  }
  if (has('product', 'saas', 'tool', 'app', 'software', 'feedhive', 'aidbase', 'build')) {
    return {
      reply: "These are the products I've built and bootstrapped — each link takes you to the live site:",
      cards: getProducts().slice(0, 4).map((p) => ({ type: 'product', id: p.id })),
      suggestions: ['What services do you offer?', 'Show me recent posts'],
    };
  }
  if (has('contact', 'email', 'reach', 'talk', 'call', 'book', 'meet')) {
    return {
      reply: "Love that — the fastest way is to subscribe on the newsletter page (I reply to every email), or connect on YouTube/LinkedIn/Instagram from the homepage. Want me to show you what I do first?",
      cards: getServices().slice(0, 2).map((s) => ({ type: 'service', id: s.id })),
      suggestions: ['What services do you offer?', 'Show me recent posts'],
    };
  }
  if (has('hi', 'hey', 'hello', 'howdy', 'who are you', 'what is perotech', 'about you')) {
    return {
      reply: "Hey! 👋 Great to meet you. I'm PeroTech — motion design, AI automation, and building products online. Are you here for content, a project, or to see what I've built?",
      cards: latest ? [{ type: 'post', id: latest.slug || latest.id }] : [],
      suggestions: ['Show me recent posts', 'What services do you offer?', 'Show your products'],
    };
  }

  // Default — acknowledge their actual words, then offer paths (less "canned")
  const snippet = text.length > 60 ? text.slice(0, 57) + '…' : text;
  return {
    reply: `${who ? who + ', g' : 'G'}ot it — "${snippet}". I want to point you to the right thing: are you after my latest posts & tutorials, a service (motion design, AI automation, consulting), or the products I've built? Tell me a bit more and I'll dig in.`,
    cards: latest ? [{ type: 'post', id: latest.slug || latest.id }] : [],
    suggestions: ['Show me recent posts', 'What services do you offer?', 'Show your products'],
  };
}

// ---------- Claude-powered responder ----------
function buildSystemPrompt(opts) {
  opts = opts || {};
  const posts = getPosts().slice(0, 8).map((p) => ({ id: p.slug || p.id, title: p.title, excerpt: p.excerpt || '', badge: p.badge || '' }));
  const products = getProducts().map((p) => ({ id: p.id, title: p.title, subtitle: p.subtitle || '' }));
  const services = getServices().map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle || '' }));
  const nameLine = opts.name ? `\nThe visitor's name is ${opts.name}. Greet them by their first name and use it naturally now and then.` : '';

  return `You are PeroTech (handle @PeroTechie) — a real person speaking in first person, not a generic "AI assistant". You are a friendly, sharp, motivating founder who does motion graphics & ads, AI automation, and builds bootstrapped SaaS products. You're chatting with a visitor on your portfolio website.${nameLine}

Voice: warm, human, concise, a little playful. Genuinely read and understand what the visitor is asking — reference their actual words, and if a request is vague, ask one short clarifying question instead of guessing. Keep replies to 1–3 short sentences. Occasionally use an emoji. Never repeat the same canned line twice. Never claim to be an AI language model; you are PeroTech.

Your goals: greet visitors, truly understand what they need, answer helpfully, and recommend the most relevant content. When it helps, surface specific posts, products, or services from the catalog below by their id — the website will render rich preview cards for whatever you pick, so don't paste raw URLs. If nothing in the catalog fits, just answer conversationally with no cards.

CATALOG (only reference these ids):
POSTS: ${JSON.stringify(posts)}
PRODUCTS: ${JSON.stringify(products)}
SERVICES: ${JSON.stringify(services)}

Respond with ONLY a JSON object (no markdown, no backticks) in exactly this shape:
{"reply": "your message", "cards": [{"type":"post|product|service","id":"<id from catalog>"}], "suggestions": ["short reply chip", "another chip"]}

Rules:
- "cards" may be empty []. Include 1–3 cards only when genuinely relevant.
- "suggestions" are 2–3 short tappable follow-up phrases (max ~4 words each).
- Always output valid JSON. Nothing outside the JSON object.`;
}

function parseLLM(text) {
  let t = String(text || '').trim();
  // strip code fences if present
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return { reply: t || "Sorry, I glitched for a second — mind asking that again?", cards: [], suggestions: [] };
}

async function llmReply(messages, opts) {
  const apiMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-12)
    .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 4000) }));
  if (!apiMessages.length) apiMessages.push({ role: 'user', content: 'Hi' });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: buildSystemPrompt(opts),
      messages: apiMessages,
    }),
  });
  if (!res.ok) throw new Error('Anthropic API ' + res.status + ': ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  const text = (data.content || []).map((c) => c.text || '').join('');
  return parseLLM(text);
}

// ---------- Orchestrator ----------
async function chat(messages, opts) {
  messages = Array.isArray(messages) ? messages : [];
  opts = opts || {};

  // The very first turn (no user text yet) is always our scripted welcome.
  if (!lastUserText(messages)) {
    const g = ruleBased(messages, opts);
    return { reply: g.reply, cards: mapCards(g.cards), suggestions: g.suggestions || [], mode: 'welcome' };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await llmReply(messages, opts);
      return { reply: r.reply || '', cards: mapCards(r.cards), suggestions: Array.isArray(r.suggestions) ? r.suggestions.slice(0, 3) : [], mode: 'ai' };
    } catch (e) {
      console.warn('Chatbot LLM error, falling back to rules:', e.message);
    }
  }
  const r = ruleBased(messages, opts);
  return { reply: r.reply, cards: mapCards(r.cards), suggestions: r.suggestions || [], mode: 'rules' };
}

module.exports = { chat };
