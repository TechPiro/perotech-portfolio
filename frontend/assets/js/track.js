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
