// Professional student profile: identity, membership (with cancel), and a
// summary of everything they own. Name is editable inline.
(function () {
  if (!(window.PT && PT.token && PT.token())) { location.href = "/student-login?next=/student-profile"; return; }
  PT.renderAuthBar(document.getElementById("learn-authbar"));
  PT.renderBottomNav("profile");

  var root = document.getElementById("profile-root");
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var abs = function (u) { u = String(u || ""); return /^https?:\/\//i.test(u) ? u : "/" + u.replace(/^\//, ""); };
  var fmtDate = function (ts) { try { return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return ""; } };
  var money = function (n) { return "$" + (Math.round(Number(n) || 0)).toLocaleString(); };
  var email = PT.email();
  var me = null, courses = 0, products = 0;

  Promise.all([
    api("/api/student/me"),
    api("/api/student/my-courses"),
    api("/api/student/my-products"),
  ]).then(function (r) {
    me = r[0] || {}; courses = (r[1] && r[1].courses || []).length; products = (r[2] && r[2].products || []).length;
    render();
  }).catch(function (e) { if (e && e.message === "auth") return; root.innerHTML = '<div class="learn-empty">Could not load your profile.</div>'; });

  function api(url) {
    return fetch(url, { headers: PT.authHeaders() }).then(function (res) {
      if (res.status === 401) { PT.clear(); location.href = "/student-login?next=/student-profile"; throw new Error("auth"); }
      return res.json();
    });
  }

  function render() {
    var name = (me.name || PT.name() || email.split("@")[0] || "Student").trim();
    var initial = (name[0] || "S").toUpperCase();
    var avatar = me.avatar || "";
    var m = me.membership;
    var avHtml = avatar ? '<img src="' + esc(abs(avatar)) + '" alt=""/>' : esc(initial);
    var tierBadge = m
      ? '<span class="pid-badge prof-badge-tier">★ ' + esc(m.tierTitle) + ' member</span>'
      : '<span class="pid-badge">Free account</span>';

    root.innerHTML =
      '<div class="profile-hero">' +
        '<div class="profile-av">' + avHtml + '</div>' +
        '<div class="profile-id"><h1>' + esc(name) + '</h1><p class="pid-email">' + esc(email) + '</p>' + tierBadge + '</div>' +
      '</div>' +
      '<a class="profile-cta" href="/learn-dashboard">▶ Go to my dashboard</a>' +
      membershipSection(m) +
      '<div class="profile-section"><h3>Library</h3>' +
        '<div class="p-row"><span class="p-label">Courses</span><span class="p-val">' + courses + '</span></div>' +
        '<div class="p-row"><span class="p-label">Products</span><span class="p-val">' + products + '</span></div>' +
      '</div>' +
      '<div class="profile-section"><h3>Account</h3>' +
        '<div class="p-row"><span class="p-label">Display name</span><span class="p-val" id="nameval">' + esc(name) + '</span></div>' +
        '<div class="p-editname"><input id="name-input" value="' + esc(name) + '" maxlength="80" placeholder="Your name"/><button id="name-save">Save</button></div>' +
        '<div class="p-row"><span class="p-label">Email</span><span class="p-val">' + esc(email) + '</span></div>' +
        '<div class="p-row"><span class="p-label">Member since</span><span class="p-val">' + (me.createdAt ? esc(fmtDate(me.createdAt)) : "—") + '</span></div>' +
        '<div class="p-row"><span class="p-label">Sign-in</span><span class="p-val">Passwordless (magic link)</span></div>' +
      '</div>' +
      '<button class="p-signout" id="p-signout">Sign out</button>';

    document.getElementById("p-signout").addEventListener("click", function () { PT.clear(); location.href = "/learn"; });
    wireName();
    wireCancel();
  }

  function membershipSection(m) {
    if (!m) {
      return '<div class="profile-section"><h3>Membership</h3>' +
        '<div class="p-row"><span class="p-label">Status</span><span class="p-val">No active plan</span></div>' +
        '<a class="profile-cta" style="background:linear-gradient(180deg,#5a86ff,#4770ff)" href="/pricing">Unlock a membership →</a></div>';
    }
    var renews = m.currentPeriodEnd ? fmtDate(m.currentPeriodEnd) : "—";
    var statusText = m.cancelAtPeriodEnd ? "Cancelling — ends " + renews
      : m.autoRenew ? "Active · auto-renews " + renews
      : "Active until " + renews;
    var cancelBtn = (!m.cancelAtPeriodEnd)
      ? '<div class="p-manage"><a class="mem-btn ghost" href="/pricing" style="border:1px solid #33364a;color:#fff;text-decoration:none;padding:9px 14px;border-radius:10px;font-weight:600;font-size:.84rem">Change plan</a>' +
        '<button class="p-cancel" id="cancel-sub">Cancel membership</button></div>'
      : '<div class="p-manage"><a class="mem-btn ghost" href="/pricing" style="border:1px solid #33364a;color:#fff;text-decoration:none;padding:9px 14px;border-radius:10px;font-weight:600;font-size:.84rem">Reactivate</a></div>';
    return '<div class="profile-section"><h3>Membership</h3>' +
      '<div class="p-row"><span class="p-label">Plan</span><span class="p-val">' + esc(m.tierTitle) + ' (' + esc(m.interval) + ')</span></div>' +
      '<div class="p-row"><span class="p-label">Status</span><span class="p-val">' + esc(statusText) + '</span></div>' +
      '<div class="p-row"><span class="p-label">Price</span><span class="p-val">' + money(m.amountUsd) + '/' + (m.interval === "yearly" ? "yr" : "mo") + '</span></div>' +
      cancelBtn + '<div class="pm-msg" id="sub-msg"></div></div>';
  }

  function wireName() {
    var btn = document.getElementById("name-save");
    var input = document.getElementById("name-input");
    if (!btn || !input) return;
    btn.addEventListener("click", function () {
      var v = input.value.trim();
      if (!v) return;
      btn.disabled = true; btn.textContent = "…";
      fetch("/api/student/me", { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, PT.authHeaders()), body: JSON.stringify({ name: v }) })
        .then(function (r) { return r.json(); }).then(function (d) {
          try { localStorage.setItem("pt_student_name", d.name || v); } catch (e) {}
          document.getElementById("nameval").textContent = d.name || v;
          document.querySelector(".profile-id h1").textContent = d.name || v;
          btn.disabled = false; btn.textContent = "Saved ✓";
          setTimeout(function () { btn.textContent = "Save"; }, 1500);
        }).catch(function () { btn.disabled = false; btn.textContent = "Save"; });
    });
  }

  function wireCancel() {
    var btn = document.getElementById("cancel-sub");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!confirm("Cancel your membership? You'll keep access until the end of your paid period.")) return;
      btn.disabled = true; btn.textContent = "Cancelling…";
      var msg = document.getElementById("sub-msg");
      fetch("/api/pay/subscription/cancel", { method: "POST", headers: PT.authHeaders() })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (o) {
          if (o.ok) { api("/api/student/me").then(function (d) { me = d; render(); }); }
          else { btn.disabled = false; btn.textContent = "Cancel membership"; if (msg) { msg.className = "pm-msg err"; msg.textContent = o.j.error || "Could not cancel."; } }
        }).catch(function () { btn.disabled = false; btn.textContent = "Cancel membership"; });
    });
  }
})();
