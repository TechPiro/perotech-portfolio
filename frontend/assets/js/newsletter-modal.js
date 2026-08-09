// PeroTech newsletter modal — appears once, 180s after the visitor arrives.
// Self-contained: injects its own styles, respects a "seen" flag, posts to /api/subscribe.
(function () {
  var SEEN_KEY = "pt_nl_seen";
  var DELAY_MS = 180000; // 180 seconds
  try { if (localStorage.getItem(SEEN_KEY)) return; } catch (e) {}

  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var PHOTO = "/assets/img/images/profile-large.webp";
  var VERIFIED = '<svg viewBox="0 0 40 40" width="16" height="16" style="vertical-align:-2px" aria-label="Verified"><path fill="#3897f0" d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Z"/><polygon fill="#fff" points="28.157 12.358 24.072 16.443 17.072 23.443 12.831 19.202 9.992 22.041 17.072 29.121 30.996 15.197"/></svg>';

  function injectStyles() {
    if (document.getElementById("pt-nl-styles")) return;
    var css = ''
      + '.pt-nl-overlay{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(6,8,14,.72);backdrop-filter:blur(6px);opacity:0;transition:opacity .3s ease}'
      + '.pt-nl-overlay.show{opacity:1}'
      + '.pt-nl-card{position:relative;width:100%;max-width:440px;background:linear-gradient(180deg,#151824,#0e1017);border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:30px 28px 26px;box-shadow:0 40px 100px rgba(0,0,0,.6);color:#e7ebf3;font-family:Inter,-apple-system,"Segoe UI",Roboto,sans-serif;transform:translateY(18px) scale(.98);transition:transform .35s cubic-bezier(.16,1,.3,1);text-align:center}'
      + '.pt-nl-overlay.show .pt-nl-card{transform:none}'
      + '.pt-nl-x{position:absolute;top:14px;right:16px;width:32px;height:32px;border:none;border-radius:50%;background:rgba(255,255,255,.08);color:#c4c9d4;font-size:1.3rem;line-height:1;cursor:pointer;transition:background .2s}'
      + '.pt-nl-x:hover{background:rgba(255,255,255,.18)}'
      + '.pt-nl-av{width:76px;height:76px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;border:3px solid rgba(71,112,255,.5);box-shadow:0 8px 24px rgba(0,0,0,.4)}'
      + '.pt-nl-name{font-weight:700;font-size:1rem}.pt-nl-role{color:#98a1b5;font-size:.8rem;margin-bottom:14px}'
      + '.pt-nl-h{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;line-height:1.2;margin:0 0 6px}'
      + '.pt-nl-sub{color:#98a1b5;font-size:.92rem;margin:0 0 18px}'
      + '.pt-nl-list{list-style:none;margin:0 0 20px;padding:0;text-align:left;display:flex;flex-direction:column;gap:11px}'
      + '.pt-nl-list li{display:flex;gap:11px;align-items:flex-start;font-size:.92rem;color:#d6dae4;line-height:1.45}'
      + '.pt-nl-list .tick{flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:rgba(71,112,255,.16);color:#6f93ff;display:grid;place-items:center;font-size:.8rem;margin-top:1px}'
      + '.pt-nl-form{display:flex;flex-direction:column;gap:9px}'
      + '.pt-nl-form input{width:100%;background:#0c0f18;border:1px solid rgba(255,255,255,.14);border-radius:11px;color:#fff;font:inherit;font-size:.95rem;padding:12px 14px;box-sizing:border-box}'
      + '.pt-nl-form input:focus{outline:none;border-color:#4770ff}'
      + '.pt-nl-btn{width:100%;border:none;border-radius:11px;background:linear-gradient(180deg,#5a86ff,#4770ff);color:#fff;font:inherit;font-weight:700;font-size:1rem;padding:13px;cursor:pointer;transition:transform .15s,box-shadow .2s;box-shadow:0 10px 26px rgba(71,112,255,.4)}'
      + '.pt-nl-btn:hover{transform:translateY(-1px)}.pt-nl-btn:disabled{opacity:.7;cursor:default;transform:none}'
      + '.pt-nl-fine{color:#7c8395;font-size:.76rem;margin-top:12px}'
      + '.pt-nl-msg{min-height:16px;font-size:.85rem;margin-top:8px}.pt-nl-msg.err{color:#ff9caa}.pt-nl-msg.ok{color:#34d17a}'
      + '.pt-nl-done{padding:16px 4px}.pt-nl-done .big{font-size:2.4rem}.pt-nl-done h3{margin:8px 0 4px;font-size:1.3rem}'
      + '@media(max-width:480px){.pt-nl-card{padding:26px 20px}.pt-nl-h{font-size:1.3rem}}';
    var st = document.createElement("style");
    st.id = "pt-nl-styles"; st.textContent = css;
    document.head.appendChild(st);
  }

  function markSeen() { try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch (e) {} }

  function build() {
    injectStyles();
    var overlay = document.createElement("div");
    overlay.className = "pt-nl-overlay";
    overlay.innerHTML =
      '<div class="pt-nl-card" role="dialog" aria-modal="true" aria-label="Subscribe to the PeroTech newsletter">'
      + '<button class="pt-nl-x" aria-label="Close">&times;</button>'
      + '<img class="pt-nl-av" src="' + PHOTO + '" alt="PeroTech" onerror="this.style.display=\'none\'"/>'
      + '<div class="pt-nl-name">PeroTech ' + VERIFIED + '</div>'
      + '<div class="pt-nl-role">Motion &amp; Ads · AI Automation · SaaS Builder</div>'
      + '<h2 class="pt-nl-h">Get an unfair advantage — free.</h2>'
      + '<p class="pt-nl-sub">Join the insiders. One useful email, no spam.</p>'
      + '<ul class="pt-nl-list">'
      + '<li><span class="tick">✓</span><span>Free <b>AI automation tools</b> to knock out real tasks</span></li>'
      + '<li><span class="tick">✓</span><span>Be the <b>first to know</b> when we launch new web-app projects</span></li>'
      + '<li><span class="tick">✓</span><span>Free <b>business tips &amp; tools</b> to grow your company</span></li>'
      + '</ul>'
      + '<form class="pt-nl-form">'
      + '<input class="pt-nl-name-i" type="text" placeholder="Your name (optional)" autocomplete="name"/>'
      + '<input class="pt-nl-email" type="email" placeholder="you@email.com" autocomplete="email" required/>'
      + '<button type="submit" class="pt-nl-btn">Get free access →</button>'
      + '</form>'
      + '<div class="pt-nl-msg" aria-live="polite"></div>'
      + '<div class="pt-nl-fine">No spam. Unsubscribe anytime.</div>'
      + '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("show"); });

    var card = overlay.querySelector(".pt-nl-card");
    var msg = overlay.querySelector(".pt-nl-msg");
    var form = overlay.querySelector(".pt-nl-form");
    var emailI = overlay.querySelector(".pt-nl-email");
    var nameI = overlay.querySelector(".pt-nl-name-i");

    function close() {
      markSeen();
      overlay.classList.remove("show");
      setTimeout(function () { overlay.remove(); }, 300);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    overlay.querySelector(".pt-nl-x").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", onKey);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = emailI.value.trim(), name = nameI.value.trim();
      if (!EMAIL_RE.test(email)) { msg.className = "pt-nl-msg err"; msg.textContent = "Please enter a valid email."; return; }
      var btn = form.querySelector(".pt-nl-btn");
      btn.disabled = true; btn.textContent = "Signing you up…";
      msg.className = "pt-nl-msg";
      fetch("/api/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email }),
      }).then(function (r) { return r.json(); }).then(function (d) {
        markSeen();
        card.innerHTML = '<button class="pt-nl-x" aria-label="Close">&times;</button>'
          + '<div class="pt-nl-done"><div class="big">🎉</div><h3>You\'re in!</h3>'
          + '<p class="pt-nl-sub">' + ((d && d.message) ? String(d.message).replace(/</g, "&lt;") : "Welcome aboard — check your inbox.") + '</p></div>';
        card.querySelector(".pt-nl-x").addEventListener("click", close);
        setTimeout(close, 2600);
      }).catch(function () {
        btn.disabled = false; btn.textContent = "Get free access →";
        msg.className = "pt-nl-msg err"; msg.textContent = "Something went wrong. Please try again.";
      });
    });
  }

  setTimeout(function () {
    // Don't pop over the chat lead form or if they already dismissed in another tab.
    try { if (localStorage.getItem(SEEN_KEY)) return; } catch (e) {}
    build();
  }, DELAY_MS);
})();
