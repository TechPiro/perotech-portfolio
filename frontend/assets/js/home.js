// Populates the homepage (profile, timeline, tools) live from the API.
// Falls back silently to the static markup if the API is unavailable.
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // ---- Profile / settings ----
  fetch("/api/settings").then((r) => r.json()).then((s) => {
    if (!s) return;
    const photo = document.getElementById("home-photo");
    const heading = document.getElementById("home-heading");
    const tagline = document.getElementById("home-tagline");
    const socials = document.getElementById("home-socials");
    if (photo && s.photo) photo.src = s.photo;
    if (heading && s.homeHeading) heading.innerHTML = esc(s.homeHeading);
    if (tagline && s.tagline) tagline.innerHTML = esc(s.tagline);
    if (socials && s.socials) {
      const ic = { youtube: "fa-youtube", linkedin: "fa-linkedin", instagram: "fa-instagram", twitter: "fa-twitter" };
      const links = Object.keys(ic).filter((k) => s.socials[k]).map((k) =>
        `<li><a href="${esc(s.socials[k])}" target="_blank"><i class="fab ${ic[k]}"></i></a></li>`).join("");
      if (links) socials.innerHTML = links;
    }
  }).catch(() => {});

  // ---- Timeline (CSS marquee: render the list twice) ----
  fetch("/api/timeline").then((r) => r.json()).then((items) => {
    const wrap = document.getElementById("home-timeline");
    if (!wrap || !items || !items.length) return;
    const li = (t) => `<li>
      <div class="info">
        <div class="icon"><img src="${esc(t.icon)}" alt="logo" /></div>
        <div class="text"><h4 class="title">${esc(t.name)}</h4><h6 class="subtitle">${esc(t.subtitle || "")}</h6></div>
      </div>
      <div class="date"><p>${esc(t.date || "")}</p></div>
    </li>`;
    const list = `<ul class="work-experiance-slider list-unstyled">${items.map(li).join("")}</ul>`;
    wrap.innerHTML = list + list; // duplicate for seamless scroll
  }).catch(() => {});

  // ---- Tools ----
  fetch("/api/tools").then((r) => r.json()).then((items) => {
    const grid = document.getElementById("home-tools");
    if (!grid || !items || !items.length) return;
    grid.innerHTML = items.map((t) => `
      <div class="col-xl-4 col-md-4 col-sm-6 col-6">
        <div class="expertise-item">
          <div class="image text-center"><img src="${esc(t.icon)}" alt="${esc(t.name)}" /></div>
          <div class="text"><h4 class="title">${esc(t.name)}</h4></div>
        </div>
      </div>`).join("");
  }).catch(() => {});

  // ---- Latest YouTube videos ----
  fetch("/api/videos").then((r) => r.json()).then((items) => {
    const track = document.getElementById("home-videos-track");
    if (!track || !items || !items.length) return;
    const url = (v) => v.url || (v.videoId ? "https://www.youtube.com/watch?v=" + v.videoId : "#");
    const thumb = (v) => v.thumb || (v.videoId ? `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg` : "");
    track.innerHTML = items.map((v) => `
      <div class="slick-slide"><div><div class="col-lg-6" style="width:100%;display:inline-block">
        <div class="article-publications-item">
          <div class="image"><a target="_blank" class="d-block w-100" href="${esc(url(v))}"><img src="${esc(thumb(v))}" alt="${esc(v.title)}" class="img-fluid w-100" /></a></div>
          <div class="text"><a target="_blank" class="title" href="${esc(url(v))}">${esc(v.title)}</a><h6 class="subtitle">${esc(v.date || "")}</h6></div>
        </div>
      </div></div></div>`).join("");
    if (window.initSlider) window.initSlider(".article-publications-slider", 3, 1);
  }).catch(() => {});
})();
