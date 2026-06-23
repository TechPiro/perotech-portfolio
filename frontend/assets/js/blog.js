// PeroTech Blog — renders the post listing with Hot / Trending sections (live from /api/posts)
(function () {
  const grid = document.getElementById("blog-grid");
  if (!grid) return;

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const BADGES = {
    hot: '<span class="blog-card-badge hot">🔥 Hot</span>',
    trending: '<span class="blog-card-badge trending">📈 Trending</span>',
  };

  let SETTINGS = {};
  const DEFAULT_AVATAR = "assets/img/images/profile-large.webp";
  const authorAvatar = (p) => p.authorAvatar || SETTINGS.photo || DEFAULT_AVATAR;
  const authorName = (p) => p.author || SETTINGS.name || "PeroTech";

  function card(p) {
    return `
      <a class="blog-card" href="/blog/${encodeURIComponent(p.slug || p.id)}">
        <div class="blog-card-thumb">
          ${p.category ? `<span class="blog-card-cat">${p.category}</span>` : ""}
          ${BADGES[p.badge] || ""}
          <img src="${p.cover}" alt="${p.title}" loading="lazy" />
        </div>
        <div class="blog-card-body">
          <div class="blog-card-meta">${fmtDate(p.date)}${p.readTime ? " · " + p.readTime : ""}</div>
          <h3 class="blog-card-title">${p.title}</h3>
          <p class="blog-card-excerpt">${p.excerpt || ""}</p>
          <div class="blog-card-author">
            <img class="bca-av" src="/${authorAvatar(p)}" alt="${authorName(p)}" loading="lazy" onerror="this.style.display='none'" />
            <span class="bca-name">${authorName(p)}</span>
            <span class="blog-card-more">Read article →</span>
          </div>
        </div>
      </a>`;
  }

  function section(icon, title, sub, posts) {
    if (!posts.length) return "";
    return `
      <div class="blog-section">
        <div class="blog-section-head">
          <h2 class="blog-section-title">${icon} ${title}</h2>
          <span class="blog-section-sub">${sub}</span>
        </div>
        <div class="blog-grid">${posts.map(card).join("")}</div>
      </div>`;
  }

  function render(posts) {
    if (!posts || !posts.length) { grid.innerHTML = '<p class="muted">No posts yet.</p>'; return; }
    const hot = posts.filter((p) => p.badge === "hot");
    const trending = posts.filter((p) => p.badge === "trending");
    grid.classList.remove("blog-grid"); // turn the container into a sections wrapper
    grid.innerHTML =
      section("🔥", "Hot", "Most-read right now", hot) +
      section("📈", "Trending", "Picking up steam", trending) +
      section("🆕", "Latest articles", posts.length + " posts", posts);
  }

  fetch("/api/settings").then((r) => r.json()).then((s) => { SETTINGS = s || {}; }).catch(() => {})
    .finally(() => {
      fetch("/api/posts")
        .then((r) => r.json())
        .then(render)
        .catch(() => render(window.BLOG_POSTS || []));
    });
})();
