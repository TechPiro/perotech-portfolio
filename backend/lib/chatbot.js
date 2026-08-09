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
// Newest first (admin prepends new items, so index 0 is the latest).
function getCourses() { return readJSON('courses.json', []).filter((c) => c.published !== false); }
function getMotion() { return readJSON('motion.json', []); }

function cardFor(type, id) {
  if (type === 'post') {
    const p = getPosts().find((x) => (x.slug || x.id) === id || x.id === id);
    if (!p) return null;
    return {
      type: 'post', id: p.slug || p.id, title: p.title,
      text: p.excerpt || '', image: p.cover || '',
      url: '/blog/' + encodeURIComponent(p.shortId || p.slug || p.id),
      meta: p.readTime || '', badge: p.badge || '',
    };
  }
  if (type === 'course') {
    const c = getCourses().find((x) => (x.slug || x.id) === id || x.id === id);
    if (!c) return null;
    return {
      type: 'course', id: c.slug || c.id, title: c.title,
      text: c.subtitle || c.description || '', image: c.cover || '',
      url: '/learn/' + encodeURIComponent(c.slug || c.id),
      meta: c.level || '', badge: c.badge || '',
    };
  }
  if (type === 'motion') {
    const m = getMotion().find((x) => x.id === id);
    if (!m) return null;
    return {
      type: 'motion', id: m.id, title: m.title,
      text: m.description || m.client || '', image: m.thumb || m.cover || '',
      url: '/motion',
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
  const latestCourse = getCourses()[0];
  const latestMotion = getMotion()[0];
  const text = lastUserText(messages);
  // Whole-word matching so "yo" doesn't match "you", "ad" doesn't match "brand", etc.
  const has = (...words) => words.some((w) => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text));

  // First contact / empty -> warm welcome; proactively surface the latest course.
  if (!text) {
    const cards = [];
    let reply = `Hey${who ? ' ' + who : ' there'}, welcome to PeroTech! 👋 I build motion graphics & ads, automate things with AI, and ship bootstrapped SaaS.`;
    if (latestCourse) {
      reply += ` P.S. a lot of people are learning my latest course right now — I thought you might want to pick up this skill and add it to your list 👇`;
      cards.push({ type: 'course', id: latestCourse.slug || latestCourse.id });
    } else if (latest) {
      cards.push({ type: 'post', id: latest.slug || latest.id });
    }
    return {
      reply,
      cards,
      suggestions: ['🎬 See my latest video', 'What services do you offer?', 'Show your products'],
    };
  }

  // Learning intent -> latest course, framed as social proof.
  if (has('course', 'courses', 'learn', 'learning', 'skill', 'skills', 'training', 'study', 'upskill', 'class', 'bootcamp', 'tutorial', 'masterclass')) {
    if (latestCourse) return {
      reply: `A lot of people are learning this course right now 🔥 — thought you'd want to pick up this skill and add it to your list. Tap to start learning:`,
      cards: [{ type: 'course', id: latestCourse.slug || latestCourse.id }],
      suggestions: ['🎬 See my latest video', 'What services do you offer?'],
    };
  }

  // Motion intent -> latest motion graphics video.
  if (has('motion', 'graphics', 'explainer', 'animation', 'animate', 'reel', 'showreel', 'video', 'videos')) {
    if (latestMotion) return {
      reply: `We design motion graphics for brands 🎬 — here's the latest video we made. Want something like this for your brand?`,
      cards: [{ type: 'motion', id: latestMotion.id }],
      suggestions: ['What services do you offer?', 'Recommend a course'],
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
  const courses = getCourses().slice(0, 6).map((c) => ({ id: c.slug || c.id, title: c.title, subtitle: c.subtitle || c.description || '' }));
  const motion = getMotion().slice(0, 6).map((m) => ({ id: m.id, title: m.title, description: m.description || '' }));
  const nameLine = opts.name ? `\nThe visitor's name is ${opts.name}. Greet them by their first name and use it naturally now and then.` : '';

  return `You are PeroTech (handle @PeroTechie) — a real person speaking in first person, not a generic "AI assistant". You are a friendly, sharp, motivating founder who does motion graphics & ads, AI automation, and builds bootstrapped SaaS products. You're chatting with a visitor on your portfolio website.${nameLine}

Voice: warm, human, concise, a little playful. Genuinely read and understand what the visitor is asking — reference their actual words, and if a request is vague, ask one short clarifying question instead of guessing. Keep replies to 1–3 short sentences. Occasionally use an emoji. Never repeat the same canned line twice. Never claim to be an AI language model; you are PeroTech.

Your goals: greet visitors, truly understand what they need, answer helpfully, and recommend the most relevant content. When it helps, surface specific posts, products, services, courses, or motion videos from the catalog below by their id — the website will render rich preview cards for whatever you pick, so don't paste raw URLs. If nothing in the catalog fits, just answer conversationally with no cards.

Proactive nudges (use naturally, don't force):
- When someone shows interest in learning, skills, or growth, recommend the LATEST course (first id in COURSES) and mention that a lot of people are learning it right now — you thought they might want to add this skill to their list.
- When someone asks about motion graphics, video, animation, ads, or brand visuals, surface the LATEST motion video (first id in MOTION) and note that you design motion graphics for brands — "here's the latest video we made".

CATALOG (only reference these ids; COURSES and MOTION are newest-first):
POSTS: ${JSON.stringify(posts)}
PRODUCTS: ${JSON.stringify(products)}
SERVICES: ${JSON.stringify(services)}
COURSES: ${JSON.stringify(courses)}
MOTION: ${JSON.stringify(motion)}

Respond with ONLY a JSON object (no markdown, no backticks) in exactly this shape:
{"reply": "your message", "cards": [{"type":"post|product|service|course|motion","id":"<id from catalog>"}], "suggestions": ["short reply chip", "another chip"]}

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
