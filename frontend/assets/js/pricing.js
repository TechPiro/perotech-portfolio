// PeroTech membership pricing page. Renders tiers from /api/memberships with an
// animated price, a monthly/yearly toggle, and a card/crypto checkout modal.
(function () {
  var root = document.getElementById("pricing-root");
  if (!root) return;

  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var money = function (n) { return "$" + (Math.round(Number(n) || 0)).toLocaleString(); };
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  var state = { yearly: false, data: null, me: null, pay: null, settings: null };

  Promise.all([
    fetch("/api/memberships").then(function (r) { return r.json(); }).catch(function () { return { tiers: [] }; }),
    fetch("/api/pay/config").then(function (r) { return r.json(); }).catch(function () { return {}; }),
    fetch("/api/settings").then(function (r) { return r.json(); }).catch(function () { return {}; }),
    meFetch(),
  ]).then(function (res) {
    state.data = res[0]; state.pay = res[1]; state.settings = res[2]; state.me = res[3];
    render();
    notifyReturn();
  });

  function meFetch() {
    var t = window.PT && PT.token && PT.token();
    if (!t) return Promise.resolve(null);
    return fetch("/api/student/me", { headers: PT.authHeaders() }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function currentRank() { return state.me && state.me.membership ? Number(state.me.membership.rank) || 0 : 0; }

  function render() {
    var d = state.data || {};
    var tiers = (d.tiers || []).slice().sort(function (a, b) { return (a.rank || 0) - (b.rank || 0); });
    var disc = Number(d.yearlyDiscountPct) || 20;
    root.innerHTML =
      '<div class="pricing-head">' +
        '<span class="pricing-eyebrow">Membership</span>' +
        '<h1 class="pricing-title">' + esc(d.heading || "Choose your membership") + '</h1>' +
        '<p class="pricing-sub">' + esc(d.subheading || "") + '</p>' +
        '<div class="billing-toggle" role="tablist" aria-label="Billing period">' +
          '<button role="tab" data-bill="monthly" class="' + (!state.yearly ? "active" : "") + '" aria-selected="' + (!state.yearly) + '">Monthly</button>' +
          '<button role="tab" data-bill="yearly" class="' + (state.yearly ? "active" : "") + '" aria-selected="' + (state.yearly) + '">Yearly<span class="save-pill">Save ' + disc + '%</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="pricing-grid">' + tiers.map(card).join("") + '</div>' +
      '<div class="pricing-assure">' +
        '<span>' + CHECK + ' Cancel anytime</span>' +
        '<span>' + CHECK + ' Instant access</span>' +
        '<span>' + CHECK + ' Card &amp; crypto</span>' +
      '</div>' +
      '<p class="pricing-note">Questions about a plan? <a href="/chat">Chat with us →</a></p>';

    root.querySelectorAll(".billing-toggle button").forEach(function (b) {
      b.addEventListener("click", function () {
        var yearly = b.getAttribute("data-bill") === "yearly";
        if (yearly === state.yearly) return;
        state.yearly = yearly;
        root.querySelectorAll(".billing-toggle button").forEach(function (x) {
          var on = x.getAttribute("data-bill") === (yearly ? "yearly" : "monthly");
          x.classList.toggle("active", on); x.setAttribute("aria-selected", on);
        });
        tiers.forEach(function (t) { updatePrice(t); });
      });
    });
    root.querySelectorAll("[data-buy]").forEach(function (b) {
      b.addEventListener("click", function () { openCheckout(b.getAttribute("data-buy")); });
    });
    tiers.forEach(function (t) { setTimeout(function () { updatePrice(t, true); }, 30); });
  }

  function perMonth(t) { return state.yearly ? Math.round((Number(t.yearly) || 0) / 12) : (Number(t.monthly) || 0); }

  function card(t) {
    var featured = !!t.featured;
    var isCurrent = currentRank() === (Number(t.rank) || 0) && currentRank() > 0;
    var feats = (t.features || []).map(function (f) {
      var ev = /^everything in/i.test(f);
      return '<li class="' + (ev ? "everything" : "") + '"><span class="tick">' + CHECK + '</span><span>' + esc(f) + '</span></li>';
    }).join("");
    var ctaClass = isCurrent ? "current" : (featured ? "primary" : "ghost");
    var ctaText = isCurrent ? "Your current plan" : (currentRank() > 0 && (Number(t.rank) || 0) < currentRank() ? "Included in your plan" : (t.ctaText || ("Get " + t.title)));
    var disabled = isCurrent ? " disabled" : "";
    var buyAttr = isCurrent ? "" : ' data-buy="' + esc(t.id) + '"';
    return '<div class="plan-card' + (featured ? " featured" : "") + '" data-tier="' + esc(t.id) + '">' +
      (featured ? '<span class="plan-badge">★ Most Popular</span>' : "") +
      '<h3 class="plan-name">' + esc(t.title) + '</h3>' +
      '<p class="plan-desc">' + esc(t.description || "") + '</p>' +
      '<div class="plan-price"><span class="cur">$</span><span class="amount" data-amount></span><span class="per">/mo</span></div>' +
      '<p class="plan-billed" data-billed></p>' +
      '<ul class="plan-features">' + feats + '</ul>' +
      '<button class="plan-cta ' + ctaClass + '"' + buyAttr + disabled + '>' + esc(ctaText) + '</button>' +
    '</div>';
  }

  // Clean price update with a subtle fade-slide swap on toggle.
  function updatePrice(t, initial) {
    var cardEl = root.querySelector('.plan-card[data-tier="' + cssEsc(t.id) + '"]');
    if (!cardEl) return;
    var amt = cardEl.querySelector("[data-amount]");
    var billed = cardEl.querySelector("[data-billed]");
    var val = String(perMonth(t));
    if (initial || !amt.textContent) {
      amt.textContent = val;
    } else if (amt.textContent !== val) {
      amt.classList.add("swap");
      setTimeout(function () { amt.textContent = val; amt.classList.remove("swap"); }, 200);
    }
    if (state.yearly) {
      var save = (Number(t.monthly) || 0) * 12 - (Number(t.yearly) || 0);
      billed.innerHTML = "Billed " + money(t.yearly) + "/yr" + (save > 0 ? ' <span class="save">Save ' + money(save) + '</span>' : "");
    } else {
      billed.textContent = "Billed monthly";
    }
  }
  function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }

  function notifyReturn() {
    var p = new URLSearchParams(location.search).get("pay");
    if (p === "failed" || p === "cancelled") {
      alertBox(p === "cancelled" ? "Checkout was cancelled. You can try again anytime." : "That payment didn't go through. Please try again or use crypto.");
    }
  }
  function alertBox(msg) {
    var b = document.createElement("div");
    b.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:5000;background:#151824;border:1px solid #33364a;color:#e7ebf3;padding:12px 18px;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.5);font-size:.9rem;max-width:90vw";
    b.textContent = msg; document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 5000);
  }

  // ---------- checkout ----------
  function openCheckout(tierId) {
    var tier = (state.data.tiers || []).find(function (t) { return t.id === tierId; });
    if (!tier) return;
    var interval = state.yearly ? "yearly" : "monthly";
    var amount = state.yearly ? (Number(tier.yearly) || 0) : (Number(tier.monthly) || 0);
    var pay = state.pay || {};
    var cryptoWallets = (state.settings && state.settings.crypto) || {};
    var savedEmail = (window.PT && PT.email && PT.email()) || "";

    var overlay = document.getElementById("pm-overlay") || (function () {
      var o = document.createElement("div"); o.id = "pm-overlay"; o.className = "pm-overlay"; document.body.appendChild(o);
      o.addEventListener("click", function (e) { if (e.target === o) o.classList.remove("open"); });
      return o;
    })();

    var coins = ["BTC", "USDT", "SOL", "ETH"].filter(function (c) { return cryptoWallets[c.toLowerCase()]; });
    var cardEnabled = !!pay.flutterwave;
    var billLine = interval === "yearly"
      ? money(amount) + " billed yearly · auto-renews yearly"
      : money(amount) + "/month · auto-renews monthly";

    overlay.innerHTML =
      '<div class="pm-card" role="dialog" aria-modal="true">' +
        '<button class="pm-x" aria-label="Close">&times;</button>' +
        '<div class="pm-title">' + esc(tier.title) + ' membership</div>' +
        '<p class="pm-summary"><b>' + esc(billLine) + '</b><br>Cancel anytime — access lasts through the paid period.</p>' +
        '<div class="pm-tabs">' +
          (cardEnabled ? '<button class="pm-tab active" data-m="card">💳 Card / Bank</button>' : "") +
          (coins.length ? '<button class="pm-tab ' + (cardEnabled ? "" : "active") + '" data-m="crypto">🪙 Crypto</button>' : "") +
        '</div>' +
        '<div class="pm-field"><label>Email (where your access is sent)</label><input class="pm-email" type="email" placeholder="you@email.com" value="' + esc(savedEmail) + '" autocomplete="email"/></div>' +
        '<div class="pm-pane" data-pane="card"' + (cardEnabled ? "" : ' style="display:none"') + '>' +
          '<button class="pm-btn" data-pay-card>Continue to secure checkout →</button>' +
          '<p class="pm-fine">Powered by Flutterwave · card auto-renews. Nigerian cards can pay in ₦ with bank transfer.</p>' +
        '</div>' +
        '<div class="pm-pane" data-pane="crypto"' + (cardEnabled ? ' style="display:none"' : "") + '>' +
          (coins.length ? '<div class="pm-field"><label>Coin</label><select class="pm-coin">' + coins.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join("") + '</select></div>' +
          '<div class="pm-wallet" data-wallet></div>' +
          '<div class="pm-field"><label>Transaction hash (after you send ' + money(amount) + ')</label><input class="pm-tx" placeholder="Paste your tx hash"/></div>' +
          '<button class="pm-btn" data-pay-crypto>I\'ve paid — submit for confirmation</button>' +
          '<p class="pm-fine">A one-time crypto payment covers this term; renew before it ends to stay active.</p>'
          : '<p class="pm-fine">Crypto is not configured yet.</p>') +
        '</div>' +
        '<div class="pm-msg" aria-live="polite"></div>' +
      '</div>';
    overlay.classList.add("open");

    var msg = overlay.querySelector(".pm-msg");
    var emailI = overlay.querySelector(".pm-email");
    overlay.querySelector(".pm-x").addEventListener("click", function () { overlay.classList.remove("open"); });

    overlay.querySelectorAll(".pm-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        overlay.querySelectorAll(".pm-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var m = tab.getAttribute("data-m");
        overlay.querySelectorAll(".pm-pane").forEach(function (p) { p.style.display = p.getAttribute("data-pane") === m ? "" : "none"; });
      });
    });

    var walletBox = overlay.querySelector("[data-wallet]");
    var coinSel = overlay.querySelector(".pm-coin");
    function showWallet() {
      if (!walletBox || !coinSel) return;
      var w = cryptoWallets[coinSel.value.toLowerCase()] || "";
      walletBox.innerHTML = "<b>Send " + esc(coinSel.value) + " to</b>" + (w ? esc(w) : "Address not set — contact support.");
    }
    if (coinSel) { coinSel.addEventListener("change", showWallet); showWallet(); }

    var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    var cardBtn = overlay.querySelector("[data-pay-card]");
    if (cardBtn) cardBtn.addEventListener("click", function () {
      var email = emailI.value.trim();
      if (!EMAIL_RE.test(email)) { msg.className = "pm-msg err"; msg.textContent = "Please enter a valid email."; return; }
      cardBtn.disabled = true; msg.className = "pm-msg"; msg.textContent = "Starting secure checkout…";
      fetch("/api/pay/subscription/init", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tierId, interval: interval, email: email }),
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (o) {
          if (o.ok && o.j.link) { location.href = o.j.link; }
          else { cardBtn.disabled = false; msg.className = "pm-msg err"; msg.textContent = o.j.error || "Could not start checkout."; }
        }).catch(function () { cardBtn.disabled = false; msg.className = "pm-msg err"; msg.textContent = "Network error. Please try again."; });
    });

    var cryptoBtn = overlay.querySelector("[data-pay-crypto]");
    if (cryptoBtn) cryptoBtn.addEventListener("click", function () {
      var email = emailI.value.trim();
      var tx = (overlay.querySelector(".pm-tx").value || "").trim();
      if (!EMAIL_RE.test(email)) { msg.className = "pm-msg err"; msg.textContent = "Please enter a valid email."; return; }
      if (tx.length < 6) { msg.className = "pm-msg err"; msg.textContent = "Paste your transaction hash."; return; }
      cryptoBtn.disabled = true; msg.className = "pm-msg"; msg.textContent = "Submitting…";
      fetch("/api/pay/crypto/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", tierId: tierId, interval: interval, coin: coinSel.value, txHash: tx, email: email }),
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (o) {
          if (o.ok && o.j.id) confirmScreen(overlay, o.j.id);
          else { cryptoBtn.disabled = false; msg.className = "pm-msg err"; msg.textContent = o.j.error || "Could not submit."; }
        }).catch(function () { cryptoBtn.disabled = false; msg.className = "pm-msg err"; msg.textContent = "Network error."; });
    });
  }

  function confirmScreen(overlay, id) {
    var cardEl = overlay.querySelector(".pm-card");
    cardEl.innerHTML =
      '<div class="pm-confirm"><div class="pm-spinner"></div>' +
      '<div class="pm-title">Confirming your payment…</div>' +
      '<p class="pm-summary">This can take a few minutes. We\'ll email your access link the moment it\'s approved — you can safely close this window.</p></div>';
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      fetch("/api/pay/crypto/status?id=" + encodeURIComponent(id)).then(function (r) { return r.json(); }).then(function (s) {
        if (s.status === "active") {
          clearInterval(timer);
          cardEl.innerHTML = '<div class="pm-confirm"><div class="pm-title">🎉 You\'re in!</div><p class="pm-summary">Your membership is active. Check your email for your sign-in link, then head to your dashboard.</p><a class="pm-btn" style="display:block;text-decoration:none;text-align:center" href="/learn-dashboard">Go to dashboard →</a></div>';
        } else if (s.status === "rejected") {
          clearInterval(timer);
          cardEl.innerHTML = '<div class="pm-confirm"><div class="pm-title">We couldn\'t confirm this payment</div><p class="pm-summary">Please reach out and we\'ll sort it out right away.</p><a class="pm-btn" style="display:block;text-decoration:none;text-align:center" href="/chat">Contact support</a></div>';
        }
      }).catch(function () {});
      if (tries > 120) clearInterval(timer); // ~10 min
    }, 5000);
  }
})();
