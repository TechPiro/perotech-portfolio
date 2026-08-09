// Zentra content manager — protected CRUD over the single zentra.json document.
// Reuses the existing PeroTech admin auth (same token / login endpoint).
(function () {
  const API = "/api";
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  let TOKEN = localStorage.getItem("pt_admin_token") || "";
  let DOC = null;

  const ICON_NAMES = "smartphone database server palette bar-chart trending-up chart-candle zap lock wallet credit-card refresh message bell users moon key gift shield code layers check".split(" ");

  // tiny hyperscript helper
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    attrs = attrs || {};
    for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach((c) => { if (c != null && c !== false) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function toast(msg, err) {
    toastEl.textContent = msg; toastEl.className = "toast show" + (err ? " err" : "");
    setTimeout(() => (toastEl.className = "toast"), 2600);
  }

  async function api(path, method, body) {
    const opts = { method: method || "GET", headers: { Authorization: "Bearer " + TOKEN } };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    const r = await fetch(API + path, opts);
    if (r.status === 401) { throw new Error("unauthorized"); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Request failed");
    return r.json();
  }
  async function uploadFile(file) {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(API + "/admin/upload", { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: fd });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Upload failed");
    return r.json(); // {path,name,size}
  }

  // ---------- boot / auth ----------
  async function boot() {
    if (TOKEN) { try { await api("/admin/me"); return showApp(); } catch (e) { TOKEN = ""; localStorage.removeItem("pt_admin_token"); } }
    showLogin();
  }
  function showLogin(msg) {
    app.innerHTML = "";
    const err = h("div", { class: "err" }, msg || "");
    const u = h("input", { type: "text", placeholder: "Username", autocomplete: "username" });
    const p = h("input", { type: "password", placeholder: "Password", autocomplete: "current-password" });
    const submit = async () => {
      err.textContent = "";
      try {
        const r = await fetch(API + "/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u.value, password: p.value }) });
        const d = await r.json();
        if (!r.ok) { err.textContent = d.error || "Login failed"; return; }
        TOKEN = d.token; localStorage.setItem("pt_admin_token", TOKEN); localStorage.setItem("pt_admin_user", d.user || "admin");
        showApp();
      } catch (e) { err.textContent = "Network error"; }
    };
    p.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    app.appendChild(h("div", { class: "login" },
      h("h1", {}, "Zentra Content Manager"),
      h("p", {}, "Sign in with your admin login."),
      h("label", { class: "fld" }, h("span", {}, "Username"), u),
      h("label", { class: "fld" }, h("span", {}, "Password"), p),
      h("button", { class: "btn primary", onclick: submit }, "Sign in"),
      err,
    ));
  }

  // ensure the doc has every section so editors never crash
  function shape(d) {
    d = d && typeof d === "object" ? d : {};
    d.meta = d.meta || {}; d.offer = d.offer || {}; d.hero = d.hero || {}; d.video = d.video || {};
    d.whatis = d.whatis || {}; d.whatis.cards = d.whatis.cards || [];
    d.carousel = d.carousel || []; d.featuresUser = d.featuresUser || []; d.featuresAdmin = d.featuresAdmin || [];
    d.whatYouGet = d.whatYouGet || []; d.whyCards = d.whyCards || []; d.faq = d.faq || [];
    d.reviews = d.reviews || []; d.reviewsMeta = d.reviewsMeta || {};
    if (typeof d.disclaimer !== "string") d.disclaimer = "";
    return d;
  }

  async function showApp() {
    try { DOC = shape(await api("/admin/zentra")); } catch (e) { if (e.message === "unauthorized") return showLogin("Session expired — sign in again."); DOC = shape({}); }
    render();
  }

  // ---------- field helpers ----------
  function textField(label, obj, key, opts) {
    opts = opts || {};
    const input = opts.area ? h("textarea", { placeholder: opts.ph || "" }) : h("input", { type: "text", placeholder: opts.ph || "" });
    input.value = obj[key] || "";
    input.addEventListener("input", () => (obj[key] = input.value));
    return h("label", { class: "fld" }, h("span", {}, label), input);
  }
  function imageField(label, obj, key) {
    const input = h("input", { type: "text", placeholder: "assets/img/zentra/… or paste a URL" });
    input.value = obj[key] || "";
    const thumb = h("img", { class: "thumb", alt: "" });
    const setThumb = () => { thumb.style.display = obj[key] ? "" : "none"; if (obj[key]) thumb.src = /^https?:/i.test(obj[key]) ? obj[key] : "/" + String(obj[key]).replace(/^\//, ""); };
    input.addEventListener("input", () => { obj[key] = input.value; setThumb(); });
    const file = h("input", { type: "file", accept: "image/*", style: "display:none" });
    file.addEventListener("change", async () => {
      if (!file.files[0]) return;
      try { const up = await uploadFile(file.files[0]); obj[key] = up.path; input.value = up.path; setThumb(); toast("Image uploaded"); }
      catch (e) { toast(e.message, true); }
    });
    const btn = h("button", { class: "btn sm ghost", onclick: () => file.click() }, "Upload");
    setThumb();
    return h("label", { class: "fld" }, h("span", {}, label), h("div", { class: "img-field" }, thumb, input, btn, file));
  }
  function toggleField(label, obj, key) {
    const cb = h("input", { type: "checkbox" }); cb.checked = obj[key] !== false;
    cb.addEventListener("change", () => (obj[key] = cb.checked));
    return h("label", { class: "toggle" }, cb, label);
  }

  // Generic list editor: fields = [{k,label,type:'text'|'area'|'image'|'select'}]
  function listEditor(arr, fields, newItem) {
    const wrap = h("div", {});
    function draw() {
      wrap.innerHTML = "";
      arr.forEach((item, i) => {
        const fieldEls = fields.map((f) => {
          if (f.type === "image") return imageField(f.label, item, f.k);
          if (f.type === "select") {
            const sel = h("select", {}, ...f.options.map((o) => h("option", { value: o }, o)));
            sel.value = item[f.k] || f.options[0];
            sel.addEventListener("change", () => (item[f.k] = sel.value));
            return h("label", { class: "fld" }, h("span", {}, f.label), sel);
          }
          return textField(f.label, item, f.k, { area: f.type === "area" });
        });
        const ctrls = h("div", { class: "z-ctrls" },
          h("button", { class: "btn sm", title: "Move up", onclick: () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; draw(); } } }, "▲"),
          h("button", { class: "btn sm", title: "Move down", onclick: () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; draw(); } } }, "▼"),
          h("button", { class: "btn sm danger", title: "Delete", onclick: () => { arr.splice(i, 1); draw(); } }, "✕"),
        );
        wrap.appendChild(h("div", { class: "z-row" }, h("div", { class: "z-fields" }, ...fieldEls), ctrls));
      });
      wrap.appendChild(h("button", { class: "btn sm", onclick: () => { arr.push(newItem()); draw(); } }, "+ Add item"));
    }
    draw();
    return wrap;
  }

  // Editor for a list of plain strings (What You Get)
  function stringListEditor(arr) {
    const wrap = h("div", {});
    function draw() {
      wrap.innerHTML = "";
      arr.forEach((val, i) => {
        const inp = h("input", { type: "text" }); inp.value = val;
        inp.addEventListener("input", () => (arr[i] = inp.value));
        const ctrls = h("div", { class: "z-ctrls" },
          h("button", { class: "btn sm", onclick: () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; draw(); } } }, "▲"),
          h("button", { class: "btn sm", onclick: () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; draw(); } } }, "▼"),
          h("button", { class: "btn sm danger", onclick: () => { arr.splice(i, 1); draw(); } }, "✕"),
        );
        wrap.appendChild(h("div", { class: "z-row" }, h("div", { class: "z-fields" }, inp), ctrls));
      });
      wrap.appendChild(h("button", { class: "btn sm", onclick: () => { arr.push(""); draw(); } }, "+ Add item"));
    }
    draw();
    return wrap;
  }

  function section(title, hint) {
    return h("div", { class: "za-sec" }, h("h2", {}, title), hint ? h("p", { class: "hint" }, hint) : null);
  }
  const iconsHelp = () => h("div", { class: "icons-help", html: "Valid icon names: " + ICON_NAMES.map((n) => "<code>" + n + "</code>").join(", ") });

  async function save() {
    try { await api("/admin/zentra", "PUT", DOC); toast("Saved — the live page is updated."); }
    catch (e) { if (e.message === "unauthorized") return showLogin("Session expired — sign in again."); toast(e.message, true); }
  }
  function logout() { TOKEN = ""; localStorage.removeItem("pt_admin_token"); showLogin(); }

  function render() {
    app.innerHTML = "";
    app.appendChild(h("div", { class: "za-top" },
      h("h1", { html: "Zentra <b>Content Manager</b>" }),
      h("div", { class: "za-actions" },
        h("a", { class: "btn ghost sm", href: "/zentra", target: "_blank" }, "View page ↗"),
        h("button", { class: "btn primary sm", onclick: save }, "Save changes"),
        h("button", { class: "btn ghost sm", onclick: logout }, "Log out"),
      ),
    ));
    const wrap = h("div", { class: "za-wrap" });

    // Pricing & offer
    const s1 = section("Pricing & Offer", "The conversion moment — prices, discount, scarcity, and links.");
    s1.appendChild(h("div", { class: "grid2" }, textField("Original price", DOC.offer, "priceOriginal", { ph: "$497" }), textField("Current price", DOC.offer, "priceNow", { ph: "$197" })));
    s1.appendChild(textField("Discount badge", DOC.offer, "discountBadge"));
    s1.appendChild(h("div", { class: "grid2" }, textField("Scarcity line", DOC.offer, "scarcity", { ph: "first 20 buyers" }), h("div", { style: "padding-top:24px" }, toggleField("Show scarcity line", DOC.offer, "showScarcity"))));
    s1.appendChild(h("div", { class: "grid2" }, textField("Checkout URL", DOC.offer, "checkoutUrl", { ph: "https://…" }), textField("Custom-build URL", DOC.offer, "customBuildUrl", { ph: "https://…" })));
    wrap.appendChild(s1);

    // Hero
    const s2 = section("Hero", "Top-of-page headline and calls to action.");
    s2.appendChild(textField("Eyebrow badge", DOC.hero, "eyebrow"));
    s2.appendChild(textField("Headline", DOC.hero, "headline", { area: true }));
    s2.appendChild(textField("Subheadline", DOC.hero, "subhead", { area: true }));
    s2.appendChild(textField("Trust line", DOC.hero, "trustLine"));
    s2.appendChild(h("div", { class: "grid2" }, textField("Primary CTA label", DOC.hero, "ctaPrimary"), textField("Secondary CTA label", DOC.hero, "ctaSecondary")));
    wrap.appendChild(s2);

    // Video
    const s3 = section("Demo Video", "Paste a YouTube/Vimeo/MP4 link. Poster shows before play.");
    s3.appendChild(textField("Video URL", DOC.video, "url", { ph: "https://youtu.be/… or https://vimeo.com/…" }));
    s3.appendChild(imageField("Poster image", DOC.video, "poster"));
    wrap.appendChild(s3);

    // What is
    const s4 = section("What Is Zentra", "Explainer paragraph + highlight cards.");
    s4.appendChild(textField("Explainer paragraph", DOC.whatis, "text", { area: true }));
    s4.appendChild(iconsHelp());
    s4.appendChild(listEditor(DOC.whatis.cards, [{ k: "icon", label: "Icon name", type: "select", options: ICON_NAMES }, { k: "title", label: "Title" }], () => ({ icon: "check", title: "" })));
    wrap.appendChild(s4);

    // Carousel
    const s5 = section("Interface Carousel", "Screenshots shown in the showcase. Reorder with ▲ ▼.");
    s5.appendChild(listEditor(DOC.carousel, [{ k: "image", label: "Screenshot", type: "image" }, { k: "caption", label: "Caption", type: "area" }], () => ({ image: "", caption: "" })));
    wrap.appendChild(s5);

    // Features — user
    const s6 = section("User Interface Features", "");
    s6.appendChild(iconsHelp());
    s6.appendChild(listEditor(DOC.featuresUser, [{ k: "icon", label: "Icon", type: "select", options: ICON_NAMES }, { k: "title", label: "Title" }, { k: "desc", label: "Description", type: "area" }], () => ({ icon: "check", title: "", desc: "" })));
    wrap.appendChild(s6);

    // Features — admin
    const s7 = section("Admin Console Features", "");
    s7.appendChild(iconsHelp());
    s7.appendChild(listEditor(DOC.featuresAdmin, [{ k: "icon", label: "Icon", type: "select", options: ICON_NAMES }, { k: "title", label: "Title" }, { k: "desc", label: "Description", type: "area" }], () => ({ icon: "check", title: "", desc: "" })));
    wrap.appendChild(s7);

    // What you get
    const s8 = section("What You Get", "The full-access checklist.");
    s8.appendChild(stringListEditor(DOC.whatYouGet));
    wrap.appendChild(s8);

    // Why cards
    const s9 = section("Why Zentra — Highlight Cards", "");
    s9.appendChild(iconsHelp());
    s9.appendChild(listEditor(DOC.whyCards, [{ k: "icon", label: "Icon", type: "select", options: ICON_NAMES }, { k: "title", label: "Title" }, { k: "desc", label: "Description", type: "area" }], () => ({ icon: "check", title: "", desc: "" })));
    wrap.appendChild(s9);

    // Reviews (Trustpilot)
    const sR = section("Reviews (Trustpilot)", "Client testimonials + the TrustScore header. Upload a profile photo per review.");
    sR.appendChild(h("div", { class: "grid2" }, textField("TrustScore rating", DOC.reviewsMeta, "rating", { ph: "4.8" }), textField("Review count", DOC.reviewsMeta, "count", { ph: "217" })));
    sR.appendChild(listEditor(DOC.reviews, [
      { k: "avatar", label: "Profile photo", type: "image" },
      { k: "name", label: "Name" },
      { k: "role", label: "Role / company" },
      { k: "rating", label: "Rating", type: "select", options: ["5", "4.5", "4", "3.5", "3"] },
      { k: "text", label: "Review text", type: "area" },
      { k: "date", label: "Date label", type: "text" },
    ], () => ({ avatar: "", name: "", role: "", rating: "5", text: "", date: "just now" })));
    wrap.appendChild(sR);

    // Disclaimer
    const s10 = section("Disclaimer", "Shown in a muted card near the bottom.");
    s10.appendChild(textField("Disclaimer text", DOC, "disclaimer", { area: true }));
    wrap.appendChild(s10);

    // FAQ
    const s11 = section("FAQ", "Question + answer accordion.");
    s11.appendChild(listEditor(DOC.faq, [{ k: "q", label: "Question" }, { k: "a", label: "Answer", type: "area" }], () => ({ q: "", a: "" })));
    wrap.appendChild(s11);

    // Meta
    const s12 = section("SEO / Global", "Page title, description, social image, footer.");
    s12.appendChild(textField("Page title", DOC.meta, "title"));
    s12.appendChild(textField("Meta description", DOC.meta, "description", { area: true }));
    s12.appendChild(imageField("OG / social image", DOC.meta, "ogImage"));
    s12.appendChild(h("div", { class: "grid2" }, textField("LinkedIn URL", DOC.meta, "linkedinUrl"), textField("Footer text", DOC.meta, "footerText")));
    wrap.appendChild(s12);

    app.appendChild(wrap);
    app.appendChild(h("div", { class: "savebar" }, h("button", { class: "btn primary", onclick: save }, "💾 Save all changes")));
  }

  boot();
})();
