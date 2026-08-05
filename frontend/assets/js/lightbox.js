// PeroTech — click-to-zoom lightbox for content images (blog posts + courses).
// Delegated, so it works for images injected dynamically after page load.
(function () {
  const SEL = ".article-body img, .lesson-content img, img.article-cover, [data-zoom]";
  let overlay = null;

  function build() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "pt-lightbox";
    overlay.innerHTML = '<button class="ptl-close" type="button" aria-label="Close">×</button><img class="ptl-img" alt=""/>';
    overlay.addEventListener("click", (e) => {
      // close when clicking the backdrop or the × (but not the image itself)
      if (e.target === overlay || e.target.classList.contains("ptl-close")) close();
    });
    document.body.appendChild(overlay);
    return overlay;
  }
  function open(src, alt) {
    const o = build();
    const img = o.querySelector(".ptl-img");
    img.src = src; img.alt = alt || "";
    o.classList.add("open");
    document.body.classList.add("ptl-lock");
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("ptl-lock");
  }

  document.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    // a video-facade poster is a play button, not a zoomable image
    if (img.classList.contains("vf-poster") || img.closest(".video-facade")) return;
    if (!img.matches(SEL)) return;
    const src = img.currentSrc || img.src;
    if (!src) return;
    e.preventDefault();
    open(src, img.alt);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();
