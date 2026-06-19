/* ===========================================================================
   PeroTech — Motion Graphics & Ads gallery
   ---------------------------------------------------------------------------
   HOW TO ADD YOUR OWN PROJECTS:
   Edit the MG_PROJECTS array below. Each project supports 3 video sources:

     type: "mp4"     -> src: "assets/motion/videos/yourfile.mp4"   (local file)
     type: "youtube" -> src: "YOUTUBE_VIDEO_ID"   (the part after watch?v=)
     type: "vimeo"   -> src: "VIMEO_VIDEO_ID"     (the numeric id)

   thumb: a poster image (assets/motion/thumbs/...). For YouTube you can leave
   thumb empty and it will auto-use the YouTube thumbnail.
   category: used for the filter pills (any text; matching ones group together).
   =========================================================================== */

const MG_PROJECTS = [
  {
    title: "TechFlow Launch",
    client: "TechFlow Inc.",
    category: "Ads",
    type: "mp4",
    src: "assets/motion/videos/techflow.mp4",
    thumb: "assets/motion/thumbs/techflow.jpg",
    duration: "0:30",
    description:
      "A punchy 30-second product launch ad with kinetic typography and 3D product reveals, produced for TechFlow's Series-A announcement.",
  },
  {
    title: "Nova Bank Explainer",
    client: "Nova Bank",
    category: "Explainers",
    type: "mp4",
    src: "assets/motion/videos/novabank.mp4",
    thumb: "assets/motion/thumbs/novabank.jpg",
    duration: "1:15",
    description:
      "An animated explainer that breaks down Nova Bank's mobile features using clean iconography and smooth scene transitions.",
  },
  {
    title: "Pulse App Promo",
    client: "Pulse",
    category: "Social",
    type: "mp4",
    src: "assets/motion/videos/pulse.mp4",
    thumb: "assets/motion/thumbs/pulse.jpg",
    duration: "0:15",
    description:
      "Vertical-friendly social promo built for Instagram & TikTok — bold colors, beat-synced cuts, and snappy captions.",
  },
  {
    title: "Skyline Brand Intro",
    client: "Skyline Studios",
    category: "Motion Graphics",
    type: "mp4",
    src: "assets/motion/videos/skyline.mp4",
    thumb: "assets/motion/thumbs/skyline.jpg",
    duration: "0:08",
    description:
      "A premium logo sting / brand intro with light streaks and depth, designed as a reusable opener for Skyline's video content.",
  },
  {
    title: "EcoDrive Commercial",
    client: "EcoDrive",
    category: "Ads",
    type: "mp4",
    src: "assets/motion/videos/ecodrive.mp4",
    thumb: "assets/motion/thumbs/ecodrive.jpg",
    duration: "0:45",
    description:
      "A broadcast-style commercial mixing live-action plates with motion-graphic overlays to highlight EcoDrive's EV range.",
  },
  {
    title: "Lumen UI Animation",
    client: "Lumen",
    category: "Motion Graphics",
    type: "mp4",
    src: "assets/motion/videos/lumen.mp4",
    thumb: "assets/motion/thumbs/lumen.jpg",
    duration: "0:22",
    description:
      "A UI animation reel showcasing micro-interactions and screen-flow transitions for Lumen's design system.",
  },
];

(function () {
  const grid = document.getElementById("mg-grid");
  const filtersEl = document.getElementById("mg-filters");
  const modal = document.getElementById("mg-modal");
  if (!grid || !modal) return;

  const playerEl = document.getElementById("mg-modal-player");
  const titleEl = document.getElementById("mg-modal-title");
  const metaEl = document.getElementById("mg-modal-meta");
  const descEl = document.getElementById("mg-modal-desc");

  const thumbFor = (p) =>
    p.thumb ||
    (p.type === "youtube" ? `https://img.youtube.com/vi/${p.src}/hqdefault.jpg` : "");

  // ---- Data (live from API, with embedded fallback) ----
  let projects = typeof MG_PROJECTS !== "undefined" ? MG_PROJECTS.slice() : [];
  let activeFilter = "All";

  // ---- Build filter pills ----
  function buildFilters() {
    filtersEl.innerHTML = "";
    const categories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];
    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "mg-filter" + (cat === "All" ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        activeFilter = cat;
        filtersEl.querySelectorAll(".mg-filter").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        render();
      });
      filtersEl.appendChild(btn);
    });
  }

  // ---- Render cards ----
  function render() {
    const list =
      activeFilter === "All"
        ? projects
        : projects.filter((p) => p.category === activeFilter);

    grid.innerHTML = "";
    list.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "mg-card";
      card.style.animationDelay = i * 0.05 + "s";
      card.innerHTML = `
        <div class="mg-thumb">
          <span class="mg-cat">${p.category}</span>
          ${p.duration ? `<span class="mg-duration">${p.duration}</span>` : ""}
          <span class="mg-play"></span>
          <img src="${thumbFor(p)}" alt="${p.title}" loading="lazy" />
        </div>
        <div class="mg-meta">
          <p class="mg-title">${p.title}</p>
          <p class="mg-client">${p.client}</p>
        </div>`;
      card.addEventListener("click", () => openModal(p));
      grid.appendChild(card);
    });
  }

  // ---- Modal ----
  function playerMarkup(p) {
    if (p.type === "youtube") {
      return `<iframe src="https://www.youtube.com/embed/${p.src}?autoplay=1&rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    }
    if (p.type === "vimeo") {
      return `<iframe src="https://player.vimeo.com/video/${p.src}?autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }
    return `<video src="${p.src}" controls autoplay playsinline poster="${thumbFor(p)}"></video>`;
  }

  function openModal(p) {
    playerEl.innerHTML = playerMarkup(p);
    titleEl.textContent = p.title;
    metaEl.textContent = `${p.client} · ${p.category}`;
    descEl.textContent = p.description || "";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    playerEl.innerHTML = ""; // stops video/iframe playback
    document.body.style.overflow = "";
  }

  modal.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", closeModal)
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  function boot() { buildFilters(); render(); }

  fetch("/api/motion")
    .then((r) => r.json())
    .then((d) => { if (d && d.length) projects = d; boot(); })
    .catch(() => boot());
})();
