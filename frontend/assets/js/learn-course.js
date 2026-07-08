// PeroTech Learn — course detail, gated player, and checkout (card + crypto)
(function () {
  const root = document.getElementById("course-root");
  if (!root) return;
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const money = (n) => "$" + Number(n || 0).toLocaleString();
  const naira = (n) => "₦" + Number(n || 0).toLocaleString();
  const attr = (s) => { s = String(s || ""); return /^https?:\/\//i.test(s) ? s : "/" + s.replace(/^\//, ""); };
  PT.renderAuthBar(document.getElementById("learn-authbar"));

  const slug = decodeURIComponent((location.pathname.match(/\/learn\/([^\/?#]+)/) || [])[1] || new URLSearchParams(location.search).get("slug") || "");
  let COURSE = null, SETTINGS = {}, PAYCFG = {}, selectedId = null, unlocked = false;

  const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const play = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  const doc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';

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

  function lessonVideoHtml(lesson) {
    const v = lesson.video; if (!v) return "";
    if (v.kind === "youtube") return `<iframe src="https://www.youtube.com/embed/${esc(ytId(v.src))}?rel=0" allow="encrypted-media; fullscreen" allowfullscreen></iframe>`;
    if (v.kind === "vimeo") return `<iframe src="https://player.vimeo.com/video/${esc(vimeoId(v.src))}" allow="fullscreen" allowfullscreen></iframe>`;
    if (v.kind === "mp4") {
      const t = lesson.free ? "" : (PT.token() ? "?t=" + encodeURIComponent(PT.token()) : "");
      return `<video src="/api/lessons/${encodeURIComponent(COURSE.slug)}/${encodeURIComponent(lesson.id)}/video${t}" controls preload="metadata" playsinline></video>`;
    }
    return "";
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
    body.innerHTML = `<h2 style="color:#fff;margin:18px 0 8px">${esc(lesson.title)}</h2>` +
      (lesson.summary ? `<p style="color:#9aa0ae;margin:0 0 16px">${esc(lesson.summary)}</p>` : "") +
      `<div class="lesson-content">${(lesson.blocks || []).map(renderBlock).join("")}</div>`;
    document.querySelectorAll(".lesson-row").forEach((r) => r.classList.toggle("active", r.dataset.lid === selectedId));
  }

  function curriculumRow(l, idx) {
    const playable = l.free || unlocked;
    const tag = l.free ? '<span class="lr-tag free">Free</span>' : (playable ? "" : '<span class="lr-tag locked">Locked</span>');
    const ic = l.hasVideo ? (playable ? play : lock) : doc;
    return `<div class="lesson-row ${playable ? "playable" : ""}" data-lid="${esc(l.id)}">
      <div class="lr-ic">${ic}</div>
      <div class="lr-main"><div class="lr-title">${idx + 1}. ${esc(l.title)}</div>${l.duration ? `<div class="lr-sub">${esc(l.duration)}</div>` : ""}</div>
      ${tag}
    </div>`;
  }

  function enrollPanel() {
    if (unlocked) {
      return `<div class="enroll-card"><div class="enroll-body">
        <div class="enroll-price"><span class="owned">✓ You own this</span></div>
        <div class="enroll-note">Full access unlocked. Enjoy the course!</div>
        <button class="enroll-btn primary" id="start-btn">Start learning</button>
      </div></div>`;
    }
    const aa = SETTINGS.allAccess || {};
    const priceHtml = COURSE.allAccessOnly ? "All-access only" : money(COURSE.price || 0);
    return `<div class="enroll-card">
      ${COURSE.cover ? `<div class="enroll-cover"><img src="${attr(COURSE.cover)}" alt=""/></div>` : ""}
      <div class="enroll-body">
        <div class="enroll-price">${priceHtml}</div>
        <div class="enroll-note">One-time payment · lifetime access to this course</div>
        ${COURSE.allAccessOnly ? "" : `<button class="enroll-btn primary" id="buy-course">Get this course</button>`}
        ${aa.enabled ? `<button class="enroll-btn crypto" id="buy-all">All-access pass — ${money(aa.price || 0)}${aa.days ? " / " + aa.days + " days" : ""}</button>` : ""}
        <ul class="enroll-list">
          <li>${(COURSE.lessons || []).length} lessons</li>
          <li>Video + written guides</li>
          <li>Pay by card or crypto</li>
        </ul>
      </div>
    </div>`;
  }

  function render() {
    if (!COURSE) { root.innerHTML = '<div class="learn-empty">Course not found. <a href="/learn" style="color:#4770ff">Back to courses</a></div>'; return; }
    document.title = "PeroTech — " + COURSE.title;
    root.innerHTML = `
      <a class="cd-back" href="/learn">← All courses</a>
      <div class="course-detail">
        <div class="cd-main">
          <h1 class="cd-title">${esc(COURSE.title)}</h1>
          ${COURSE.subtitle ? `<p class="cd-sub">${esc(COURSE.subtitle)}</p>` : ""}
          <div class="player-frame" id="player-frame"></div>
          <div id="lesson-body"></div>
          ${COURSE.description ? `<div class="cd-desc">${esc(COURSE.description)}</div>` : ""}
          <div class="curriculum">
            <h3>Course content — ${(COURSE.lessons || []).length} lessons</h3>
            ${(COURSE.lessons || []).map(curriculumRow).join("")}
          </div>
        </div>
        <aside>${enrollPanel()}</aside>
      </div>`;

    // pick first playable lesson, else first lesson
    const first = (COURSE.lessons || []).find((l) => l.free || unlocked) || (COURSE.lessons || [])[0];
    selectedId = first ? first.id : null;
    renderPlayer();

    root.querySelectorAll(".lesson-row").forEach((r) => r.addEventListener("click", () => {
      const l = COURSE.lessons.find((x) => x.id === r.dataset.lid);
      if (l && (l.free || unlocked)) { selectedId = l.id; renderPlayer(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else openCheckout("course");
    }));
    const buy = document.getElementById("buy-course"); if (buy) buy.addEventListener("click", () => openCheckout("course"));
    const buyAll = document.getElementById("buy-all"); if (buyAll) buyAll.addEventListener("click", () => openCheckout("all-access"));
    const start = document.getElementById("start-btn"); if (start) start.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
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

  // ---------- load ----------
  Promise.all([
    fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
    fetch("/api/courses/" + encodeURIComponent(slug)).then((r) => r.ok ? r.json() : null).catch(() => null),
    fetch("/api/pay/config").then((r) => r.json()).catch(() => ({})),
  ]).then(([settings, course, paycfg]) => {
    SETTINGS = settings || {};
    PAYCFG = paycfg || {};
    COURSE = course;
    if (!COURSE) return render();
    // if signed in, try to load the unlocked version
    if (PT.token()) {
      fetch("/api/student/courses/" + encodeURIComponent(slug), { headers: PT.authHeaders() })
        .then((r) => r.ok ? r.json() : null)
        .then((full) => { if (full && full.unlocked) { COURSE = full; unlocked = true; } render(); })
        .catch(() => render());
    } else render();
  });
})();
