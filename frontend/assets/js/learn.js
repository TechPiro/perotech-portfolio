// PeroTech Learn — Udemy-style course catalog (keeps the site's dark theme)
(function () {
  const wrap = document.getElementById("course-sections");
  if (!wrap) return;
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const money = (n) => "$" + Number(n || 0).toLocaleString();
  PT.renderAuthBar(document.getElementById("learn-authbar"));
  PT.renderBottomNav("browse");

  const BADGE_LABEL = { hot: "Hot", bestseller: "Bestseller", popular: "Popular", new: "New" };

  function ratingRow(c) {
    if (c.rating == null) return "";
    const r = Math.max(0, Math.min(5, Number(c.rating)));
    const count = c.students != null ? ` <span class="rc">(${Number(c.students).toLocaleString()})</span>` : "";
    return `<div class="course-rating"><b>${r.toFixed(1)}</b><span class="stars" style="--r:${r}">★★★★★</span>${count}</div>`;
  }

  function priceLabel(c) {
    if (c.allAccessOnly) return '<span class="course-price">All-access</span>';
    return c.price > 0 ? `<span class="course-price">${money(c.price)}</span>` : '<span class="course-price free">Free</span>';
  }

  function card(c) {
    const badge = c.badge ? `<span class="course-badge ${esc(c.badge)}">${BADGE_LABEL[c.badge] || c.badge}</span>` : "";
    const cover = c.cover ? "/" + esc(c.cover) : "";
    return `<a class="course-card" href="/learn/${encodeURIComponent(c.slug || c.id)}">
      <div class="course-thumb"${cover ? ` style="background-image:url('${cover}')"` : ""}>${badge}<img src="${cover}" alt="${esc(c.title)}" loading="lazy" onerror="this.style.display='none'"/></div>
      <div class="course-body">
        <div class="course-title">${esc(c.title)}</div>
        ${c.author ? `<div class="course-author">${esc(c.author)}</div>` : ""}
        ${ratingRow(c)}
        <div class="course-tagline">${[c.level, (c.lessonCount || 0) + " lessons"].filter(Boolean).map(esc).join(" · ")}</div>
        <div class="course-price-row">${priceLabel(c)}</div>
      </div>
    </a>`;
  }

  const grid = (list) => `<div class="course-grid">${list.map(card).join("")}</div>`;

  function render(courses) {
    if (!courses || !courses.length) { wrap.innerHTML = '<div class="learn-empty">No courses published yet — check back soon!</div>'; return; }

    const trending = courses.filter((c) => ["hot", "bestseller", "popular"].includes(c.badge));
    const cats = [...new Set(courses.map((c) => c.category).filter(Boolean))];

    const pills = cats.length
      ? `<div class="cat-bar"><button class="cat-pill active" data-cat="">All</button>${cats.map((c) => `<button class="cat-pill" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>`
      : "";

    wrap.innerHTML =
      (trending.length ? `<section class="course-section"><div class="cs-head"><h2>🔥 Trending now</h2></div>${grid(trending)}</section>` : "") +
      `<section class="course-section" id="all-courses">
        <div class="cs-head"><h2>All courses</h2><span class="cs-sub">${courses.length} course${courses.length === 1 ? "" : "s"}</span></div>
        ${pills}
        <div id="all-grid">${grid(courses).replace('<div class="course-grid">', '<div class="course-grid" id="cg">')}</div>
      </section>`;

    // category filtering
    wrap.querySelectorAll(".cat-pill").forEach((p) => p.addEventListener("click", () => {
      wrap.querySelectorAll(".cat-pill").forEach((x) => x.classList.toggle("active", x === p));
      const cat = p.dataset.cat;
      const filtered = cat ? courses.filter((c) => c.category === cat) : courses;
      document.getElementById("all-grid").innerHTML = grid(filtered);
    }));
  }

  fetch("/api/courses")
    .then((r) => r.json())
    .then(render)
    .catch(() => { wrap.innerHTML = '<div class="learn-empty">Could not load courses.</div>'; });
})();
