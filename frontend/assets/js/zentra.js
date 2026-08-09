// Zentra — white-label trading platform landing page.
// Content is loaded from /api/zentra (admin-editable). If the API is empty or
// unreachable, the page renders from the DEFAULTS below so it's never blank.
(function () {
  const root = document.getElementById("zentra-root");
  if (!root) return;
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const attr = (s) => { s = String(s || ""); return /^https?:\/\//i.test(s) ? s : "/" + s.replace(/^\//, ""); };

  // ---- Editable seed defaults (DB record overrides these at runtime) ----
  const DEFAULTS = {
    meta: { title: "Zentra — White-Label Trading Platform", description: "Launch your own Stock, Forex & Crypto trading platform.", ogImage: "assets/img/zentra/desktop.png", linkedinUrl: "#", footerText: "Zentra" },
    offer: { priceOriginal: "$497", priceNow: "$197", discountBadge: "Limited-time launch discount", scarcity: "first 20 buyers", showScarcity: true, checkoutUrl: "#", customBuildUrl: "#" },
    hero: { eyebrow: "White-Label Trading Platform", headline: "Launch Your Own Trading Platform — Without Building It From Scratch.", subhead: "A complete, production-grade Stock, Forex & Crypto trading platform you can brand, deploy, and make your own. Full user app. Powerful admin console. Live market data. One clean codebase.", trustLine: "Deploys on any host · Web + Mobile · Full source code included · Instant delivery", ctaPrimary: "Get Full Access — $197", ctaSecondary: "Watch Demo" },
    video: { url: "#", poster: "assets/img/zentra/desktop.png" },
    whatis: { text: "Zentra is a white-label trading platform — a complete, ready-to-brand web application for Stock, Forex, and Crypto markets, built on a modern TypeScript + React + Node stack. It runs as a single responsive application that renders as a full desktop dashboard on large screens and a native-feeling mobile app on phones — from one codebase, no separate builds.", cards: [{ icon: "smartphone", title: "Web + Mobile from one codebase" }, { icon: "database", title: "Zero external database" }, { icon: "server", title: "Deploy anywhere" }, { icon: "palette", title: "Fully white-label" }] },
    carousel: [{ image: "assets/img/zentra/iphone-light.png", caption: "Home dashboard — balance, signals, and market movers at a glance." }, { image: "assets/img/zentra/crypto-market.png", caption: "Live crypto market — real prices, icons, and trends." }, { image: "assets/img/zentra/stock-detail.png", caption: "Full stock detail — candlestick charts, key stats, buy/sell." }],
    featuresUser: [{ icon: "bar-chart", title: "Unified market dashboard", desc: "Live Stock, Forex & Crypto prices with real logos, icons, and flags." }],
    featuresAdmin: [{ icon: "bar-chart", title: "Business analytics dashboard", desc: "Live KPIs, revenue, signups, conversion, top assets, charts." }],
    whatYouGet: ["Full, unencrypted source code (frontend + backend)", "Admin access — the complete admin console"],
    whyCards: [{ icon: "shield", title: "Production-grade engineering", desc: "A real, robust foundation — not a flimsy template." }],
    reviewsMeta: { rating: "4.8", count: "217" },
    reviews: [{ name: "Marcus Devlin", role: "Founder, Helio Markets", avatar: "assets/img/zentra/reviews/r1.jpg", rating: 5, date: "2 weeks ago", text: "Rebranded it over a weekend and had a working platform live by Monday. The admin console is genuinely powerful." }],
    disclaimer: "Zentra is sold as a software prototype and starter codebase. By purchasing, you agree that you are solely responsible for how you deploy, configure, and use this software, and for legal and regulatory compliance in your jurisdiction. The seller is not liable for how the software is used. Sold as-is.",
    faq: [{ q: "Do I get the full source code?", a: "Yes — the complete, unencrypted frontend and backend. Yours to modify and rebrand." }],
  };

  // ---- Icon set (lucide-style) ----
  const P = {
    smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    server: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.3"/><circle cx="17.5" cy="10.5" r="1.3"/><circle cx="8.5" cy="7.5" r="1.3"/><circle cx="6.5" cy="12.5" r="1.3"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.9-4.5-9-10-9Z"/>',
    "bar-chart": '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    "trending-up": '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    "chart-candle": '<path d="M9 4v3"/><path d="M9 15v4"/><rect x="7" y="7" width="4" height="8" rx="1"/><path d="M17 3v3"/><path d="M17 16v5"/><rect x="15" y="6" width="4" height="10" rx="1"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    "credit-card": '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.5 12.5 21 2m-4 0 4 4-3 3-3-3"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.check}</svg>`;
  const playIcon = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const chevD = '<svg class="chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  const arrowR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  const chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  const chevRt = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  function withDefaults(z) {
    z = z && typeof z === "object" ? z : {};
    const out = {};
    for (const k of Object.keys(DEFAULTS)) {
      const v = z[k];
      if (v == null) out[k] = DEFAULTS[k];
      else if (Array.isArray(DEFAULTS[k])) out[k] = Array.isArray(v) && v.length ? v : DEFAULTS[k];
      else if (typeof DEFAULTS[k] === "object") out[k] = Object.assign({}, DEFAULTS[k], v);
      else out[k] = v;
    }
    return out;
  }

  function featCard(f) {
    return `<div class="zx-feat reveal"><div class="zx-ic">${icon(f.icon)}</div><h3>${esc(f.title)}</h3>${f.desc ? `<p>${esc(f.desc)}</p>` : ""}</div>`;
  }

  // Trustpilot-style green rating squares (supports halves, e.g. 4.5)
  const tpStar = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z"/></svg>';
  function tpStars(n) {
    n = Number(n) || 0;
    let out = "";
    for (let i = 1; i <= 5; i++) {
      const cls = n >= i ? "" : (n >= i - 0.5 ? " half" : " off");
      out += `<span class="zx-tpsq${cls}">${tpStar}</span>`;
    }
    return `<span class="zx-tpstars">${out}</span>`;
  }
  const tpLogo = '<span class="zx-tp-logo"><svg class="tp-star" viewBox="0 0 24 24"><polygon points="12,2 14.9,8.26 22,9.27 17,14.14 18.18,21 12,17.27 5.82,21 7,14.14 2,9.27 9.1,8.26"/></svg>Trustpilot</span>';
  function reviewCard(r) {
    const av = r.avatar ? `<img class="zx-rev-av" src="${esc(attr(r.avatar))}" alt="${esc(r.name)}" loading="lazy"/>` : `<div class="zx-rev-av"></div>`;
    return `<div class="zx-rev reveal">
      <div class="zx-rev-top">${av}<div class="zx-rev-id"><div class="zx-rev-name">${esc(r.name)} <span class="vfy" title="Verified">${icon("check")}</span></div><div class="zx-rev-role">${esc(r.role || "")}</div></div></div>
      ${tpStars(r.rating)}
      <div class="zx-rev-text">${esc(r.text)}</div>
      <div class="zx-rev-foot"><span class="zx-rev-verified">✓ Verified purchase</span><span>${esc(r.date || "")}</span></div>
    </div>`;
  }

  function render(Z) {
    const o = Z.offer, h = Z.hero, v = Z.video;
    const slides = Z.carousel || [];
    document.title = (Z.meta && Z.meta.title) || document.title;

    root.innerHTML = `
    <!-- NAV -->
    <nav class="zx-nav">
      <div class="zx-wrap zx-nav-inner">
        <a class="zx-brand" href="/zentra"><span class="dot">Z</span>Zentra</a>
        <div class="zx-nav-links">
          <a href="#features">Features</a>
          <a href="#preview">Preview</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a class="zx-btn primary" href="#pricing">Get Access — ${esc(o.priceNow)}</a>
        </div>
      </div>
    </nav>

    <!-- HERO -->
    <header class="zx-hero">
      <div class="zx-wrap zx-hero-inner">
        <span class="zx-eyebrow reveal">${esc(h.eyebrow)}</span>
        <h1 class="zx-h1 reveal">${esc(h.headline)}</h1>
        <p class="zx-hero-sub reveal">${esc(h.subhead)}</p>
        <div class="zx-hero-cta reveal">
          <a class="zx-btn primary" href="${esc(attr(o.checkoutUrl))}" id="zx-cta-hero">${esc(h.ctaPrimary)} <span class="zx-strike">${esc(o.priceOriginal)}</span></a>
          <button class="zx-btn ghost" id="zx-watch">▸ ${esc(h.ctaSecondary)}</button>
        </div>
        <p class="zx-trust reveal">${esc(h.trustLine)}</p>
      </div>
      <div class="zx-wrap zx-hero-visual reveal">
        <img class="zx-hero-shot" src="${esc(attr("assets/img/zentra/hero-devices.png"))}" alt="Zentra on desktop, iPhone and Samsung" />
      </div>
    </header>

    <!-- VIDEO -->
    <section class="zx-section" id="preview">
      <div class="zx-wrap zx-center">
        <span class="zx-eyebrow reveal">Demo</span>
        <h2 class="zx-h2 reveal">See Zentra in Action</h2>
        <div class="zx-video-wrap reveal">
          <div class="zx-video" id="zx-video-poster">
            <img src="${esc(attr(v.poster || "assets/img/zentra/desktop.png"))}" alt="Zentra demo" />
            <span class="zx-play">${playIcon}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- WHAT IS (light) -->
    <section class="zx-section zx-light">
      <div class="zx-wrap zx-center">
        <span class="zx-eyebrow reveal">What is Zentra?</span>
        <h2 class="zx-h2 reveal">One platform. Every market. Your brand.</h2>
        <p class="zx-lead reveal">${esc(Z.whatis.text)}</p>
        <div class="zx-stat-grid">
          ${(Z.whatis.cards || []).map((c) => `<div class="zx-stat reveal"><div class="zx-ic">${icon(c.icon)}</div><h3>${esc(c.title)}</h3></div>`).join("")}
        </div>
      </div>
    </section>

    <!-- CAROUSEL -->
    <section class="zx-section">
      <div class="zx-wrap zx-center">
        <span class="zx-eyebrow reveal">Interface</span>
        <h2 class="zx-h2 reveal">A Look Inside Zentra</h2>
      </div>
      <div class="zx-wrap">
        <div class="zx-carousel reveal">
          <div class="zx-slides">
            <div class="zx-track" id="zx-track">
              ${slides.map((s) => `<div class="zx-slide"><div class="zx-slide-card"><div class="zx-slide-media"><img src="${esc(attr(s.image))}" alt="${esc(s.caption)}" loading="lazy"/></div><div class="zx-slide-cap">${esc(s.caption)}</div></div></div>`).join("")}
            </div>
          </div>
          <button class="zx-c-btn prev" id="zx-prev" aria-label="Previous">${chevL}</button>
          <button class="zx-c-btn next" id="zx-next" aria-label="Next">${chevRt}</button>
          <div class="zx-dots" id="zx-dots">${slides.map((_, i) => `<button class="zx-dot${i === 0 ? " active" : ""}" data-i="${i}" aria-label="Slide ${i + 1}"></button>`).join("")}</div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="zx-section zx-light" id="features">
      <div class="zx-wrap">
        <div class="zx-feat-head">
          <div><span class="zx-eyebrow reveal">User Interface</span><h2 class="zx-h2 reveal" style="margin-bottom:0">Everything a trader needs</h2></div>
        </div>
        <div class="zx-feat-grid">${(Z.featuresUser || []).map(featCard).join("")}</div>
      </div>
    </section>
    <section class="zx-section">
      <div class="zx-wrap">
        <div class="zx-feat-head">
          <div><span class="zx-eyebrow reveal">Admin Console</span><h2 class="zx-h2 reveal" style="margin-bottom:0">Run the whole platform</h2></div>
        </div>
        <div class="zx-feat-grid">${(Z.featuresAdmin || []).map(featCard).join("")}</div>
      </div>
    </section>

    <!-- WHAT YOU GET -->
    <section class="zx-section">
      <div class="zx-wrap zx-center">
        <span class="zx-eyebrow reveal">Full Access</span>
        <h2 class="zx-h2 reveal">What You Get</h2>
      </div>
      <div class="zx-wrap">
        <div class="zx-get-card reveal">
          <ul class="zx-get-list">
            ${(Z.whatYouGet || []).map((g) => `<li><span class="tick">${icon("check")}</span><span>${esc(g)}</span></li>`).join("")}
          </ul>
        </div>
      </div>
    </section>

    <!-- WHY (light) -->
    <section class="zx-section zx-light">
      <div class="zx-wrap zx-center">
        <span class="zx-eyebrow reveal">Why Zentra?</span>
        <h2 class="zx-h2 reveal">Built to launch, not to demo</h2>
      </div>
      <div class="zx-wrap"><div class="zx-feat-grid">${(Z.whyCards || []).map(featCard).join("")}</div></div>
    </section>

    <!-- REVIEWS -->
    <section class="zx-section">
      <div class="zx-wrap zx-center">
        <span class="zx-eyebrow reveal">Reviews</span>
        <h2 class="zx-h2 reveal">Trusted by builders worldwide</h2>
        <div class="zx-tp-head reveal">
          ${tpLogo}
          ${tpStars((Z.reviewsMeta || {}).rating)}
          <div class="zx-tp-score"><b>Excellent</b> · TrustScore <b>${esc((Z.reviewsMeta || {}).rating || "")}</b> · ${esc((Z.reviewsMeta || {}).count || "")} reviews</div>
        </div>
      </div>
      <div class="zx-wrap"><div class="zx-rev-grid">${(Z.reviews || []).map(reviewCard).join("")}</div></div>
    </section>

    <!-- PRICING -->
    <section class="zx-section" id="pricing">
      <div class="zx-wrap zx-center">
        <span class="zx-eyebrow reveal">Pricing</span>
        <h2 class="zx-h2 reveal">Get the full platform today</h2>
        <div class="zx-price-card reveal">
          ${o.discountBadge ? `<span class="zx-price-badge">${esc(o.discountBadge)}</span>` : ""}
          <div class="zx-price-amount">
            <span class="zx-price-now">${esc(o.priceNow)}</span>
            ${o.priceOriginal ? `<span class="zx-price-old">${esc(o.priceOriginal)}</span>` : ""}
          </div>
          ${o.showScarcity && o.scarcity ? `<div class="zx-price-scarcity">🔥 Launch price for the ${esc(o.scarcity)}</div>` : ""}
          <a class="zx-btn primary" href="${esc(attr(o.checkoutUrl))}" id="zx-cta-price">${esc(h.ctaPrimary)}</a>
          <div class="zx-price-reassure">Instant delivery after payment · Full source code + admin access · Deployment guide included</div>
          <a class="zx-custom-link" href="${esc(attr(o.customBuildUrl))}">Want something more advanced? Request a Custom Build →</a>
        </div>
      </div>
    </section>

    <!-- DISCLAIMER -->
    <section class="zx-section" style="padding-top:0">
      <div class="zx-wrap">
        <div class="zx-disclaimer reveal"><b>Please note:</b> ${esc(Z.disclaimer)}</div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="zx-section zx-light" id="faq">
      <div class="zx-wrap zx-center">
        <span class="zx-eyebrow reveal">FAQ</span>
        <h2 class="zx-h2 reveal">Questions, answered</h2>
      </div>
      <div class="zx-wrap">
        <div class="zx-faq">
          ${(Z.faq || []).map((f) => `<div class="zx-faq-item reveal"><button class="zx-faq-q">${esc(f.q)}${chevD}</button><div class="zx-faq-a"><div class="zx-faq-a-inner">${esc(f.a)}</div></div></div>`).join("")}
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="zx-section zx-final">
      <div class="zx-wrap zx-final-inner zx-center">
        <h2 class="zx-h2 reveal" style="max-width:16ch;margin-left:auto;margin-right:auto">${esc(h.headline)}</h2>
        <div class="zx-hero-cta reveal" style="margin-top:26px"><a class="zx-btn primary" href="${esc(attr(o.checkoutUrl))}">${esc(h.ctaPrimary)}</a></div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="zx-footer">
      <div class="zx-wrap zx-footer-inner">
        <span>© ${new Date().getFullYear()} ${esc((Z.meta && Z.meta.footerText) || "Zentra")}. All rights reserved.</span>
        <div class="zx-footer-links">
          <a href="#pricing">Get Access</a>
          <a href="${esc(attr((Z.meta && Z.meta.linkedinUrl) || "#"))}" target="_blank" rel="noopener">LinkedIn</a>
        </div>
      </div>
    </footer>`;

    wire(Z);
  }

  function wire(Z) {
    // smooth-scroll for in-page anchors
    root.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const t = document.querySelector(a.getAttribute("href"));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }));

    // scroll reveal
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    } else {
      root.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    }

    // FAQ accordion
    root.querySelectorAll(".zx-faq-q").forEach((q) => q.addEventListener("click", () => {
      const item = q.closest(".zx-faq-item");
      const open = item.classList.contains("open");
      root.querySelectorAll(".zx-faq-item").forEach((i) => i.classList.remove("open"));
      if (!open) item.classList.add("open");
    }));

    // carousel
    const track = document.getElementById("zx-track");
    if (track) {
      const slides = (Z.carousel || []).length;
      let idx = 0, timer = null;
      const dots = [...document.querySelectorAll(".zx-dot")];
      const go = (i) => {
        idx = (i + slides) % slides;
        track.style.transform = `translateX(-${idx * 100}%)`;
        dots.forEach((d, di) => d.classList.toggle("active", di === idx));
      };
      const next = () => go(idx + 1), prev = () => go(idx - 1);
      const nb = document.getElementById("zx-next"), pb = document.getElementById("zx-prev");
      if (nb) nb.addEventListener("click", next);
      if (pb) pb.addEventListener("click", prev);
      dots.forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.i))));
      // autoplay + pause on hover
      const start = () => { if (slides > 1) timer = setInterval(next, 5500); };
      const stop = () => { if (timer) clearInterval(timer); timer = null; };
      const car = track.closest(".zx-carousel");
      car.addEventListener("mouseenter", stop);
      car.addEventListener("mouseleave", start);
      // touch swipe
      let x0 = null;
      track.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
      track.addEventListener("touchend", (e) => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        x0 = null; start();
      });
      start();
    }

    // video modal
    const poster = document.getElementById("zx-video-poster");
    const watch = document.getElementById("zx-watch");
    const modal = document.getElementById("zx-video-modal");
    const frame = document.getElementById("zx-video-frame");
    const close = document.getElementById("zx-video-close");
    const url = (Z.video && Z.video.url) || "";
    const embed = (u) => {
      const yt = String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/);
      if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`;
      const vm = String(u).match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&title=0&byline=0`;
      return /^https?:\/\//i.test(u) ? u : "";
    };
    const openModal = () => {
      const src = embed(url);
      frame.innerHTML = src
        ? (/\.(mp4|webm)$/i.test(src) ? `<video src="${esc(src)}" controls autoplay playsinline></video>` : `<iframe src="${esc(src)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`)
        : `<div class="zx-modal-empty">Demo video coming soon.</div>`;
      modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("zx-lock");
    };
    const closeModal = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); frame.innerHTML = ""; document.body.classList.remove("zx-lock"); };
    if (poster) poster.addEventListener("click", openModal);
    if (watch) watch.addEventListener("click", openModal);
    if (close) close.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  fetch("/api/zentra")
    .then((r) => (r.ok ? r.json() : null))
    .then((z) => render(withDefaults(z)))
    .catch(() => render(withDefaults(null)));
})();
