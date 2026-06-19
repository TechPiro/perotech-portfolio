// PeroTech chat — talks to /api/chat (Claude-powered when configured, else
// a smart rule-based PeroTech persona). Renders rich post/product/service cards.
document.addEventListener("DOMContentLoaded", () => {
  const messagesEl = document.getElementById("chat-messages");
  const input = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  if (!messagesEl || !input || !sendBtn) return;

  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const history = []; // [{role, content}]
  let busy = false;

  // ---- lead (name + email) capture ----
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  let lead = null;
  try { lead = JSON.parse(localStorage.getItem("pt_lead") || "null"); } catch (e) {}
  let leadCaptured = !!(lead && lead.email);
  let leadPrompts = 0, userTurns = 0;
  const leadName = () => (lead && lead.name) ? lead.name : "";

  const scroll = () => { messagesEl.scrollTop = messagesEl.scrollHeight; };

  function addBubble(text, who) {
    const div = document.createElement("div");
    div.className = "message " + (who === "user" ? "user-message" : "bot-message");
    div.textContent = text;
    messagesEl.appendChild(div);
    scroll();
    return div;
  }

  function cardHtml(c) {
    const img = c.image ? `<div class="cc-thumb"><img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.parentNode.style.display='none'"/>${c.badge ? `<span class="cc-badge ${esc(c.badge)}">${c.badge === "hot" ? "🔥 Hot" : "📈 Trending"}</span>` : ""}</div>` : "";
    const labels = { post: "Read article →", product: "Visit site ↗", service: c.cta ? esc(c.cta) + " →" : "Learn more →" };
    const target = c.external ? ` target="_blank" rel="noopener"` : "";
    const kind = c.type === "post" ? "Article" : c.type === "product" ? "Product" : "Service";
    return `<a class="chat-card ${esc(c.type)}" href="${esc(c.url)}"${target}>
      ${img}
      <div class="cc-body">
        <span class="cc-kind">${kind}</span>
        <div class="cc-title">${esc(c.title)}</div>
        ${c.text ? `<div class="cc-text">${esc(c.text)}</div>` : ""}
        <span class="cc-cta">${labels[c.type] || "Open →"}</span>
      </div>
    </a>`;
  }

  function addCards(cards) {
    if (!cards || !cards.length) return;
    const wrap = document.createElement("div");
    wrap.className = "chat-cards";
    wrap.innerHTML = cards.map(cardHtml).join("");
    messagesEl.appendChild(wrap);
    scroll();
  }

  function addSuggestions(suggestions) {
    if (!suggestions || !suggestions.length) return;
    const wrap = document.createElement("div");
    wrap.className = "chat-chips";
    suggestions.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chat-chip";
      b.textContent = s;
      b.addEventListener("click", () => { if (!busy) send(s); });
      wrap.appendChild(b);
    });
    messagesEl.appendChild(wrap);
    scroll();
  }

  function clearChips() { messagesEl.querySelectorAll(".chat-chips").forEach((e) => e.remove()); }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "message bot-message typing";
    div.id = "typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(div);
    scroll();
  }
  function hideTyping() { const t = document.getElementById("typing"); if (t) t.remove(); }

  async function callApi() {
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, name: leadName() }),
    });
    if (!res.ok) throw new Error("bad response");
    return res.json();
  }

  function showLeadForm() {
    if (leadCaptured) return;
    leadPrompts++;
    const wrap = document.createElement("div");
    wrap.className = "chat-lead";
    wrap.innerHTML = `
      <div class="cl-head">👋 Before we dive in…</div>
      <div class="cl-sub">Leave your name & email so PeroTech can follow up. (optional)</div>
      <input class="cl-name" placeholder="Your name" autocomplete="name" />
      <input class="cl-email" type="email" placeholder="you@email.com" autocomplete="email" />
      <div class="cl-err"></div>
      <div class="cl-actions"><button type="button" class="cl-skip">Skip</button><button type="button" class="cl-save">Save & continue</button></div>`;
    messagesEl.appendChild(wrap); scroll();
    const nameI = wrap.querySelector(".cl-name"), emailI = wrap.querySelector(".cl-email"), err = wrap.querySelector(".cl-err");
    if (lead && lead.name) nameI.value = lead.name;
    wrap.querySelector(".cl-skip").addEventListener("click", () => wrap.remove());
    wrap.querySelector(".cl-save").addEventListener("click", async () => {
      const name = nameI.value.trim(), email = emailI.value.trim();
      if (!name || !EMAIL_RE.test(email)) { err.textContent = "Please enter a valid name and email."; return; }
      const btn = wrap.querySelector(".cl-save"); btn.disabled = true; btn.textContent = "Saving…";
      try {
        const firstUser = history.find((m) => m.role === "user");
        const res = await fetch("/api/lead", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, firstMessage: firstUser ? firstUser.content : "" }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Could not save");
        lead = { id: d.id, name, email };
        localStorage.setItem("pt_lead", JSON.stringify(lead));
        leadCaptured = true;
        wrap.remove();
        addBubble(`Thanks, ${name.split(" ")[0]}! 🙌 So, how can I help you today?`, "bot");
      } catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = "Save & continue"; }
    });
  }

  async function render(promise) {
    busy = true; sendBtn.disabled = true; clearChips();
    showTyping();
    try {
      const data = await promise;
      // small human-like delay
      await new Promise((r) => setTimeout(r, 350));
      hideTyping();
      const reply = data.reply || "…";
      addBubble(reply, "bot");
      history.push({ role: "assistant", content: reply });
      addCards(data.cards);
      addSuggestions(data.suggestions);
    } catch (e) {
      hideTyping();
      addBubble("Hmm, I couldn't reach the server. Please try again in a moment.", "bot");
    } finally {
      busy = false; sendBtn.disabled = false; input.focus();
      // Re-offer the lead form once if the visitor skipped it earlier.
      if (!leadCaptured && leadPrompts < 2 && userTurns >= 3) showLeadForm();
    }
  }

  function send(text) {
    text = (text || input.value).trim();
    if (!text || busy) return;
    input.value = "";
    userTurns++;
    addBubble(text, "user");
    history.push({ role: "user", content: text });
    render(callApi());
  }

  sendBtn.addEventListener("click", () => send());
  input.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });

  // Initial greeting (server returns welcome + a recent post + suggestions),
  // then ask the visitor to introduce themselves.
  render(callApi()).then(() => { if (!leadCaptured) showLeadForm(); });
});
