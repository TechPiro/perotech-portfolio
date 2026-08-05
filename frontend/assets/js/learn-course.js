// PeroTech Learn — course detail, gated player, and checkout (card + crypto)
(function () {
  const root = document.getElementById("course-root");
  if (!root) return;
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const money = (n) => "$" + Number(n || 0).toLocaleString();
  const naira = (n) => "₦" + Number(n || 0).toLocaleString();
  const attr = (s) => { s = String(s || ""); return /^https?:\/\//i.test(s) ? s : "/" + s.replace(/^\//, ""); };
  PT.renderAuthBar(document.getElementById("learn-authbar"));
  PT.renderBottomNav("browse");

  const slug = decodeURIComponent((location.pathname.match(/\/learn\/([^\/?#]+)/) || [])[1] || new URLSearchParams(location.search).get("slug") || "");
  let COURSE = null, SETTINGS = {}, PAYCFG = {}, selectedId = null, unlocked = false;

  const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const play = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  const doc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  // Authentic Instagram verified seal — shown beside the PeroTech instructor name.
  const IG_VERIFIED = '<svg class="ig-badge" viewBox="0 0 40 40" width="17" height="17" role="img" aria-label="Verified"><path fill="#3897f0" fill-rule="evenodd" d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Z"/><polygon fill="#fff" fill-rule="evenodd" points="28.157 12.358 24.072 16.443 17.072 23.443 12.831 19.202 9.992 22.041 17.072 29.121 30.996 15.197"/></svg>';

  // ---------- content block renderer ----------
  function renderBlock(b) {
    switch (b.type) {
      case "paragraph": return `<p>${b.text || ""}</p>`;
      case "heading": return `<h2>${esc(b.text || "")}</h2>`;
      case "subheading": return `<h3>${esc(b.text || "")}</h3>`;
      case "list": return `<ul>${(b.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
      case "quote": return `<blockquote>${esc(b.text || "")}</blockquote>`;
      case "image": return `<figure><img src="${attr(b.src)}" alt="${esc(b.caption || "")}" loading="lazy"/>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`;
      case "code": return `<pre><code>${esc(b.code || "")}</code></pre>`;
      case "file": return `<a class="bfile" href="${attr(b.src)}" download><span>📎</span><span>${esc(b.name || "Download")}${b.size ? " · " + esc(b.size) : ""}</span><span class="bf-dl">Download</span></a>`;
      default: return "";
    }
  }

  // Accept either a bare ID or a full URL (youtu.be/…, watch?v=…, embed/…, vimeo.com/…).
  const ytId = (s) => { const m = String(s || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/); return m ? m[1] : String(s || "").trim(); };
  const vimeoId = (s) => { const m = String(s || "").match(/vimeo\.com\/(?:video\/)?(\d+)/); return m ? m[1] : String(s || "").trim(); };

  // Embed URL loaded on play — tuned to hide as much provider chrome as possible
  // (nocookie domain, no related videos, modest branding) so the paid player
  // feels native rather than "a YouTube video".
  function embedUrl(v) {
    if (v.kind === "youtube") return `https://www.youtube-nocookie.com/embed/${ytId(v.src)}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white`;
    if (v.kind === "vimeo") return `https://player.vimeo.com/video/${vimeoId(v.src)}?autoplay=1&title=0&byline=0&portrait=0`;
    return "";
  }
  // Poster shown before play: a custom thumbnail if set, else YouTube's auto image.
  function posterFor(v) {
    if (v.poster) return attr(v.poster);
    if (v.kind === "youtube") return `https://i.ytimg.com/vi/${ytId(v.src)}/maxresdefault.jpg`;
    return "";
  }
  const playSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

  function lessonVideoHtml(lesson) {
    const v = lesson.video; if (!v) return "";
    // External videos get a slick, Vimeo-style facade (poster + play button).
    // The provider iframe only loads after the user clicks Play.
    if (v.kind === "youtube" || v.kind === "vimeo") {
      const poster = posterFor(v);
      const fb = v.kind === "youtube" ? `https://i.ytimg.com/vi/${ytId(v.src)}/hqdefault.jpg` : "";
      return `<div class="video-facade" data-embed="${esc(embedUrl(v))}" role="button" tabindex="0" aria-label="Play ${esc(lesson.title || "video")}">
        ${poster ? `<img class="vf-poster" src="${esc(poster)}" alt=""${fb ? ` onerror="this.onerror=null;this.src='${fb}'"` : ""}/>` : ""}
        <span class="vf-play">${playSvg}</span>
      </div>`;
    }
    if (v.kind === "mp4") {
      // A full URL means the video lives on Cloudinary (big file) — play it directly.
      // Otherwise stream the protected file through our entitlement-checked route.
      const isUrl = /^https?:\/\//i.test(v.src || "");
      const src = isUrl
        ? v.src
        : `/api/lessons/${encodeURIComponent(COURSE.slug)}/${encodeURIComponent(lesson.id)}/video${lesson.free ? "" : (PT.token() ? "?t=" + encodeURIComponent(PT.token()) : "")}`;
      // The real <video> is rendered up front (its first frame is the poster) with a
      // persistent Vimeo-style button that hides on play and reappears on pause/end.
      const poster = v.poster ? ` poster="${esc(attr(v.poster))}"` : "";
      return `<div class="video-facade vf-native" aria-label="${esc(lesson.title || "video")}">
        <video class="vf-video" src="${esc(src)}"${poster} preload="metadata" playsinline controls></video>
        <button type="button" class="vf-play" aria-label="Play video">${playSvg}</button>
      </div>`;
    }
    return "";
  }

  // Swap the facade for the real player on click / Enter / Space. A transparent
  // shield covers the player's top bar (video title, Share, "Watch on YouTube")
  // so those can't be clicked through to open the video/channel on YouTube.
  function wireFacade(frame) {
    const facade = frame.querySelector(".video-facade");
    if (!facade) return;
    // Native mp4: persistent styled button that toggles with the video's play/pause.
    if (facade.classList.contains("vf-native")) { wireNative(facade); return; }
    // External (YouTube/Vimeo): swap the facade for the provider iframe on click.
    const load = () => {
      frame.innerHTML =
        `<iframe src="${facade.dataset.embed}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>` +
        `<span class="yt-shield" aria-hidden="true"></span>`;
    };
    facade.addEventListener("click", load);
    facade.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); } });
  }
  // Keep the big Vimeo-style button in sync with a native <video>: it plays on
  // click, hides while playing, and comes back whenever the video is paused/ends.
  function wireNative(facade) {
    const video = facade.querySelector(".vf-video");
    const btn = facade.querySelector(".vf-play");
    if (!video || !btn) return;
    btn.addEventListener("click", () => { video.play(); });
    video.addEventListener("play", () => facade.classList.add("is-playing"));
    video.addEventListener("pause", () => facade.classList.remove("is-playing"));
    video.addEventListener("ended", () => facade.classList.remove("is-playing"));
  }

  const isPlayable = (l) => !l.locked && (l.free || unlocked);

  function renderPlayer() {
    const lesson = (COURSE.lessons || []).find((l) => l.id === selectedId);
    const frame = document.getElementById("player-frame");
    const body = document.getElementById("lesson-body");
    if (!lesson) { if (frame) frame.innerHTML = '<div class="player-empty">Select a lesson to begin.</div>'; if (body) body.innerHTML = ""; return; }
    if (!isPlayable(lesson)) {
      frame.innerHTML = `<div class="player-locked">${lock}<div>This lesson is locked.</div><button class="enroll-btn primary" style="width:auto;padding:10px 20px" id="locked-enroll">Enroll to unlock</button></div>`;
      const e = document.getElementById("locked-enroll"); if (e) e.addEventListener("click", () => openCheckout("course"));
      body.innerHTML = "";
      return;
    }
    frame.innerHTML = lessonVideoHtml(lesson) || '<div class="player-empty">No video for this lesson.</div>';
    wireFacade(frame);
    body.innerHTML = `<h2 style="color:#fff;margin:18px 0 8px">${esc(lesson.title)}</h2>` +
      (lesson.summary ? `<p style="color:#9aa0ae;margin:0 0 16px">${esc(lesson.summary)}</p>` : "") +
      `<div class="lesson-content">${(lesson.blocks || []).map(renderBlock).join("")}</div>`;
    document.querySelectorAll(".lesson-row").forEach((r) => r.classList.toggle("active", r.dataset.lid === selectedId));
  }

  // Downloadable resource row. Locked (no URL) => prompts checkout; unlocked => download link.
  function resRow(r) {
    const meta = r.size ? ` · ${esc(r.size)}` : "";
    if (!r.url) return `<button type="button" class="cd-res locked" data-buy-res><span class="cd-res-ic">🔒</span><span class="cd-res-name">${esc(r.name)}${meta}</span><span class="cd-res-cta">Buy to download</span></button>`;
    return `<a class="cd-res" href="${esc(attr(r.url))}" target="_blank" rel="noopener" download><span class="cd-res-ic">⬇</span><span class="cd-res-name">${esc(r.name)}${meta}</span><span class="cd-res-cta">Download</span></a>`;
  }

  function curriculumRow(l, idx) {
    const playable = l.free || unlocked;
    const tag = l.free ? '<span class="lr-tag free">Preview</span>' : (playable ? "" : '<span class="lr-tag locked">🔒 Locked</span>');
    const ic = l.hasVideo ? (playable ? play : lock) : doc;
    return `<div class="lesson-row ${playable ? "playable" : ""}" data-lid="${esc(l.id)}">
      <div class="lr-ic">${ic}</div>
      <div class="lr-main"><div class="lr-title">${idx + 1}. ${esc(l.title)}</div>${l.duration ? `<div class="lr-sub">${esc(l.duration)}</div>` : ""}</div>
      ${tag}
    </div>`;
  }

  // Star rating row for the hero (uses the same CSS width trick as the catalog).
  function starRow() {
    if (COURSE.rating == null) return "";
    const r = Math.max(0, Math.min(5, Number(COURSE.rating)));
    const cnt = COURSE.students != null ? `<span class="cd-scount">(${Number(COURSE.students).toLocaleString()} students)</span>` : "";
    return `<span class="cd-rate"><b>${r.toFixed(1)}</b><span class="cd-stars" style="--r:${r}">★★★★★</span>${cnt}</span>`;
  }

  function enrollPanel() {
    const lessons = COURSE.lessons || [];
    const coverHtml = COURSE.cover
      ? `<div class="enroll-cover" style="background-image:url('${attr(COURSE.cover)}')"><img src="${attr(COURSE.cover)}" alt=""/><span class="enroll-cover-play">▶ Preview this course</span></div>`
      : "";
    if (unlocked) {
      return `<div class="enroll-card">${coverHtml}<div class="enroll-body">
        <div class="enroll-price"><span class="owned">✓ You own this</span></div>
        <div class="enroll-note">Full access unlocked. Enjoy the course!</div>
        <button class="enroll-btn primary" id="start-btn">Start learning</button>
      </div></div>`;
    }
    const aa = SETTINGS.allAccess || {};
    const priceHtml = COURSE.allAccessOnly ? "All-access only" : money(COURSE.price || 0);
    return `<div class="enroll-card">
      ${coverHtml}
      <div class="enroll-body">
        <div class="enroll-price">${priceHtml}</div>
        <div class="enroll-note">One-time payment · lifetime access</div>
        ${COURSE.allAccessOnly ? "" : `<button class="enroll-btn primary" id="buy-course">Get this course</button>`}
        ${aa.enabled ? `<button class="enroll-btn crypto" id="buy-all">All-access pass — ${money(aa.price || 0)}${aa.days ? " / " + aa.days + " days" : ""}</button>` : ""}
        <div class="enroll-incl-title">This course includes:</div>
        <ul class="enroll-list">
          ${lessons.length ? `<li>▶ ${lessons.length} on-demand lesson${lessons.length === 1 ? "" : "s"}</li>` : ""}
          ${(COURSE.resources || []).length ? `<li>📦 ${COURSE.resources.length} downloadable resource${COURSE.resources.length === 1 ? "" : "s"}</li>` : "<li>📄 Written guides &amp; resources</li>"}
          <li>📱 Access on mobile &amp; desktop</li>
          <li>♾️ Full lifetime access</li>
          <li>💳 Card, bank transfer or crypto</li>
        </ul>
        <div class="enroll-guarantee">✓ Instant access after payment</div>
      </div>
    </div>`;
  }

  function render() {
    if (!COURSE) { root.innerHTML = '<div class="learn-empty">Course not found. <a href="/learn" style="color:#4770ff">Back to courses</a></div>'; return; }
    document.title = "PeroTech — " + COURSE.title;
    const lessons = COURSE.lessons || [];
    const outcomes = COURSE.outcomes || [];
    const reqs = COURSE.requirements || [];
    const resources = COURSE.resources || [];
    const toPlayer = () => { const f = document.getElementById("player-frame"); if (f) f.scrollIntoView({ behavior: "smooth", block: "center" }); };

    // Instructor block: PeroTech shows the brand photo + verified badge (like blog authors).
    const instructorHtml = (COURSE.author || COURSE.authorBio) ? (function () {
      const iname = COURSE.author || "PeroTech";
      const verified = iname.toLowerCase().includes("perotech");
      const photo = SETTINGS.photo ? attr(SETTINGS.photo) : "";
      const initial = esc((iname.trim()[0] || "P").toUpperCase());
      const av = photo
        ? `<div class="cd-inst-av"><img src="${esc(photo)}" alt="${esc(iname)}" onerror="this.style.display='none'"/></div>`
        : `<div class="cd-inst-av">${initial}</div>`;
      return `<section class="cd-block cd-instructor">
        <h2>Instructor</h2>
        <div class="cd-inst-head">
          ${av}
          <div><div class="cd-inst-name">${esc(iname)}${verified ? IG_VERIFIED : ""}</div><div class="cd-inst-role">Instructor</div></div>
        </div>
        ${COURSE.authorBio ? `<p class="cd-inst-bio">${esc(COURSE.authorBio)}</p>` : ""}
      </section>`;
    })() : "";

    root.innerHTML = `
      <div class="cd-hero">
        <div class="cd-hero-inner">
          <a class="cd-crumb" href="/learn">← All courses${COURSE.category ? " · " + esc(COURSE.category) : ""}</a>
          <h1 class="cd-title">${esc(COURSE.title)}</h1>
          ${COURSE.subtitle ? `<p class="cd-headline">${esc(COURSE.subtitle)}</p>` : ""}
          <div class="cd-meta">
            ${COURSE.badge ? `<span class="cd-badge">${esc(COURSE.badge)}</span>` : ""}
            ${starRow()}
          </div>
          <div class="cd-meta2">
            ${COURSE.author ? `<span>Created by <b>${esc(COURSE.author)}</b></span>` : ""}
            ${COURSE.level ? `<span>⌁ ${esc(COURSE.level)}</span>` : ""}
            <span>▶ ${lessons.length} lesson${lessons.length === 1 ? "" : "s"}</span>
            ${COURSE.language ? `<span>🌐 ${esc(COURSE.language)}</span>` : ""}
          </div>
        </div>
      </div>

      <div class="cd-body">
        <div class="cd-main">
          <div class="player-frame" id="player-frame"></div>
          <div id="lesson-body"></div>

          ${outcomes.length ? `<section class="cd-block cd-learn">
            <h2>What you'll learn</h2>
            <div class="cd-learn-grid">${outcomes.map((o) => `<div class="cd-learn-item"><span class="cdl-tick">✓</span><span>${esc(o)}</span></div>`).join("")}</div>
          </section>` : ""}

          ${lessons.length ? `<section class="cd-block">
            <h2>Course content</h2>
            <div class="cd-curr-sub">${lessons.length} lesson${lessons.length === 1 ? "" : "s"} · free previews included</div>
            <div class="curriculum">${lessons.map(curriculumRow).join("")}</div>
          </section>` : ""}

          ${resources.length ? `<section class="cd-block">
            <h2>Course materials${unlocked ? "" : " 🔒"}</h2>
            ${unlocked ? "" : '<div class="cd-curr-sub">Included with your purchase — buy the course to download.</div>'}
            <div class="cd-res-list">${resources.map(resRow).join("")}</div>
          </section>` : ""}

          ${reqs.length ? `<section class="cd-block">
            <h2>Requirements</h2>
            <ul class="cd-reqs">${reqs.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
          </section>` : ""}

          ${COURSE.description ? `<section class="cd-block">
            <h2>Description</h2>
            <div class="cd-desc">${esc(COURSE.description)}</div>
          </section>` : ""}

          ${instructorHtml}
        </div>

        <aside class="cd-aside">${enrollPanel()}</aside>
      </div>`;

    // pick first playable lesson, else first lesson
    const first = lessons.find((l) => l.free || unlocked) || lessons[0];
    selectedId = first ? first.id : null;
    renderPlayer();

    root.querySelectorAll(".lesson-row").forEach((r) => r.addEventListener("click", () => {
      const l = lessons.find((x) => x.id === r.dataset.lid);
      if (l && (l.free || unlocked)) { selectedId = l.id; renderPlayer(); toPlayer(); }
      else openCheckout("course");
    }));
    const cover = root.querySelector(".enroll-cover");
    if (cover) cover.addEventListener("click", () => {
      const f = lessons.find((l) => l.free || unlocked);
      if (f) { selectedId = f.id; renderPlayer(); toPlayer(); } else openCheckout("course");
    });
    root.querySelectorAll("[data-buy-res]").forEach((b) => b.addEventListener("click", () => openCheckout("course")));
    const buy = document.getElementById("buy-course"); if (buy) buy.addEventListener("click", () => openCheckout("course"));
    const buyAll = document.getElementById("buy-all"); if (buyAll) buyAll.addEventListener("click", () => openCheckout("all-access"));
    const start = document.getElementById("start-btn"); if (start) start.addEventListener("click", toPlayer);
  }

  // ---------- checkout ----------
  const COINS = ["BTC", "USDT", "SOL", "ETH"];
  function openCheckout(type) {
    const overlay = document.getElementById("checkout");
    const dlg = document.getElementById("ck-dialog");
    const aa = SETTINGS.allAccess || {};
    const title = type === "all-access" ? "All-access pass" : COURSE.title;
    const price = type === "all-access" ? (aa.price || 0) : (COURSE.price || 0);
    const crypto = SETTINGS.crypto || {};
    let coin = "BTC", method = "card";
    // Charge currency is auto-detected server-side from the buyer's IP.
    const isNG = PAYCFG.country === "NG";
    const payLabel = isNG && PAYCFG.ngnRate ? naira(Math.round(price * PAYCFG.ngnRate)) : money(price);
    const methodsHint = isNG ? "Pay by card, bank transfer, or USSD." : "Pay securely by card.";

    dlg.innerHTML = `
      <button class="ck-close" id="ck-close">×</button>
      <h2>Get access</h2>
      <div class="ck-sub">${esc(title)} — <b>${money(price)}</b></div>
      <div class="ck-tabs">
        <button class="ck-tab active" data-m="card">💳 Card / Bank transfer</button>
        <button class="ck-tab" data-m="crypto">🪙 Crypto</button>
      </div>
      <label>Your email (where access is sent)</label>
      <input id="ck-email" type="email" placeholder="you@example.com" value="${esc(PT.email())}"/>
      <div id="ck-card-pane">
        <p style="color:#9aa0ae;font-size:.88rem;margin:0 0 12px">${methodsHint}</p>
        <button class="ck-btn" id="ck-pay-card">Pay ${payLabel} →</button>
      </div>
      <div id="ck-crypto-pane" style="display:none">
        <label>Choose coin</label>
        <div class="ck-coins">${COINS.map((c, i) => `<button class="ck-coin ${i === 0 ? "active" : ""}" data-coin="${c}">${c}</button>`).join("")}</div>
        <div id="ck-wallet"></div>
        <label>Transaction hash (after you send payment)</label>
        <input id="ck-tx" placeholder="paste your transaction hash"/>
        <button class="ck-btn" id="ck-pay-crypto">I've paid — submit for confirmation</button>
      </div>
      <div class="ck-msg" id="ck-msg"></div>`;

    const walletBox = dlg.querySelector("#ck-wallet");
    const qrSvg = (text) => {
      try { const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
      catch (e) { return ""; }
    };
    const showWallet = () => {
      const w = crypto[coin.toLowerCase()];
      const addr = typeof w === "object" && w ? w.address : w;
      const net = (typeof w === "object" && w && w.network) ? ` <span style="color:#8a90a0">(${esc(w.network)})</span>` : "";
      walletBox.innerHTML = addr
        ? `<label>Send ${coin} to this address${net}</label>
           <div class="ck-qr">${qrSvg(addr)}</div>
           <div class="ck-qr-hint">Scan with your wallet app, or copy the address below</div>
           <div class="ck-wallet"><span>${esc(addr)}</span><button id="ck-copy">Copy</button></div>`
        : `<div class="ck-msg err">No ${coin} wallet configured yet. Try another coin or use card.</div>`;
      const cp = walletBox.querySelector("#ck-copy");
      if (cp) cp.addEventListener("click", () => navigator.clipboard.writeText(addr).then(() => { cp.textContent = "Copied!"; setTimeout(() => cp.textContent = "Copy", 1500); }));
    };
    showWallet();
    dlg.querySelectorAll(".ck-coin").forEach((b) => b.addEventListener("click", () => {
      coin = b.dataset.coin;
      dlg.querySelectorAll(".ck-coin").forEach((x) => x.classList.toggle("active", x === b));
      showWallet();
    }));

    dlg.querySelectorAll(".ck-tab").forEach((t) => t.addEventListener("click", () => {
      method = t.dataset.m;
      dlg.querySelectorAll(".ck-tab").forEach((x) => x.classList.toggle("active", x === t));
      dlg.querySelector("#ck-card-pane").style.display = method === "card" ? "" : "none";
      dlg.querySelector("#ck-crypto-pane").style.display = method === "crypto" ? "" : "none";
    }));

    const msg = dlg.querySelector("#ck-msg");
    const emailVal = () => (dlg.querySelector("#ck-email").value || "").trim();
    const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

    dlg.querySelector("#ck-pay-card").addEventListener("click", async () => {
      const email = emailVal();
      if (!validEmail(email)) { msg.className = "ck-msg err"; msg.textContent = "Enter a valid email."; return; }
      msg.className = "ck-msg"; msg.textContent = "Starting secure checkout…";
      try {
        const r = await fetch("/api/pay/flutterwave/init", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, type, courseId: COURSE.id }),
        }).then((r) => r.json());
        if (r.link) location.href = r.link;
        else { msg.className = "ck-msg err"; msg.textContent = r.error || "Could not start checkout."; }
      } catch (e) { msg.className = "ck-msg err"; msg.textContent = "Network error. Try again."; }
    });

    // Manual crypto (send to wallet + submit tx hash for admin approval).
    dlg.querySelector("#ck-pay-crypto").addEventListener("click", async () => {
      const email = emailVal(), txHash = (dlg.querySelector("#ck-tx").value || "").trim();
      if (!validEmail(email)) { msg.className = "ck-msg err"; msg.textContent = "Enter a valid email."; return; }
      if (txHash.length < 6) { msg.className = "ck-msg err"; msg.textContent = "Paste your transaction hash."; return; }
      msg.className = "ck-msg"; msg.textContent = "Submitting…";
      try {
        const r = await fetch("/api/pay/crypto/submit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, type, courseId: COURSE.id, coin, txHash }),
        }).then((r) => r.json());
        if (r.ok && r.id) { showConfirming(r.id); }
        else { msg.className = "ck-msg err"; msg.textContent = r.error || "Could not submit."; }
      } catch (e) { msg.className = "ck-msg err"; msg.textContent = "Network error. Try again."; }
    });

    // Animated "confirming payment" screen — polls until the admin confirms,
    // then returns the buyer to their dashboard.
    function showConfirming(id) {
      let elapsed = 0, done = false;
      const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
      dlg.innerHTML = `
        <div class="ck-confirm">
          <div class="ck-anim"><span></span><span></span><span></span><div class="ck-anim-core">🪙</div></div>
          <h2>Payment received</h2>
          <p class="ck-confirm-sub">We're confirming your transaction on-chain. Access unlocks after <b>2 block confirmations</b> — this usually takes a few minutes.</p>
          <div class="ck-steps">
            <div class="ck-step done"><i>✓</i> Payment submitted</div>
            <div class="ck-step active"><i class="spin">◌</i> Confirming on-chain…</div>
            <div class="ck-step"><i>○</i> Access unlocked</div>
          </div>
          <div class="ck-timer">Elapsed <b id="ck-el">00:00</b> · checking automatically…</div>
          <button class="ck-btn ghostbtn" id="ck-later">I'll check my email later</button>
        </div>`;
      dlg.querySelector("#ck-later").addEventListener("click", () => overlay.classList.remove("open"));

      const tick = setInterval(() => { if (done) return; elapsed++; const el = dlg.querySelector("#ck-el"); if (el) el.textContent = fmt(elapsed); }, 1000);
      const poll = setInterval(async () => {
        try {
          const s = await fetch("/api/pay/crypto/status?id=" + encodeURIComponent(id)).then((r) => r.json());
          if (s.status === "active") { done = true; clearInterval(poll); clearInterval(tick); confirmed(); }
          else if (s.status === "rejected") { done = true; clearInterval(poll); clearInterval(tick); rejected(); }
        } catch (e) {}
      }, 5000);
      setTimeout(() => clearInterval(poll), 20 * 60 * 1000); // stop after 20 min

      function confirmed() {
        dlg.innerHTML = `<div class="ck-confirm">
          <div class="ck-check ok">✓</div>
          <h2>Payment confirmed 🎉</h2>
          <p class="ck-confirm-sub">Your access is unlocked. Taking you to your dashboard…</p>
        </div>`;
        setTimeout(() => { location.href = PT.token() ? "/learn-dashboard" : "/student-login?next=/learn-dashboard"; }, 1900);
      }
      function rejected() {
        dlg.innerHTML = `<div class="ck-confirm">
          <div class="ck-check err">!</div>
          <h2>We couldn't confirm this payment</h2>
          <p class="ck-confirm-sub">If you did send it, please reply to your confirmation email with the transaction hash and we'll sort it out.</p>
          <button class="ck-btn ghostbtn" id="ck-close3">Close</button>
        </div>`;
        dlg.querySelector("#ck-close3").addEventListener("click", () => overlay.classList.remove("open"));
      }
    }

    dlg.querySelector("#ck-close").addEventListener("click", () => overlay.classList.remove("open"));
    overlay.classList.add("open");
  }
  document.getElementById("checkout").addEventListener("click", (e) => { if (e.target.id === "checkout") e.currentTarget.classList.remove("open"); });

  // After returning from a failed/cancelled Flutterwave payment (?pay=failed),
  // show a friendly banner with alternatives so a card decline isn't a dead end.
  function showPayStatus() {
    const pay = new URLSearchParams(location.search).get("pay");
    if (pay !== "failed" && pay !== "cancelled") return;
    history.replaceState({}, "", location.pathname); // don't re-show on refresh
    const isNG = PAYCFG.country === "NG";
    const alt = isNG
      ? "try a different card, or pay by <b>bank transfer</b>, <b>USSD</b> or <b>crypto</b>"
      : "try a different card, or pay with <b>crypto</b>";
    const msg = pay === "cancelled"
      ? `Payment cancelled. Whenever you're ready, you can ${alt}.`
      : `Your card payment didn't go through — your bank may have declined it. Please ${alt}.`;
    const bar = document.createElement("div");
    bar.className = "pay-alert" + (pay === "cancelled" ? " info" : "");
    bar.innerHTML = `<span>${pay === "cancelled" ? "ℹ️" : "⚠️"} ${msg}</span>
      <span class="pa-actions"><button class="pa-btn" id="pay-retry">Try again</button><button class="pa-x" id="pay-x" aria-label="Dismiss">×</button></span>`;
    const host = document.querySelector(".learn-wrap") || root;
    host.insertBefore(bar, host.firstChild);
    const retry = document.getElementById("pay-retry");
    if (retry) retry.addEventListener("click", () => { bar.remove(); openCheckout("course"); });
    const x = document.getElementById("pay-x");
    if (x) x.addEventListener("click", () => bar.remove());
  }

  // ---------- load ----------
  Promise.all([
    fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
    fetch("/api/courses/" + encodeURIComponent(slug)).then((r) => r.ok ? r.json() : null).catch(() => null),
    fetch("/api/pay/config").then((r) => r.json()).catch(() => ({})),
  ]).then(([settings, course, paycfg]) => {
    SETTINGS = settings || {};
    PAYCFG = paycfg || {};
    COURSE = course;
    if (!COURSE) { render(); showPayStatus(); return; }
    // if signed in, try to load the unlocked version
    if (PT.token()) {
      fetch("/api/student/courses/" + encodeURIComponent(slug), { headers: PT.authHeaders() })
        .then((r) => r.ok ? r.json() : null)
        .then((full) => { if (full && full.unlocked) { COURSE = full; unlocked = true; } render(); showPayStatus(); })
        .catch(() => { render(); showPayStatus(); });
    } else { render(); showPayStatus(); }
  });
})();
