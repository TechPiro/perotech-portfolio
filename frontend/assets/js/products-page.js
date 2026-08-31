// Renders the Products page from /api/products. Free products link out; one-time
// products open a checkout; subscription products route to the pricing page.
(function () {
  var list = document.getElementById("products-list");
  if (!list) return;

  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var money = function (n) { return "$" + (Math.round(Number(n) || 0)).toLocaleString(); };
  var preview = 'M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V12L17.206 8.207L11.2071 14.2071L9.79289 12.7929L15.792 6.793L12 3H21Z';
  var arrow = '<svg class="arrow-up" width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.91634 4.5835L4.08301 10.4168" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.66699 4.5835H9.91699V9.8335" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

  var state = { pay: {}, settings: {} };

  function badge(p) {
    if (p.access === "subscription") return '<span class="pcard-tag" style="background:rgba(71,112,255,.16);color:#6f93ff;position:absolute;top:10px;left:10px;z-index:2">Members</span>';
    if (p.access === "onetime") return '<span class="pcard-tag" style="background:rgba(52,209,122,.16);color:#34d17a;position:absolute;top:10px;left:10px;z-index:2">' + esc(money(p.price)) + '</span>';
    return "";
  }
  function cta(p) {
    if (p.access === "subscription")
      return '<div class="visite-btn"><a href="/pricing" data-sub>Unlock with membership' + arrow + '</a></div>';
    if (p.access === "onetime")
      return '<div class="visite-btn"><a href="#" data-buy="' + esc(p.id) + '" data-price="' + esc(p.price) + '" data-title="' + esc(p.title) + '">Get it — ' + esc(money(p.price)) + arrow + '</a></div>';
    return '<div class="visite-btn"><a target="_blank" href="' + esc(p.url) + '">Visit Site' + arrow + '</a></div>';
  }
  function card(p) {
    var linkOpen = p.access === "free" ? esc(p.url) : "/pricing";
    var linkTarget = p.access === "free" ? ' target="_blank"' : "";
    return '<div class="col-lg-12"><div class="portfolio-item">' +
      '<div class="image" style="position:relative"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" class="img-fluid w-100" />' + badge(p) +
        '<a href="' + linkOpen + '"' + linkTarget + ' class="full-image-preview">' +
        '<svg class="icon" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="' + preview + '"></path></svg></a></div>' +
      '<div class="text"><div class="info"><a' + linkTarget + ' class="title" href="' + linkOpen + '">' + esc(p.title) + '</a>' +
        '<p class="subtitle">' + esc(p.subtitle || "") + '</p></div>' + cta(p) + '</div>' +
    '</div></div>';
  }

  Promise.all([
    fetch("/api/products").then(function (r) { return r.json(); }),
    fetch("/api/pay/config").then(function (r) { return r.json(); }).catch(function () { return {}; }),
    fetch("/api/settings").then(function (r) { return r.json(); }).catch(function () { return {}; }),
  ]).then(function (res) {
    state.pay = res[1] || {}; state.settings = res[2] || {};
    var items = res[0];
    if (Array.isArray(items) && items.length) {
      list.innerHTML = items.map(card).join("");
      list.querySelectorAll("[data-buy]").forEach(function (b) {
        b.addEventListener("click", function (e) { e.preventDefault(); openBuy(b.getAttribute("data-buy"), b.getAttribute("data-title"), Number(b.getAttribute("data-price")) || 0); });
      });
    }
  }).catch(function () {});

  // ---- one-time product checkout (card + crypto) ----
  function openBuy(productId, title, price) {
    var pay = state.pay || {};
    var wallets = (state.settings && state.settings.crypto) || {};
    var coins = ["BTC", "USDT", "SOL", "ETH"].filter(function (c) { return wallets[c.toLowerCase()]; });
    var cardEnabled = !!pay.flutterwave;
    var saved = (window.PT && PT.email && PT.email()) || "";
    var overlay = document.getElementById("pm-overlay") || (function () {
      var o = document.createElement("div"); o.id = "pm-overlay"; o.className = "pm-overlay"; document.body.appendChild(o);
      o.addEventListener("click", function (e) { if (e.target === o) o.classList.remove("open"); });
      return o;
    })();
    overlay.innerHTML =
      '<div class="pm-card" role="dialog" aria-modal="true">' +
        '<button class="pm-x" aria-label="Close">&times;</button>' +
        '<div class="pm-title">' + esc(title) + '</div>' +
        '<p class="pm-summary"><b>' + esc(money(price)) + '</b> · one-time purchase · lifetime access</p>' +
        '<div class="pm-tabs">' +
          (cardEnabled ? '<button class="pm-tab active" data-m="card">💳 Card / Bank</button>' : "") +
          (coins.length ? '<button class="pm-tab ' + (cardEnabled ? "" : "active") + '" data-m="crypto">🪙 Crypto</button>' : "") +
        '</div>' +
        '<div class="pm-field"><label>Email (where your product is sent)</label><input class="pm-email" type="email" value="' + esc(saved) + '" placeholder="you@email.com"/></div>' +
        '<div class="pm-pane" data-pane="card"' + (cardEnabled ? "" : ' style="display:none"') + '>' +
          '<button class="pm-btn" data-pay-card>Continue to secure checkout →</button></div>' +
        '<div class="pm-pane" data-pane="crypto"' + (cardEnabled ? ' style="display:none"' : "") + '>' +
          (coins.length ? '<div class="pm-field"><label>Coin</label><select class="pm-coin">' + coins.map(function (c) { return '<option>' + c + '</option>'; }).join("") + '</select></div>' +
          '<div class="pm-wallet" data-wallet></div>' +
          '<div class="pm-field"><label>Transaction hash</label><input class="pm-tx" placeholder="Paste your tx hash"/></div>' +
          '<button class="pm-btn" data-pay-crypto>I\'ve paid — submit</button>' : '<p class="pm-fine">Crypto is not configured.</p>') +
        '</div><div class="pm-msg" aria-live="polite"></div>' +
      '</div>';
    overlay.classList.add("open");

    var msg = overlay.querySelector(".pm-msg");
    var emailI = overlay.querySelector(".pm-email");
    var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    overlay.querySelector(".pm-x").addEventListener("click", function () { overlay.classList.remove("open"); });
    overlay.querySelectorAll(".pm-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        overlay.querySelectorAll(".pm-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        overlay.querySelectorAll(".pm-pane").forEach(function (p) { p.style.display = p.getAttribute("data-pane") === tab.getAttribute("data-m") ? "" : "none"; });
      });
    });
    var coinSel = overlay.querySelector(".pm-coin"), walletBox = overlay.querySelector("[data-wallet]");
    function showWallet() { if (walletBox && coinSel) { var w = wallets[coinSel.value.toLowerCase()] || ""; walletBox.innerHTML = "<b>Send " + esc(coinSel.value) + " to</b>" + (w ? esc(w) : "Address not set."); } }
    if (coinSel) { coinSel.addEventListener("change", showWallet); showWallet(); }

    var cardBtn = overlay.querySelector("[data-pay-card]");
    if (cardBtn) cardBtn.addEventListener("click", function () {
      var email = emailI.value.trim();
      if (!EMAIL_RE.test(email)) { msg.className = "pm-msg err"; msg.textContent = "Please enter a valid email."; return; }
      cardBtn.disabled = true; msg.textContent = "Starting checkout…";
      fetch("/api/pay/flutterwave/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "product", productId: productId, email: email }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (o) { if (o.ok && o.j.link) location.href = o.j.link; else { cardBtn.disabled = false; msg.className = "pm-msg err"; msg.textContent = o.j.error || "Could not start checkout."; } })
        .catch(function () { cardBtn.disabled = false; msg.className = "pm-msg err"; msg.textContent = "Network error."; });
    });
    var cryptoBtn = overlay.querySelector("[data-pay-crypto]");
    if (cryptoBtn) cryptoBtn.addEventListener("click", function () {
      var email = emailI.value.trim(), tx = (overlay.querySelector(".pm-tx").value || "").trim();
      if (!EMAIL_RE.test(email)) { msg.className = "pm-msg err"; msg.textContent = "Please enter a valid email."; return; }
      if (tx.length < 6) { msg.className = "pm-msg err"; msg.textContent = "Paste your transaction hash."; return; }
      cryptoBtn.disabled = true; msg.textContent = "Submitting…";
      fetch("/api/pay/crypto/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "product", productId: productId, coin: coinSel.value, txHash: tx, email: email }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (o) {
          if (o.ok && o.j.id) { overlay.querySelector(".pm-card").innerHTML = '<div class="pm-confirm"><div class="pm-title">🎉 Payment submitted</div><p class="pm-summary">We\'ll confirm and email your access shortly.</p><a class="pm-btn" style="display:block;text-decoration:none;text-align:center" href="/learn-dashboard">Go to dashboard →</a></div>'; }
          else { cryptoBtn.disabled = false; msg.className = "pm-msg err"; msg.textContent = o.j.error || "Could not submit."; }
        }).catch(function () { cryptoBtn.disabled = false; msg.className = "pm-msg err"; msg.textContent = "Network error."; });
    });
  }
})();
