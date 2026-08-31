// Lightweight visit tracking -> /api/track (for the admin analytics dashboard)
(function () {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: location.pathname + location.search,
        ref: document.referrer || "",
      }),
      keepalive: true,
    }).catch(function () {});
  } catch (e) {}
})();

// Live presence heartbeat -> powers the admin "Live visitors" panel.
(function () {
  var KEY = "pt_sid", sid;
  try { sid = localStorage.getItem(KEY); if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem(KEY, sid); } }
  catch (e) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  var path = location.pathname + location.search;
  function ping() {
    try { fetch("/api/presence/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid: sid, path: path }), keepalive: true }).catch(function () {}); } catch (e) {}
  }
  ping();
  setInterval(function () { if (document.visibilityState !== "hidden") ping(); }, 15000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") ping(); });
  window.addEventListener("pagehide", function () {
    try { if (navigator.sendBeacon) navigator.sendBeacon("/api/presence/leave", new Blob([JSON.stringify({ sid: sid })], { type: "application/json" })); } catch (e) {}
  });
})();

// Interaction tracking: a global helper + delegated clicks on content cards.
(function () {
  window.ptTrack = function (type, opts) {
    opts = opts || {};
    try {
      fetch("/api/track/event", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type, q: opts.q || "", label: opts.label || "", kind: opts.kind || "", id: opts.id || "", path: location.pathname + location.search }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  };
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("[data-track-kind], a.course-card, a.chat-card, .portfolio-item .title, .portfolio-item .visite-btn a, [data-buy]");
    if (!el) return;
    var kind = el.getAttribute("data-track-kind") ||
      (el.classList.contains("course-card") ? "course" : el.classList.contains("chat-card") ? "card" : el.hasAttribute("data-buy") ? "product" : "product");
    var label = el.getAttribute("data-track-label");
    if (!label) { var t = el.querySelector && el.querySelector(".course-title, .cc-title, .title"); label = (t ? t.textContent : el.textContent || "").trim().slice(0, 80); }
    if (label) window.ptTrack("click", { kind: kind, label: label });
  }, true);
})();

// Load the timed newsletter modal on every page except the newsletter page itself.
(function () {
  if (/^\/newsletter(\/|$)/.test(location.pathname)) return;
  var s = document.createElement("script");
  s.src = "/assets/js/newsletter-modal.js";
  s.defer = true;
  document.head.appendChild(s);
})();
