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

// Load the timed newsletter modal on every page except the newsletter page itself.
(function () {
  if (/^\/newsletter(\/|$)/.test(location.pathname)) return;
  var s = document.createElement("script");
  s.src = "/assets/js/newsletter-modal.js";
  s.defer = true;
  document.head.appendChild(s);
})();
