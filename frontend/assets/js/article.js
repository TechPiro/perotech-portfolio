// PeroTech Blog — renders a single article (live from /api/posts) based on ?slug=
(function () {
  const root = document.getElementById("article-root");
  if (!root) return;

  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const BADGES = {
    hot: '<span class="blog-card-badge hot">🔥 Hot</span>',
    trending: '<span class="blog-card-badge trending">📈 Trending</span>',
  };

  // Vertical social-share rail (sticky beside the article)
  const ICONS = {
    twitter: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07Z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M.05 24l1.69-6.16a11.87 11.87 0 0 1-1.59-5.95C.15 5.31 5.5 0 12.06 0a11.8 11.8 0 0 1 8.41 3.49 11.74 11.74 0 0 1 3.48 8.4c0 6.55-5.35 11.88-11.94 11.88a12 12 0 0 1-5.71-1.45L.05 24Zm6.62-3.8c1.67.99 3.27 1.58 5.39 1.58 5.45 0 9.89-4.42 9.89-9.88 0-5.46-4.44-9.88-9.89-9.88-5.46 0-9.9 4.42-9.9 9.88 0 2.18.65 3.81 1.74 5.52l-1 3.65 3.77-.87Zm11.39-5.5c-.07-.12-.27-.2-.57-.35-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  };
  function shareRail(title) {
    const url = encodeURIComponent(location.href);
    const text = encodeURIComponent(title);
    const links = [
      { k: "twitter", label: "Share on X", href: `https://twitter.com/intent/tweet?url=${url}&text=${text}` },
      { k: "linkedin", label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
      { k: "facebook", label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
      { k: "whatsapp", label: "Share on WhatsApp", href: `https://wa.me/?text=${text}%20${url}` },
    ];
    return `<aside class="share-rail" aria-label="Share this article">
      <span class="share-rail-label">Share</span>
      ${links.map((l) => `<a class="share-btn ${l.k}" href="${l.href}" target="_blank" rel="noopener" title="${l.label}" aria-label="${l.label}">${ICONS[l.k]}</a>`).join("")}
      <button class="share-btn link" id="share-copy" type="button" title="Copy link" aria-label="Copy link">${ICONS.link}</button>
    </aside>`;
  }

  const fileIcon =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg>';

  function videoBlock(b) {
    let inner;
    if (b.kind === "youtube") inner = `<iframe src="https://www.youtube.com/embed/${b.src}?rel=0" allow="encrypted-media; fullscreen" allowfullscreen></iframe>`;
    else if (b.kind === "vimeo") inner = `<iframe src="https://player.vimeo.com/video/${b.src}" allow="fullscreen" allowfullscreen></iframe>`;
    else inner = `<video src="${b.src}" controls preload="metadata" playsinline></video>`;
    return `<figure class="bvideo"><div class="bvideo-frame">${inner}</div>${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
  }
  function codeBlock(b) {
    const lang = b.language || "plaintext";
    return `<div class="bcode"><div class="bcode-head"><span>${esc(lang)}</span><button class="bcode-copy" type="button">Copy</button></div><pre><code class="language-${esc(lang)}">${esc(b.code)}</code></pre></div>`;
  }
  function fileBlock(b) {
    return `<a class="bfile" href="${b.src}" download><span class="bfile-icon">${fileIcon}</span><span class="bfile-info"><span class="bfile-name">${esc(b.name)}</span><span class="bfile-sub">${b.size ? esc(b.size) + " · " : ""}Click to download</span></span><span class="bfile-dl">Download</span></a>`;
  }
  function renderBlock(b) {
    switch (b.type) {
      case "paragraph": return `<p class="bp">${b.text}</p>`;
      case "heading": return `<h2 class="bh">${b.text}</h2>`;
      case "subheading": return `<h3 class="bsh">${b.text}</h3>`;
      case "list": return `<ul class="bl">${(b.items || []).map((i) => `<li>${i}</li>`).join("")}</ul>`;
      case "quote": return `<blockquote class="bq">${b.text}</blockquote>`;
      case "image": return `<figure class="bfig"><img src="${b.src}" alt="${esc(b.caption || "")}" loading="lazy" />${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`;
      case "video": return videoBlock(b);
      case "code": return codeBlock(b);
      case "file": return fileBlock(b);
      default: return "";
    }
  }

  function run(posts) {
    const slug = new URLSearchParams(location.search).get("slug");
    const post = posts.find((p) => (p.slug || p.id) === slug) || posts[0];
    if (!post) {
      root.innerHTML = '<div class="article-wrap"><a class="article-back" href="blog.html">← Back to Blog</a><h1 class="article-title">Post not found</h1></div>';
      return;
    }
    document.title = "PeroTech — " + post.title;

    const bodyHtml = (post.blocks || []).map(renderBlock).join("");
    const more = posts.filter((p) => (p.slug || p.id) !== (post.slug || post.id)).slice(0, 2);
    const moreHtml = more.length
      ? `<div class="article-more"><h3>More articles</h3><div class="blog-grid">${more.map((p) => `<a class="blog-card" href="article.html?slug=${encodeURIComponent(p.slug || p.id)}"><div class="blog-card-thumb">${p.category ? `<span class="blog-card-cat">${p.category}</span>` : ""}${BADGES[p.badge] || ""}<img src="${p.cover}" alt="${esc(p.title)}" loading="lazy" /></div><div class="blog-card-body"><div class="blog-card-meta">${fmtDate(p.date)}</div><h3 class="blog-card-title">${esc(p.title)}</h3><span class="blog-card-more">Read article →</span></div></a>`).join("")}</div></div>`
      : "";

    root.innerHTML = `
      <div class="article-layout">
        ${shareRail(post.title)}
        <article class="article-wrap">
          <a class="article-back" href="blog.html">← Back to Blog</a>
          <div class="article-tags">
            ${post.category ? `<span class="article-cat">${esc(post.category)}</span>` : ""}
            ${post.badge === "hot" ? '<span class="article-badge hot">🔥 Hot</span>' : ""}
            ${post.badge === "trending" ? '<span class="article-badge trending">📈 Trending</span>' : ""}
          </div>
          <h1 class="article-title">${esc(post.title)}</h1>
          <div class="article-meta"><span>By ${esc(post.author || "PeroTech")}</span><span class="dot"></span><span>${fmtDate(post.date)}</span>${post.readTime ? `<span class="dot"></span><span>${esc(post.readTime)}</span>` : ""}</div>
          ${post.cover ? `<img class="article-cover" src="${post.cover}" alt="${esc(post.title)}" />` : ""}
          <div class="article-body">${bodyHtml}</div>
        </article>
      </div>${moreHtml}`;

    const copyBtn = document.getElementById("share-copy");
    if (copyBtn) copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(location.href).then(() => {
        copyBtn.classList.add("copied");
        setTimeout(() => copyBtn.classList.remove("copied"), 1600);
      }).catch(() => {});
    });

    if (window.hljs) document.querySelectorAll("pre code").forEach((el) => { try { window.hljs.highlightElement(el); } catch (e) {} });
    document.querySelectorAll(".bcode-copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.closest(".bcode").querySelector("code").innerText;
        navigator.clipboard.writeText(code).then(() => { btn.textContent = "Copied!"; btn.classList.add("copied"); setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1800); });
      });
    });
  }

  fetch("/api/posts")
    .then((r) => r.json())
    .then((posts) => run(posts && posts.length ? posts : window.BLOG_POSTS || []))
    .catch(() => run(window.BLOG_POSTS || []));
})();
