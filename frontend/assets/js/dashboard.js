// Advanced student dashboard: membership status, courses, and owned products.
(function () {
  if (!(window.PT && PT.token && PT.token())) { location.href = "/student-login?next=/learn-dashboard"; return; }
  PT.renderAuthBar(document.getElementById("learn-authbar"));
  PT.renderBottomNav("courses");

  var root = document.getElementById("dash-root");
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var abs = function (u) { u = String(u || ""); return /^https?:\/\//i.test(u) ? u : "/" + u.replace(/^\//, ""); };
  var fmtDate = function (ts) { try { return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return ""; } };

  var email = PT.email();
  var hour = new Date().getHours();
  var greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  Promise.all([
    api("/api/student/me"),
    api("/api/student/my-courses"),
    api("/api/student/my-products"),
  ]).then(function (r) { render(r[0] || {}, r[1] || {}, r[2] || {}); })
    .catch(function (e) { if (e && e.message === "auth") return; root.innerHTML = '<div class="dash-empty">Could not load your dashboard. Please refresh.</div>'; });

  function api(url) {
    return fetch(url, { headers: PT.authHeaders() }).then(function (res) {
      if (res.status === 401) { PT.clear(); location.href = "/student-login?next=/learn-dashboard"; throw new Error("auth"); }
      return res.json();
    });
  }

  function render(me, coursesData, productsData) {
    var name = (me.name || PT.name() || email.split("@")[0] || "there").trim();
    var initial = (name[0] || "S").toUpperCase();
    var avatar = me.avatar || "";
    var m = me.membership;
    var courses = coursesData.courses || [];
    var products = productsData.products || [];

    var avHtml = avatar
      ? '<img src="' + esc(abs(avatar)) + '" alt="" onerror="this.parentNode.textContent=\'' + esc(initial) + '\'"/>'
      : esc(initial);
    var tierBadge = m
      ? '<span class="dh-tier">★ ' + esc(m.tierTitle) + ' member</span>'
      : '<span class="dh-tier free">Free account</span>';

    var hero =
      '<div class="dash-hero">' +
        '<div class="dh-top"><div class="dh-av">' + avHtml + '</div>' +
          '<div><p class="dh-hi">' + greet + ',</p><p class="dh-name">' + esc(name) + ' 👋</p>' + tierBadge + '</div></div>' +
        '<div class="dash-stats">' +
          '<div class="dash-stat"><div class="ds-num">' + courses.length + '</div><div class="ds-lbl">Course' + (courses.length === 1 ? "" : "s") + '</div></div>' +
          '<div class="dash-stat"><div class="ds-num">' + products.length + '</div><div class="ds-lbl">Product' + (products.length === 1 ? "" : "s") + '</div></div>' +
          '<div class="dash-stat"><div class="ds-num">' + (m ? "★" : "—") + '</div><div class="ds-lbl">' + (m ? esc(m.tierTitle) : "No plan") + '</div></div>' +
        '</div>' +
      '</div>';

    root.innerHTML = hero + membershipPanel(m) + coursesSection(courses) + productsSection(products);
  }

  function membershipPanel(m) {
    if (!m) {
      return '<section class="dash-sec"><div class="mem-panel">' +
        '<div class="mem-ic">🔓</div>' +
        '<div class="mem-main"><h3>Unlock everything with a membership</h3>' +
          '<p>Get premium software, AI tools, video resources and early access to prototype apps — from $29/mo.</p></div>' +
        '<div class="mem-actions"><a class="mem-btn primary" href="/pricing">See plans →</a></div>' +
      '</div></section>';
    }
    var renews = m.currentPeriodEnd ? fmtDate(m.currentPeriodEnd) : "";
    var line;
    if (m.cancelAtPeriodEnd) line = '<span class="mem-warn">Auto-renew is off · access ends ' + esc(renews) + '</span>';
    else if (m.autoRenew) line = '<span class="mem-renew">Renews automatically on ' + esc(renews) + '</span>';
    else line = '<span class="mem-renew">Active until ' + esc(renews) + ' · renew before then to stay in</span>';
    return '<section class="dash-sec"><div class="mem-panel active">' +
      '<div class="mem-ic">★</div>' +
      '<div class="mem-main"><h3>' + esc(m.tierTitle) + ' membership</h3>' +
        '<p>' + line + '</p></div>' +
      '<div class="mem-actions">' +
        (m.rank < 3 ? '<a class="mem-btn primary" href="/pricing">Upgrade</a>' : "") +
        '<a class="mem-btn ghost" href="/student-profile">Manage</a>' +
      '</div>' +
    '</div></section>';
  }

  function coursesSection(courses) {
    var body = courses.length
      ? '<div class="course-grid">' + courses.map(courseCard).join("") + '</div>'
      : '<div class="dash-empty">You haven’t enrolled in any courses yet. <a href="/learn">Browse courses →</a></div>';
    return '<section class="dash-sec"><div class="dash-sec-head"><h2>My courses</h2><a href="/learn">Browse all →</a></div>' + body + '</section>';
  }
  function courseCard(c) {
    return '<a class="course-card" href="/learn/' + encodeURIComponent(c.slug || c.id) + '">' +
      '<div class="course-thumb" style="background-image:url(\'' + esc(abs(c.cover)) + '\')"><img src="' + esc(abs(c.cover)) + '" alt="' + esc(c.title) + '" loading="lazy" onerror="this.style.display=\'none\'"/></div>' +
      '<div class="course-body"><div class="course-title">' + esc(c.title) + '</div><div class="course-sub">' + esc(c.subtitle || "") + '</div>' +
      '<div class="course-meta"><span class="course-price owned" style="color:#22c55e">Owned ✓</span><span class="course-lessons">' + (c.lessonCount || 0) + ' lessons</span></div></div></a>';
  }

  function productsSection(products) {
    if (!products.length) return "";
    return '<section class="dash-sec"><div class="dash-sec-head"><h2>My products</h2></div>' +
      '<div class="product-grid">' + products.map(productCard).join("") + '</div></section>';
  }
  function productCard(p) {
    var d = p.deliverable;
    var dl = d ? '<a class="pcard-dl" href="' + esc(abs(d.url)) + '"' + (d.kind === "download" ? " download" : ' target="_blank" rel="noopener"') + '>' +
      (d.kind === "download" ? "⬇ Download" : "↗ " + esc(d.label || "Open")) + '</a>' : "";
    var tag = p.access === "subscription" ? '<span class="pcard-tag">Membership</span>' : '<span class="pcard-tag">Owned</span>';
    return '<div class="pcard">' +
      '<div class="pcard-thumb" style="background-image:url(\'' + esc(abs(p.image)) + '\')"><img src="' + esc(abs(p.image)) + '" alt="' + esc(p.title) + '" loading="lazy" onerror="this.style.display=\'none\'"/></div>' +
      '<div class="pcard-body"><div class="pt">' + esc(p.title) + '</div><div class="ps">' + esc(p.subtitle || "") + '</div>' + tag + dl + '</div></div>';
  }
})();
