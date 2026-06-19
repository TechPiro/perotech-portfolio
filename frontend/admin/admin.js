/* ===== PeroTech Admin ===== */
const API = "/api/admin";
let TOKEN = localStorage.getItem("pt_admin_token") || "";
let USER = localStorage.getItem("pt_admin_user") || "admin";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return d; } };

async function api(method, p, body) {
  const res = await fetch(API + p, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { logout(); throw new Error("Session expired — please sign in again."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ---------- toast ---------- */
function toast(msg, type) {
  const wrap = $("#toasts");
  const t = document.createElement("div");
  t.className = "adm-toast" + (type === "err" ? " err" : "");
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 3500);
}

/* ---------- auth ---------- */
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#login-err").textContent = "";
  try {
    const res = await fetch(API + "/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: $("#login-user").value, password: $("#login-pass").value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    TOKEN = data.token; USER = data.user;
    localStorage.setItem("pt_admin_token", TOKEN);
    localStorage.setItem("pt_admin_user", USER);
    showApp();
  } catch (err) { $("#login-err").textContent = err.message; }
});

$("#logout").addEventListener("click", logout);
function logout() {
  TOKEN = ""; localStorage.removeItem("pt_admin_token");
  $("#app").classList.add("hidden"); $("#login").classList.remove("hidden");
}

function showApp() {
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#who-user").textContent = USER;
  go("dashboard");
}

/* ---------- nav ---------- */
$$(".nav-link[data-view]").forEach((a) =>
  a.addEventListener("click", () => go(a.dataset.view))
);
const TITLES = { dashboard: "Dashboard", posts: "Blog Posts", motion: "Motion Projects", products: "Products", services: "Services", timeline: "Timeline", tools: "Favorite Tools", videos: "YouTube Videos", subscribers: "Subscribers", comments: "Comments", leads: "Chat Leads", broadcast: "Bulk Email", settings: "Settings" };
function go(view) {
  $$(".nav-link[data-view]").forEach((a) => a.classList.toggle("active", a.dataset.view === view));
  $("#view-title").textContent = TITLES[view] || view;
  $("#view").innerHTML = '<div class="empty">Loading…</div>';
  (VIEWS[view] || (() => {}))();
}

/* ---------- modal ---------- */
function openModal(title, bodyHtml) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = bodyHtml;
  $("#modal").classList.add("open");
}
function closeModal() { $("#modal").classList.remove("open"); $("#modal-body").innerHTML = ""; }
$("#modal-close").addEventListener("click", closeModal);
$("#modal").addEventListener("click", (e) => { if (e.target === $("#modal")) closeModal(); });

/* =========================================================
   VIEWS
   ========================================================= */
const VIEWS = {};

/* ---- Dashboard ---- */
const sparkBars = (arr) => {
  const max = Math.max(1, ...arr);
  return `<div class="spark">${arr.map((v) => `<span style="height:${Math.max(8, (v / max) * 100)}%"></span>`).join("")}</div>`;
};
const changeBadge = (n) => {
  const up = n >= 0;
  return `<span class="chg ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(n)}%</span>`;
};
const richCard = (label, value, change, spark, accent) =>
  `<div class="stat rich">
    <div class="stat-top"><span class="label">${label}</span>${change !== undefined ? changeBadge(change) : ""}</div>
    <div class="value">${value}</div>
    ${spark ? sparkBars(spark) : ""}
  </div>`;

VIEWS.dashboard = async () => {
  try {
    const s = await api("GET", "/stats");
    const t = s.totals;
    const max = Math.max(1, ...s.series.map((d) => d.count));
    const topMax = Math.max(1, ...s.topPages.map((p) => p.count));
    const sg = s.suggestion || { headline: "", tips: [] };

    // donut for top pages
    const palette = ["#4770ff", "#7c4dff", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#ec4899", "#14b8a6"];
    const totalTop = s.topPages.reduce((a, p) => a + p.count, 0) || 1;
    let acc = 0;
    const donutStops = s.topPages.map((p, i) => {
      const start = (acc / totalTop) * 360; acc += p.count; const end = (acc / totalTop) * 360;
      return `${palette[i % palette.length]} ${start}deg ${end}deg`;
    }).join(", ");

    const c = s.content || {};
    const cc = (label, view, count, sub) =>
      `<a class="content-card" data-go="${view}"><div class="cc-label">${label}</div><div class="cc-count">${count}</div><div class="cc-sub">${sub}</div></a>`;

    $("#view").innerHTML = `
      <div class="stat-grid five">
        ${richCard("New visitors", t.visits, s.changes.visits, s.sparks.visits)}
        ${richCard("Unique visitors", t.uniqueVisitors, s.changes.uniques, s.sparks.uniques)}
        ${richCard("Subscribers", t.subscribers, s.changes.subs, s.sparks.subs)}
        ${richCard("Visits today", t.visitsToday, undefined, s.sparks.visits)}
        ${richCard("Content", t.posts + t.motion + t.products, undefined, undefined)}
      </div>

      <div class="dash-row">
        <div class="panel grow">
          <div class="panel-head"><h3>New visitors</h3><span class="muted">Last 7 days</span></div>
          <div class="chart big">
            ${s.series.map((d) => `<div class="bar-col"><span class="bar-val">${d.count}</span><div class="bar ${d.count === max ? "hot" : ""}" style="height:${Math.max(4, (d.count / max) * 100)}%"></div><span class="bar-lbl">${d.label}</span></div>`).join("")}
          </div>
        </div>
        <div class="panel map-panel">
          <div class="panel-head"><h3>Influence map</h3><span class="muted">Visitors</span></div>
          <div id="vmap"></div>
          <div class="country-list">
            ${s.countries.length ? s.countries.map((c) => `<div class="crow"><span class="cflag">${c.flag}</span><span class="cname">${esc(c.name)}</span><span class="cbar"><span style="width:${c.pct}%"></span></span><b>${c.pct}%</b></div>`).join("") : '<div class="empty">No location data yet.</div>'}
          </div>
        </div>
      </div>

      <div class="panel suggestion">
        <div class="sug-icon">💡</div>
        <div class="sug-body">
          <div class="sug-head">Smart suggestion — convert your top market</div>
          <div class="sug-headline">${sg.headline}</div>
          <ul class="sug-tips">${(sg.tips || []).map((tip) => `<li>${tip}</li>`).join("")}</ul>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Content overview</h3><span class="muted">click a card to manage</span></div>
        <div class="content-grid">
          ${cc("Blog Posts", "posts", (c.posts || {}).count || 0, ((c.posts || {}).views || 0) + " views")}
          ${cc("Motion", "motion", (c.motion || {}).count || 0, ((c.motion || {}).views || 0) + " views")}
          ${cc("Products", "products", (c.products || {}).count || 0, ((c.products || {}).views || 0) + " views")}
          ${cc("Timeline", "timeline", (c.timeline || {}).count || 0, "entries")}
          ${cc("YouTube", "videos", (c.videos || {}).count || 0, "videos")}
          ${cc("Subscribers", "subscribers", (c.subscribers || {}).count || 0, ((c.subscribers || {}).views || 0) + " page views")}
        </div>
        ${s.topArticles && s.topArticles.length ? `<div class="top-articles"><div class="ta-head">Most viewed articles</div>${s.topArticles.map((a) => `<div class="ta-row"><span class="ta-title">${esc(a.title)}</span><b>${a.views} views</b></div>`).join("")}</div>` : ""}
      </div>

      <div class="dash-row">
        <div class="panel">
          <div class="panel-head"><h3>Traffic by page</h3></div>
          <div class="donut-wrap">
            <div class="donut" style="background:conic-gradient(${donutStops || "#222 0deg 360deg"})"><div class="donut-hole"><b>${t.visits}</b><span>visits</span></div></div>
            <div class="donut-legend">
              ${s.topPages.slice(0, 6).map((p, i) => `<div class="leg"><span class="dot" style="background:${palette[i % palette.length]}"></span><span class="lname">${esc(p.path)}</span><b>${p.count}</b></div>`).join("")}
            </div>
          </div>
        </div>
        <div class="panel grow">
          <div class="panel-head"><h3>Recent activity</h3></div>
          ${s.recent.length ? `<table class="table"><thead><tr><th>Page</th><th>From</th><th>When</th></tr></thead><tbody>
            ${s.recent.map((r) => `<tr><td>${esc(r.path)}</td><td class="muted">${r.country ? r.country : "—"}</td><td class="muted">${timeAgo(r.ts)}</td></tr>`).join("")}
          </tbody></table>` : '<div class="empty">No activity yet.</div>'}
        </div>
      </div>`;

    // Render the world map (markers + choropleth) if the library loaded
    if (window.jsVectorMap && document.getElementById("vmap")) {
      const values = {}; s.countries.forEach((c) => (values[c.code] = c.count));
      try {
        new window.jsVectorMap({
          selector: "#vmap", map: "world", zoomButtons: false, backgroundColor: "transparent",
          regionStyle: { initial: { fill: "#222a3f" }, hover: { fill: "#33405e" } },
          markers: s.countries.map((c) => ({ name: `${c.name}: ${c.count}`, coords: [c.lat, c.lng] })),
          markerStyle: { initial: { fill: "#4770ff", stroke: "#0b0c11", "stroke-width": 1.5, r: 6 }, hover: { fill: "#7c4dff" } },
          series: { regions: [{ attribute: "fill", scale: ["#2a3760", "#4770ff"], normalizeFunction: "polynomial", values }] },
        });
      } catch (e) { /* map optional */ }
    }

    // content cards navigate to their section
    $$("[data-go]").forEach((el) => el.addEventListener("click", () => go(el.dataset.go)));
  } catch (e) { $("#view").innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
};
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

/* ---- Blog Posts ---- */
VIEWS.posts = async () => {
  const posts = await api("GET", "/posts");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${posts.length} post(s)</h3><button class="btn sm" id="new-post">+ New Post</button></div>
      ${posts.length ? `<table class="table"><thead><tr><th>Title</th><th>Category</th><th>Date</th><th></th></tr></thead><tbody>
        ${posts.map((p) => `<tr>
          <td><b>${esc(p.title)}</b><div class="muted" style="font-size:.8rem">/${esc(p.slug || p.id)}</div></td>
          <td><span class="pill">${esc(p.category || "—")}</span>${p.badge ? ` <span class="pill ${esc(p.badge)}">${esc(p.badge)}</span>` : ""}</td>
          <td class="muted">${fmtDate(p.date)}</td>
          <td><div class="actions">
            <a class="btn ghost sm" href="/article.html?slug=${encodeURIComponent(p.slug || p.id)}" target="_blank">View</a>
            <button class="btn ghost sm" data-edit="${esc(p.id)}">Edit</button>
            <button class="btn danger sm" data-del="${esc(p.id)}">Delete</button>
          </div></td></tr>`).join("")}
      </tbody></table>` : '<div class="empty">No posts yet. Click “New Post”.</div>'}
    </div>`;
  $("#new-post").addEventListener("click", () => postEditor());
  $$("[data-edit]").forEach((b) => b.addEventListener("click", () => postEditor(posts.find((p) => p.id === b.dataset.edit))));
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    await api("DELETE", "/posts/" + encodeURIComponent(b.dataset.del));
    toast("Post deleted"); go("posts");
  }));
};

const BLOCK_TYPES = ["paragraph", "heading", "subheading", "list", "quote", "image", "video", "code", "file"];
let __blkUid = 0;
// Upload-enabled input for a block field (lets you pick a file from your device).
function blkUpload(label, fieldName, val, accept, opts) {
  opts = opts || {};
  const uid = "blk" + ++__blkUid;
  const extra = (opts.nameTarget ? ` data-name-target="${opts.nameTarget}"` : "") + (opts.sizeTarget ? ` data-size-target="${opts.sizeTarget}"` : "");
  const isImg = /image/.test(accept || "");
  const prev = val && isImg ? `<img src="/${esc(val)}" alt="" onerror="this.style.display='none'"/>` : (val ? `<span class="upload-chip">${esc(val)}</span>` : "");
  return `<div class="field"><label>${label}</label>
    <div class="upload-row">
      <input class="input" id="${uid}" data-field="${fieldName}" value="${esc(val)}" placeholder="paste a path/URL or click Upload →" />
      <label class="btn ghost sm upload-label">Upload<input type="file" accept="${accept || "image/*"}" data-target="${uid}"${extra} style="display:none"></label>
    </div>
    <div class="upload-prev" id="${uid}-prev">${prev}</div>
  </div>`;
}
function blockCard(b) {
  b = b || { type: "paragraph" };
  const f = (label, field, val, ta) => ta
    ? `<div class="field"><label>${label}</label><textarea class="textarea" data-field="${field}">${esc(val)}</textarea></div>`
    : `<div class="field"><label>${label}</label><input class="input" data-field="${field}" value="${esc(val)}" /></div>`;
  let fields = "";
  if (b.type === "paragraph" || b.type === "quote") fields = f("Text (HTML allowed)", "text", b.text || "", true);
  else if (b.type === "heading" || b.type === "subheading") fields = f("Text", "text", b.text || "");
  else if (b.type === "list") fields = f("Items (one per line)", "items", (b.items || []).join("\n"), true);
  else if (b.type === "image") fields = blkUpload("Image — upload from your device, or paste a URL", "src", b.src || "", "image/*") + f("Caption", "caption", b.caption || "");
  else if (b.type === "video") fields = `<div class="field"><label>Kind</label><select class="select" data-field="kind">${["mp4", "youtube", "vimeo"].map((k) => `<option ${b.kind === k ? "selected" : ""}>${k}</option>`).join("")}</select></div>` + blkUpload("Video — upload an MP4 from your device, or paste a YouTube/Vimeo ID", "src", b.src || "", "video/*") + f("Caption", "caption", b.caption || "");
  else if (b.type === "code") fields = f("Language", "language", b.language || "js") + f("Code", "code", b.code || "", true);
  else if (b.type === "file") {
    const nmId = "blk" + ++__blkUid, szId = "blk" + ++__blkUid;
    fields =
      `<div class="field"><label>File name</label><input class="input" id="${nmId}" data-field="name" value="${esc(b.name || "")}" /></div>` +
      blkUpload("File — upload from your device (PDF, zip, txt …)", "src", b.src || "", "*/*", { nameTarget: nmId, sizeTarget: szId }) +
      `<div class="field"><label>Size</label><input class="input" id="${szId}" data-field="size" value="${esc(b.size || "")}" /></div>`;
  }
  return `<div class="block-card" data-type="${b.type}">
    <div class="bc-head"><span class="bc-type">${b.type}</span>
      <div class="bc-tools">
        <button type="button" class="icon-btn" data-move="up">↑</button>
        <button type="button" class="icon-btn" data-move="down">↓</button>
        <button type="button" class="icon-btn" data-remove>✕</button>
      </div>
    </div>${fields}</div>`;
}
function collectBlocks(container) {
  return $$(".block-card", container).map((card) => {
    const type = card.dataset.type;
    const out = { type };
    $$("[data-field]", card).forEach((el) => {
      const k = el.dataset.field;
      if (k === "items") out.items = el.value.split("\n").map((x) => x.trim()).filter(Boolean);
      else out[k] = el.value;
    });
    return out;
  });
}

function postEditor(post) {
  post = post || {};
  const isEdit = !!post.id;
  const today = new Date().toISOString().slice(0, 10);
  openModal(isEdit ? "Edit Post" : "New Post", `
    <div class="grid-2">
      ${field("Title", "p-title", post.title || "")}
      ${field("Category", "p-category", post.category || "Tutorial")}
    </div>
    <div class="grid-2">
      <div class="field"><label>Badge (highlights the post on the blog page)</label>
        <select class="select" id="p-badge">
          ${[["", "None"], ["hot", "🔥 Hot"], ["trending", "📈 Trending"]].map(([v, l]) => `<option value="${v}" ${(post.badge || "") === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>
      ${field("Read time", "p-read", post.readTime || "4 min read")}
    </div>
    ${field("Excerpt", "p-excerpt", post.excerpt || "", true)}
    ${uploadField("Cover image", "p-cover", post.cover || "")}
    <div class="grid-2">
      ${field("Author", "p-author", post.author || "PeroTech")}
      ${field("Date", "p-date", post.date || today)}
    </div>
    <h3 style="margin:18px 0 6px">Content blocks</h3>
    <div class="help">Build the article from blocks — add text, images, videos, code, files and more in any order.</div>
    <div class="blocks-toolbar" id="bt">${BLOCK_TYPES.map((t) => `<button type="button" class="btn ghost sm" data-add="${t}">+ ${t}</button>`).join("")}</div>
    <div id="blocks">${(post.blocks || [{ type: "paragraph", text: "" }]).map(blockCard).join("")}</div>
    <div class="form-actions">
      <button class="btn ghost" id="cancel">Cancel</button>
      <button class="btn" id="save">${isEdit ? "Save changes" : "Publish post"}</button>
    </div>`);

  const blocks = $("#blocks");
  $("#bt").addEventListener("click", (e) => {
    const t = e.target.dataset.add; if (!t) return;
    blocks.insertAdjacentHTML("beforeend", blockCard({ type: t }));
  });
  blocks.addEventListener("click", (e) => {
    const card = e.target.closest(".block-card"); if (!card) return;
    if (e.target.dataset.remove !== undefined) card.remove();
    if (e.target.dataset.move === "up" && card.previousElementSibling) card.parentNode.insertBefore(card, card.previousElementSibling);
    if (e.target.dataset.move === "down" && card.nextElementSibling) card.parentNode.insertBefore(card.nextElementSibling, card);
  });
  $("#cancel").addEventListener("click", closeModal);
  $("#save").addEventListener("click", async () => {
    const payload = {
      title: $("#p-title").value.trim(),
      category: $("#p-category").value.trim(),
      badge: $("#p-badge").value,
      excerpt: $("#p-excerpt").value.trim(),
      cover: $("#p-cover").value.trim(),
      readTime: $("#p-read").value.trim(),
      author: $("#p-author").value.trim(),
      date: $("#p-date").value,
      blocks: collectBlocks(blocks),
    };
    if (!payload.title) return toast("Title is required", "err");
    try {
      if (isEdit) await api("PUT", "/posts/" + encodeURIComponent(post.id), payload);
      else await api("POST", "/posts", payload);
      toast("Post saved"); closeModal(); go("posts");
    } catch (e) { toast(e.message, "err"); }
  });
}

/* ---- Motion ---- */
VIEWS.motion = async () => {
  const items = await api("GET", "/motion");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${items.length} project(s)</h3><button class="btn sm" id="new">+ New Project</button></div>
      ${items.length ? `<table class="table"><thead><tr><th></th><th>Title</th><th>Client</th><th>Category</th><th></th></tr></thead><tbody>
        ${items.map((m) => `<tr>
          <td><img class="thumb-sm" src="/${esc(m.thumb || "")}" onerror="this.style.visibility='hidden'"/></td>
          <td><b>${esc(m.title)}</b></td><td class="muted">${esc(m.client || "")}</td>
          <td><span class="pill">${esc(m.category || "")}</span></td>
          <td><div class="actions"><button class="btn ghost sm" data-edit="${esc(m.id)}">Edit</button><button class="btn danger sm" data-del="${esc(m.id)}">Delete</button></div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No projects yet.</div>'}
    </div>`;
  $("#new").addEventListener("click", () => motionEditor());
  $$("[data-edit]").forEach((b) => b.addEventListener("click", () => motionEditor(items.find((m) => m.id === b.dataset.edit))));
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete project?")) return; await api("DELETE", "/motion/" + encodeURIComponent(b.dataset.del)); toast("Deleted"); go("motion"); }));
};
function motionEditor(m) {
  m = m || {}; const isEdit = !!m.id;
  openModal(isEdit ? "Edit Project" : "New Project", `
    <div class="grid-2">${field("Title", "m-title", m.title || "")}${field("Client", "m-client", m.client || "")}</div>
    <div class="grid-2">${field("Category", "m-cat", m.category || "Ads")}${field("Duration", "m-dur", m.duration || "0:30")}</div>
    <div class="field"><label>Video kind</label><select class="select" id="m-kind">${["mp4", "youtube", "vimeo"].map((k) => `<option ${m.type === k ? "selected" : ""}>${k}</option>`).join("")}</select></div>
    ${uploadField("Video (upload mp4) or paste a YouTube/Vimeo ID", "m-src", m.src || "", "video/*")}
    ${uploadField("Thumbnail", "m-thumb", m.thumb || "")}
    ${field("Description", "m-desc", m.description || "", true)}
    <div class="form-actions"><button class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">${isEdit ? "Save" : "Create"}</button></div>`);
  $("#cancel").addEventListener("click", closeModal);
  $("#save").addEventListener("click", async () => {
    const payload = { title: $("#m-title").value.trim(), client: $("#m-client").value.trim(), category: $("#m-cat").value.trim(), duration: $("#m-dur").value.trim(), type: $("#m-kind").value, src: $("#m-src").value.trim(), thumb: $("#m-thumb").value.trim(), description: $("#m-desc").value.trim() };
    if (!payload.title) return toast("Title required", "err");
    try { if (isEdit) await api("PUT", "/motion/" + encodeURIComponent(m.id), payload); else await api("POST", "/motion", payload); toast("Saved"); closeModal(); go("motion"); } catch (e) { toast(e.message, "err"); }
  });
}

/* ---- Products ---- */
VIEWS.products = async () => {
  const items = await api("GET", "/products");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${items.length} product(s)</h3><button class="btn sm" id="new">+ New Product</button></div>
      ${items.length ? `<table class="table"><thead><tr><th></th><th>Title</th><th>Subtitle</th><th>URL</th><th></th></tr></thead><tbody>
        ${items.map((p) => `<tr>
          <td><img class="thumb-sm" src="/${esc(p.image || "")}" onerror="this.style.visibility='hidden'"/></td>
          <td><b>${esc(p.title)}</b></td><td class="muted">${esc(p.subtitle || "")}</td>
          <td class="muted" style="font-size:.8rem">${esc(p.url || "")}</td>
          <td><div class="actions"><button class="btn ghost sm" data-edit="${esc(p.id)}">Edit</button><button class="btn danger sm" data-del="${esc(p.id)}">Delete</button></div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No products yet.</div>'}
    </div>`;
  $("#new").addEventListener("click", () => productEditor());
  $$("[data-edit]").forEach((b) => b.addEventListener("click", () => productEditor(items.find((p) => p.id === b.dataset.edit))));
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete product?")) return; await api("DELETE", "/products/" + encodeURIComponent(b.dataset.del)); toast("Deleted"); go("products"); }));
};
function productEditor(p) {
  p = p || {}; const isEdit = !!p.id;
  openModal(isEdit ? "Edit Product" : "New Product", `
    <div class="grid-2">${field("Title", "pr-title", p.title || "")}${field("Subtitle", "pr-sub", p.subtitle || "")}</div>
    ${field("Website URL", "pr-url", p.url || "https://")}
    ${uploadField("Image", "pr-img", p.image || "")}
    <div class="form-actions"><button class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">${isEdit ? "Save" : "Create"}</button></div>`);
  $("#cancel").addEventListener("click", closeModal);
  $("#save").addEventListener("click", async () => {
    const payload = { title: $("#pr-title").value.trim(), subtitle: $("#pr-sub").value.trim(), url: $("#pr-url").value.trim(), image: $("#pr-img").value.trim() };
    if (!payload.title) return toast("Title required", "err");
    try { if (isEdit) await api("PUT", "/products/" + encodeURIComponent(p.id), payload); else await api("POST", "/products", payload); toast("Saved"); closeModal(); go("products"); } catch (e) { toast(e.message, "err"); }
  });
}

/* ---- Services ---- */
VIEWS.services = async () => {
  const items = await api("GET", "/services");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${items.length} service(s) — shown by the chatbot &amp; suggestions</h3><button class="btn sm" id="new">+ New Service</button></div>
      ${items.length ? `<table class="table"><thead><tr><th></th><th>Title</th><th>Subtitle</th><th>Link</th><th></th></tr></thead><tbody>
        ${items.map((s) => `<tr>
          <td><img class="thumb-sm" src="/${esc(s.image || "")}" onerror="this.style.visibility='hidden'"/></td>
          <td><b>${esc(s.title)}</b></td><td class="muted">${esc(s.subtitle || "")}</td>
          <td class="muted" style="font-size:.8rem">${esc(s.url || "")}</td>
          <td><div class="actions"><button class="btn ghost sm" data-edit="${esc(s.id)}">Edit</button><button class="btn danger sm" data-del="${esc(s.id)}">Delete</button></div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No services yet.</div>'}
    </div>`;
  $("#new").addEventListener("click", () => serviceEditor());
  $$("[data-edit]").forEach((b) => b.addEventListener("click", () => serviceEditor(items.find((s) => s.id === b.dataset.edit))));
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete service?")) return; await api("DELETE", "/services/" + encodeURIComponent(b.dataset.del)); toast("Deleted"); go("services"); }));
};
function serviceEditor(s) {
  s = s || {}; const isEdit = !!s.id;
  openModal(isEdit ? "Edit Service" : "New Service", `
    ${field("Title", "sv-title", s.title || "")}
    ${field("Subtitle / short description", "sv-sub", s.subtitle || "", true)}
    ${uploadField("Thumbnail image", "sv-img", s.image || "")}
    <div class="grid-2">${field("Link (page or URL)", "sv-url", s.url || "chat.html")}${field("Button text", "sv-cta", s.cta || "Learn more")}</div>
    <div class="form-actions"><button class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">${isEdit ? "Save" : "Create"}</button></div>`);
  $("#cancel").addEventListener("click", closeModal);
  $("#save").addEventListener("click", async () => {
    const payload = { title: $("#sv-title").value.trim(), subtitle: $("#sv-sub").value.trim(), image: $("#sv-img").value.trim(), url: $("#sv-url").value.trim(), cta: $("#sv-cta").value.trim() };
    if (!payload.title) return toast("Title required", "err");
    try { if (isEdit) await api("PUT", "/services/" + encodeURIComponent(s.id), payload); else await api("POST", "/services", payload); toast("Saved"); closeModal(); go("services"); } catch (e) { toast(e.message, "err"); }
  });
}

/* ---- Comments moderation ---- */
VIEWS.comments = async () => {
  const items = await api("GET", "/comments");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${items.length} comment(s)</h3></div>
      ${items.length ? `<table class="table"><thead><tr><th>Author</th><th>Comment</th><th>On post</th><th>When</th><th></th></tr></thead><tbody>
        ${items.map((c) => `<tr>
          <td><b>${esc(c.name)}</b></td>
          <td>${esc(c.text)}</td>
          <td class="muted">${esc(c.postTitle || c.postId)}</td>
          <td class="muted">${fmtDate(c.date)}</td>
          <td><div class="actions">
            <a class="btn ghost sm" href="/article.html?slug=${encodeURIComponent(c.postId)}#comments" target="_blank">View</a>
            <button class="btn danger sm" data-del="${esc(c.id)}">Delete</button>
          </div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No comments yet.</div>'}
    </div>`;
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete this comment?")) return; await api("DELETE", "/comments/" + encodeURIComponent(b.dataset.del)); toast("Comment deleted"); go("comments"); }));
};

/* ---- Chat Leads ---- */
VIEWS.leads = async () => {
  const leads = await api("GET", "/leads");
  const loc = (l) => {
    const parts = [l.city, l.region].filter(Boolean).join(", ");
    const country = l.countryName || l.country || "";
    return [l.flag, [parts, country].filter(Boolean).join(" · ")].filter(Boolean).join(" ") || '<span class="muted">Unknown</span>';
  };
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${leads.length} chat lead(s) — captured from the “Let’s chat” bot</h3>
        <button class="btn ghost sm" id="email-all" ${leads.length ? "" : "disabled"}>Email all</button></div>
      <div class="help">People who introduced themselves in the chatbot, with the region they messaged from.</div>
      ${leads.length ? `<table class="table"><thead><tr><th>Name</th><th>Email</th><th>Location</th><th>Chats</th><th>First message</th><th>When</th><th></th></tr></thead><tbody>
        ${leads.map((l) => `<tr>
          <td><b>${esc(l.name)}</b></td>
          <td><a href="mailto:${esc(l.email)}" style="color:var(--accent)">${esc(l.email)}</a></td>
          <td>${loc(l)}</td>
          <td class="muted">${l.chats || 1}</td>
          <td class="muted" style="max-width:240px;font-size:.82rem">${esc(l.firstMessage || "—")}</td>
          <td class="muted">${fmtDate(l.date)}</td>
          <td><div class="actions"><button class="btn danger sm" data-del="${esc(l.id)}">Delete</button></div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No chat leads yet. They appear when visitors share their name & email in the chat.</div>'}
    </div>`;
  const ea = $("#email-all");
  if (ea) ea.addEventListener("click", () => {
    const emails = leads.map((l) => l.email).filter(Boolean).join(",");
    if (emails) window.location.href = "mailto:?bcc=" + encodeURIComponent(emails);
  });
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete this lead?")) return; await api("DELETE", "/leads/" + encodeURIComponent(b.dataset.del)); toast("Lead deleted"); go("leads"); }));
};

/* ---- Subscribers ---- */
VIEWS.subscribers = async () => {
  const subs = await api("GET", "/subscribers");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${subs.length} subscriber(s)</h3>
        <div style="display:flex;gap:8px"><button class="btn ghost sm" id="email-sel">Email selected</button><button class="btn sm" id="email-all">Email all</button></div>
      </div>
      ${subs.length ? `<table class="table"><thead><tr><th><input type="checkbox" class="checkbox" id="chk-all"></th><th>Name</th><th>Email</th><th>Joined</th><th></th></tr></thead><tbody>
        ${subs.map((s) => `<tr>
          <td><input type="checkbox" class="checkbox sub-chk" value="${esc(s.id)}"></td>
          <td><b>${esc(s.name || "—")}</b></td><td>${esc(s.email)}</td><td class="muted">${fmtDate(s.date)}</td>
          <td><div class="actions"><button class="btn danger sm" data-del="${esc(s.id)}">Delete</button></div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No subscribers yet.</div>'}
    </div>`;
  const chkAll = $("#chk-all");
  if (chkAll) chkAll.addEventListener("change", () => $$(".sub-chk").forEach((c) => (c.checked = chkAll.checked)));
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete subscriber?")) return; await api("DELETE", "/subscribers/" + encodeURIComponent(b.dataset.del)); toast("Removed"); go("subscribers"); }));
  $("#email-all").addEventListener("click", () => go("broadcast"));
  $("#email-sel").addEventListener("click", () => {
    const ids = $$(".sub-chk").filter((c) => c.checked).map((c) => c.value);
    if (!ids.length) return toast("Select at least one subscriber", "err");
    sessionStorage.setItem("pt_recipients", JSON.stringify(ids));
    go("broadcast");
  });
};

/* ---- Bulk Email ---- */
const EMAIL_BLOCK_TYPES = ["paragraph", "heading", "image", "button", "video", "file", "divider"];
function emailBlockCard(b) {
  b = b || { type: "paragraph" };
  const f = (label, fld, val, ta) => ta
    ? `<div class="field"><label>${label}</label><textarea class="textarea" data-field="${fld}">${esc(val)}</textarea></div>`
    : `<div class="field"><label>${label}</label><input class="input" data-field="${fld}" value="${esc(val)}" /></div>`;
  let fields = "";
  if (b.type === "paragraph") fields = f("Text (HTML allowed — use &lt;b&gt;, &lt;a href&gt; …)", "text", b.text || "", true);
  else if (b.type === "heading") fields = f("Heading text", "text", b.text || "");
  else if (b.type === "button") fields = `<div class="grid-2">${f("Button label", "label", b.label || "Read more")}${f("Button links to (URL)", "url", b.url || "https://")}</div>`;
  else if (b.type === "image") fields = blkUpload("Image — upload from your device, or paste a URL", "src", b.src || "", "image/*") + `<div class="grid-2">${f("Caption / alt text", "caption", b.caption || "")}${f("Image links to (optional URL)", "url", b.url || "")}</div>`;
  else if (b.type === "video") fields = f("Video link the viewer opens (YouTube/Vimeo/any URL)", "url", b.url || "https://") + blkUpload("Poster image (optional — auto-uses YouTube thumbnail if blank)", "poster", b.poster || "", "image/*") + f("Caption", "caption", b.caption || "");
  else if (b.type === "file") {
    const nmId = "blk" + ++__blkUid, szId = "blk" + ++__blkUid;
    fields =
      `<div class="field"><label>File name</label><input class="input" id="${nmId}" data-field="name" value="${esc(b.name || "")}" /></div>` +
      blkUpload("File — upload from your device (PDF, zip, txt …)", "src", b.src || "", "*/*", { nameTarget: nmId, sizeTarget: szId }) +
      `<div class="field"><label>Size</label><input class="input" id="${szId}" data-field="size" value="${esc(b.size || "")}" /></div>`;
  } else if (b.type === "divider") fields = `<div class="help">A horizontal divider line.</div>`;
  return `<div class="block-card" data-type="${b.type}">
    <div class="bc-head"><span class="bc-type">${b.type}</span>
      <div class="bc-tools">
        <button type="button" class="icon-btn" data-move="up">↑</button>
        <button type="button" class="icon-btn" data-move="down">↓</button>
        <button type="button" class="icon-btn" data-remove>✕</button>
      </div>
    </div>${fields}</div>`;
}

// Client-side approximation of the sent email (for the Preview window)
function clientEmailHtml(blocks, heading) {
  const abs = (s) => !s ? "" : (/^https?:\/\//i.test(s) ? s : "/" + String(s).replace(/^\//, ""));
  const yt = (u) => { const m = String(u || "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/); return m ? m[1] : null; };
  const istyle = "display:block;width:100%;max-width:544px;border-radius:12px;margin:0 auto;";
  const cap = (t) => t ? `<div style="text-align:center;color:#9aa4b2;font-size:13px;margin-top:8px;">${esc(t)}</div>` : "";
  const body = (blocks || []).map((b) => {
    switch (b.type) {
      case "heading": return `<h2 style="font-size:21px;color:#1a202c;margin:26px 0 12px;">${esc(b.text || "")}</h2>`;
      case "paragraph": return `<p style="margin:0 0 16px;">${b.text || ""}</p>`;
      case "divider": return `<hr style="border:none;border-top:1px solid #e6ebf1;margin:26px 0;">`;
      case "button": return b.url ? `<p style="margin:8px 0 20px;"><a href="${esc(b.url)}" style="display:inline-block;padding:12px 26px;background:#4770ff;color:#fff;font-weight:bold;text-decoration:none;border-radius:999px;">${esc(b.label || "Learn more")}</a></p>` : "";
      case "image": { if (!b.src) return ""; const img = `<img src="${abs(b.src)}" alt="${esc(b.caption || "")}" style="${istyle}">`; return `<div style="margin:18px 0;">${b.url ? `<a href="${esc(b.url)}">${img}</a>` : img}${cap(b.caption)}</div>`; }
      case "video": { const id = yt(b.url); const poster = b.poster ? abs(b.poster) : (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ""); const link = esc(b.url || ""); return `<div style="margin:18px 0;text-align:center;">${poster ? `<a href="${link}"><img src="${poster}" style="${istyle}"></a>` : ""}<p style="margin:12px 0 0;"><a href="${link}" style="display:inline-block;padding:11px 24px;background:#4770ff;color:#fff;font-weight:bold;text-decoration:none;border-radius:999px;">▶ Watch the video</a></p>${cap(b.caption)}</div>`; }
      case "file": return `<div style="margin:18px 0;border:1px solid #e6ebf1;border-radius:12px;padding:14px 16px;background:#f7f9fc;display:flex;align-items:center;gap:12px;"><span style="font-size:24px;">📎</span><span style="flex:1;color:#1a202c;font-weight:bold;">${esc(b.name || "Download")}${b.size ? ` <span style="color:#9aa4b2;font-weight:normal;">· ${esc(b.size)}</span>` : ""}</span><a href="${abs(b.src)}" style="padding:9px 18px;background:#4770ff;color:#fff;font-weight:bold;text-decoration:none;border-radius:999px;">Download</a></div>`;
      default: return "";
    }
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Email preview</title></head>
    <body style="margin:0;background:#edf2f7;font-family:Arial,Helvetica,sans-serif;">
    <div style="padding:28px 12px;"><div style="max-width:600px;margin:0 auto;">
      <div style="background:#e3eaf3;border-radius:14px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:10px;"><img src="/assets/img/images/profile-large.webp" width="38" height="38" style="border-radius:50%;"><b style="font-size:18px;color:#0f1419;">@PeroTechie</b> <span style="color:#1d9bf0;">✔</span></div>
      <div style="background:#fff;border-radius:14px;padding:30px 28px;color:#3f4754;font-size:16px;line-height:1.7;">
        ${heading ? `<h1 style="font-size:23px;color:#1a202c;margin:0 0 18px;">${esc(heading)}</h1>` : ""}
        <p style="margin:0 0 16px;">Hey there 👋</p>
        ${body}
        <hr style="border:none;border-top:1px solid #e6ebf1;margin:28px 0;">
        <p style="margin:0;">Until next time,<br><b>PeroTech</b></p>
      </div>
      <div style="text-align:center;color:#9aa4b2;font-size:12px;padding:18px 0;">Website · YouTube · Instagram · LinkedIn &nbsp;|&nbsp; Unsubscribe</div>
    </div></div></body></html>`;
}

VIEWS.broadcast = async () => {
  const subs = await api("GET", "/subscribers");
  const preset = JSON.parse(sessionStorage.getItem("pt_recipients") || "null");
  sessionStorage.removeItem("pt_recipients");
  const target = preset ? preset.length + " selected" : subs.length + " (all subscribers)";
  $("#view").innerHTML = `
    <div class="panel">
      <h3>Compose newsletter / broadcast</h3>
      <div class="help">Sent to <b>${target}</b> using the branded PeroTech template (header, signature & footer added automatically).</div>
      <div style="margin-top:16px">
        ${field("Subject line", "b-subject", "")}
        ${field("Heading (big title shown at the top of the email)", "b-heading", "")}
      </div>
      <h3 style="margin:20px 0 4px">Email content</h3>
      <div class="help">Build the email from blocks — text, images, videos, links/buttons and downloadable files, in any order. Images are embedded so they always display; files & videos open via a link.</div>
      <div class="blocks-toolbar" id="bt">${EMAIL_BLOCK_TYPES.map((t) => `<button type="button" class="btn ghost sm" data-add="${t}">+ ${t}</button>`).join("")}</div>
      <div id="blocks">${emailBlockCard({ type: "paragraph" })}</div>
      <div class="form-actions">
        <button class="btn ghost" id="preview-btn">Preview recipients</button>
        <button class="btn ghost" id="preview-email">Preview email ↗</button>
        <button class="btn" id="send-btn">Send broadcast</button>
      </div>
      <div id="b-result" class="help"></div>
    </div>`;

  const blocks = $("#blocks");
  $("#bt").addEventListener("click", (e) => {
    const t = e.target.dataset.add; if (!t) return;
    blocks.insertAdjacentHTML("beforeend", emailBlockCard({ type: t }));
  });
  blocks.addEventListener("click", (e) => {
    const card = e.target.closest(".block-card"); if (!card) return;
    if (e.target.dataset.remove !== undefined) card.remove();
    if (e.target.dataset.move === "up" && card.previousElementSibling) card.parentNode.insertBefore(card, card.previousElementSibling);
    if (e.target.dataset.move === "down" && card.nextElementSibling) card.parentNode.insertBefore(card.nextElementSibling, card);
  });

  $("#preview-btn").addEventListener("click", () => {
    const list = preset ? subs.filter((s) => preset.map(String).includes(String(s.id))) : subs;
    $("#b-result").innerHTML = list.length ? list.map((s) => esc(s.email)).join(", ") : "No recipients.";
  });
  $("#preview-email").addEventListener("click", () => {
    const w = window.open("", "_blank");
    if (!w) return toast("Allow pop-ups to preview the email", "err");
    w.document.write(clientEmailHtml(collectBlocks(blocks), $("#b-heading").value.trim()));
    w.document.close();
  });
  $("#send-btn").addEventListener("click", async () => {
    const subject = $("#b-subject").value.trim();
    const payloadBlocks = collectBlocks(blocks).filter((b) => b.type === "divider" || Object.keys(b).length > 1);
    if (!subject) return toast("Subject is required", "err");
    if (!payloadBlocks.length) return toast("Add some content to the email", "err");
    if (!confirm("Send this email to " + target + "?")) return;
    $("#send-btn").disabled = true; $("#send-btn").textContent = "Sending…";
    try {
      const r = await api("POST", "/broadcast", { subject, heading: $("#b-heading").value.trim(), blocks: payloadBlocks, recipientIds: preset || undefined });
      toast(`Sent ${r.sent}/${r.total}` + (r.failed ? `, ${r.failed} failed` : ""));
      $("#b-result").innerHTML = `✅ Sent: <b>${r.sent}</b> · Failed: <b>${r.failed}</b>` + (r.errors && r.errors.length ? `<br>${r.errors.map(esc).join("<br>")}` : "");
    } catch (e) { toast(e.message, "err"); $("#b-result").textContent = e.message; }
    finally { $("#send-btn").disabled = false; $("#send-btn").textContent = "Send broadcast"; }
  });
};

/* ---- Settings ---- */
VIEWS.settings = async () => {
  const s = await api("GET", "/settings");
  const soc = s.socials || {};
  $("#view").innerHTML = `
    <div class="panel">
      <h3>Profile & social links</h3>
      <div class="help">Used across the site footer/profile and email templates.</div>
      <div style="margin-top:16px">
        ${uploadField("Profile photo (homepage + emails use the file path)", "s-photo", s.photo || "")}
        <div class="grid-2">${field("Display name", "s-name", s.name || "")}${field("Handle", "s-handle", s.handle || "")}</div>
        ${field("Homepage heading", "s-heading", s.homeHeading || "")}
        ${field("Tagline", "s-tagline", s.tagline || "", true)}
        <div class="grid-2">${field("YouTube URL", "s-yt", soc.youtube || "")}${field("LinkedIn URL", "s-li", soc.linkedin || "")}</div>
        <div class="grid-2">${field("Instagram URL", "s-ig", soc.instagram || "")}${field("Twitter/X URL", "s-tw", soc.twitter || "")}</div>
      </div>
      <div class="help">Tip: the profile photo file at <b>assets/img/images/profile-large.webp</b> is also used directly by some pages; upload here sets the homepage &amp; email copy.</div>
      <div class="form-actions"><button class="btn" id="save">Save settings</button></div>
    </div>`;
  $("#save").addEventListener("click", async () => {
    const payload = { name: $("#s-name").value, handle: $("#s-handle").value, tagline: $("#s-tagline").value,
      homeHeading: $("#s-heading").value, photo: $("#s-photo").value,
      socials: { youtube: $("#s-yt").value, linkedin: $("#s-li").value, instagram: $("#s-ig").value, twitter: $("#s-tw").value } };
    try { await api("PUT", "/settings", payload); toast("Settings saved"); } catch (e) { toast(e.message, "err"); }
  });
};

/* ---- Timeline ---- */
VIEWS.timeline = async () => {
  const items = await api("GET", "/timeline");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${items.length} entry(s) — homepage timeline</h3><button class="btn sm" id="new">+ New Entry</button></div>
      ${items.length ? `<table class="table"><thead><tr><th></th><th>Name</th><th>Subtitle</th><th>Date</th><th></th></tr></thead><tbody>
        ${items.map((t) => `<tr>
          <td><img class="thumb-sm" style="width:34px;height:34px;border-radius:8px" src="/${esc(t.icon || "")}" onerror="this.style.visibility='hidden'"/></td>
          <td><b>${esc(t.name)}</b></td><td class="muted">${esc(t.subtitle || "")}</td><td class="muted">${esc(t.date || "")}</td>
          <td><div class="actions"><button class="btn ghost sm" data-edit="${esc(t.id)}">Edit</button><button class="btn danger sm" data-del="${esc(t.id)}">Delete</button></div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No timeline entries.</div>'}
    </div>`;
  $("#new").addEventListener("click", () => timelineEditor());
  $$("[data-edit]").forEach((b) => b.addEventListener("click", () => timelineEditor(items.find((t) => t.id === b.dataset.edit))));
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete entry?")) return; await api("DELETE", "/timeline/" + encodeURIComponent(b.dataset.del)); toast("Deleted"); go("timeline"); }));
};
function timelineEditor(t) {
  t = t || {}; const isEdit = !!t.id;
  openModal(isEdit ? "Edit Timeline Entry" : "New Timeline Entry", `
    <div class="grid-2">${field("Name", "t-name", t.name || "")}${field("Date (e.g. June 2026)", "t-date", t.date || "")}</div>
    ${field("Subtitle (e.g. Launched X)", "t-sub", t.subtitle || "")}
    ${uploadField("Icon / logo", "t-icon", t.icon || "")}
    <div class="form-actions"><button class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">${isEdit ? "Save" : "Create"}</button></div>`);
  $("#cancel").addEventListener("click", closeModal);
  $("#save").addEventListener("click", async () => {
    const payload = { name: $("#t-name").value.trim(), date: $("#t-date").value.trim(), subtitle: $("#t-sub").value.trim(), icon: $("#t-icon").value.trim() };
    if (!payload.name) return toast("Name required", "err");
    try { if (isEdit) await api("PUT", "/timeline/" + encodeURIComponent(t.id), payload); else await api("POST", "/timeline", payload); toast("Saved"); closeModal(); go("timeline"); } catch (e) { toast(e.message, "err"); }
  });
}

/* ---- Tools ---- */
VIEWS.tools = async () => {
  const items = await api("GET", "/tools");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${items.length} tool(s) — “My Favorite Tools”</h3><button class="btn sm" id="new">+ New Tool</button></div>
      ${items.length ? `<table class="table"><thead><tr><th></th><th>Name</th><th></th></tr></thead><tbody>
        ${items.map((t) => `<tr>
          <td><img class="thumb-sm" style="width:34px;height:34px;border-radius:8px" src="/${esc(t.icon || "")}" onerror="this.style.visibility='hidden'"/></td>
          <td><b>${esc(t.name)}</b></td>
          <td><div class="actions"><button class="btn ghost sm" data-edit="${esc(t.id)}">Edit</button><button class="btn danger sm" data-del="${esc(t.id)}">Delete</button></div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No tools yet.</div>'}
    </div>`;
  $("#new").addEventListener("click", () => toolsEditor());
  $$("[data-edit]").forEach((b) => b.addEventListener("click", () => toolsEditor(items.find((t) => t.id === b.dataset.edit))));
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete tool?")) return; await api("DELETE", "/tools/" + encodeURIComponent(b.dataset.del)); toast("Deleted"); go("tools"); }));
};
function toolsEditor(t) {
  t = t || {}; const isEdit = !!t.id;
  openModal(isEdit ? "Edit Tool" : "New Tool", `
    ${field("Name", "tl-name", t.name || "")}
    ${uploadField("Icon / logo", "tl-icon", t.icon || "")}
    <div class="form-actions"><button class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">${isEdit ? "Save" : "Create"}</button></div>`);
  $("#cancel").addEventListener("click", closeModal);
  $("#save").addEventListener("click", async () => {
    const payload = { name: $("#tl-name").value.trim(), icon: $("#tl-icon").value.trim() };
    if (!payload.name) return toast("Name required", "err");
    try { if (isEdit) await api("PUT", "/tools/" + encodeURIComponent(t.id), payload); else await api("POST", "/tools", payload); toast("Saved"); closeModal(); go("tools"); } catch (e) { toast(e.message, "err"); }
  });
}

/* ---- YouTube Videos ---- */
VIEWS.videos = async () => {
  const items = await api("GET", "/videos");
  $("#view").innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>${items.length} video(s) — homepage “Latest YouTube Videos”</h3><button class="btn sm" id="new">+ New Video</button></div>
      ${items.length ? `<table class="table"><thead><tr><th></th><th>Title</th><th>Date</th><th></th></tr></thead><tbody>
        ${items.map((v) => `<tr>
          <td><img class="thumb-sm" src="/${esc(v.thumb || (v.videoId ? "" : ""))}" onerror="this.src='https://img.youtube.com/vi/${esc(v.videoId)}/default.jpg'"/></td>
          <td><b>${esc(v.title)}</b><div class="muted" style="font-size:.8rem">${esc(v.videoId || "")}</div></td>
          <td class="muted">${esc(v.date || "")}</td>
          <td><div class="actions"><button class="btn ghost sm" data-edit="${esc(v.id)}">Edit</button><button class="btn danger sm" data-del="${esc(v.id)}">Delete</button></div></td>
        </tr>`).join("")}</tbody></table>` : '<div class="empty">No videos yet.</div>'}
    </div>`;
  $("#new").addEventListener("click", () => videoEditor());
  $$("[data-edit]").forEach((b) => b.addEventListener("click", () => videoEditor(items.find((v) => v.id === b.dataset.edit))));
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete video?")) return; await api("DELETE", "/videos/" + encodeURIComponent(b.dataset.del)); toast("Deleted"); go("videos"); }));
};
function videoEditor(v) {
  v = v || {}; const isEdit = !!v.id;
  openModal(isEdit ? "Edit Video" : "New Video", `
    ${field("Title", "v-title", v.title || "")}
    <div class="grid-2">${field("YouTube video ID (e.g. dQw4w9WgXcQ)", "v-id", v.videoId || "")}${field("Date (e.g. 12 June 2026)", "v-date", v.date || "")}</div>
    ${uploadField("Thumbnail (optional — auto-uses YouTube thumb if blank)", "v-thumb", v.thumb || "")}
    <div class="help">The video ID is the part after <b>watch?v=</b> in a YouTube URL.</div>
    <div class="form-actions"><button class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">${isEdit ? "Save" : "Create"}</button></div>`);
  $("#cancel").addEventListener("click", closeModal);
  $("#save").addEventListener("click", async () => {
    let vid = $("#v-id").value.trim();
    const m = vid.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/); // accept full URLs too
    if (m) vid = m[1];
    const payload = { title: $("#v-title").value.trim(), videoId: vid, date: $("#v-date").value.trim(), thumb: $("#v-thumb").value.trim() };
    if (!payload.title || !payload.videoId) return toast("Title and video ID are required", "err");
    try { if (isEdit) await api("PUT", "/videos/" + encodeURIComponent(v.id), payload); else await api("POST", "/videos", payload); toast("Saved"); closeModal(); go("videos"); } catch (e) { toast(e.message, "err"); }
  });
}

/* ---------- field helpers ---------- */
function field(label, id, val, textarea) {
  return textarea
    ? `<div class="field"><label>${label}</label><textarea class="textarea" id="${id}">${esc(val)}</textarea></div>`
    : `<div class="field"><label>${label}</label><input class="input" id="${id}" value="${esc(val)}" /></div>`;
}
function uploadField(label, id, val, accept) {
  return `<div class="field"><label>${label}</label>
    <div class="upload-row">
      <input class="input" id="${id}" value="${esc(val)}" placeholder="path, URL, or click Upload →" />
      <label class="btn ghost sm upload-label">Upload<input type="file" accept="${accept || "image/*"}" data-target="${id}" style="display:none"></label>
    </div>
    <div class="upload-prev" id="${id}-prev">${val ? `<img src="/${esc(val)}" alt="" onerror="this.style.display='none'"/>` : ""}</div>
  </div>`;
}
// Delegated upload handler (works for fields injected into modals/views)
document.addEventListener("change", async (e) => {
  const inp = e.target;
  if (!(inp.matches && inp.matches("input[type=file][data-target]")) || !inp.files || !inp.files[0]) return;
  const targetId = inp.dataset.target;
  const fd = new FormData();
  fd.append("file", inp.files[0]);
  const lbl = inp.closest(".upload-label"); const prevTxt = lbl ? lbl.childNodes[0].nodeValue : null;
  if (lbl) lbl.childNodes[0].nodeValue = "Uploading…";
  try {
    const res = await fetch(API + "/upload", { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    const t = document.getElementById(targetId); if (t) t.value = data.path;
    const isImg = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(data.path);
    const prev = document.getElementById(targetId + "-prev");
    if (prev) prev.innerHTML = isImg
      ? `<img src="/${data.path}" alt="" onerror="this.style.display='none'"/>`
      : `<span class="upload-chip">${esc(data.name || data.path)}${data.size ? " · " + esc(data.size) : ""}</span>`;
    // auto-fill linked file name / size fields (for "file" blocks)
    if (inp.dataset.nameTarget) { const n = document.getElementById(inp.dataset.nameTarget); if (n && !n.value) n.value = data.name || ""; }
    if (inp.dataset.sizeTarget) { const z = document.getElementById(inp.dataset.sizeTarget); if (z) z.value = data.size || ""; }
    toast("Uploaded ✓");
  } catch (err) { toast(err.message, "err"); }
  finally { if (lbl && prevTxt !== null) lbl.childNodes[0].nodeValue = prevTxt; inp.value = ""; }
});

/* ---------- boot ---------- */
if (TOKEN) {
  api("GET", "/me").then((d) => { USER = d.user; showApp(); }).catch(() => logout());
} else {
  $("#login").classList.remove("hidden");
}
