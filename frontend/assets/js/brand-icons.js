// Shared logo/icon set for admin pickers and front-end rendering.
// Used by the course-material download buttons and by "button" content blocks.
// Anything not covered here can still be supplied as an uploaded logo image.
(function () {
  const svg = (inner, stroke) =>
    `<svg viewBox="0 0 24 24" ${stroke
      ? 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'
      : 'fill="currentColor" fill-rule="evenodd"'} aria-hidden="true">${inner}</svg>`;

  const ICONS = {
    // ---- platforms / brands ----
    windows: { label: "Windows", svg: svg('<path d="M0 3.449 9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.801"/>') },
    apple: { label: "Apple / macOS", svg: svg('<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>') },
    android: { label: "Android", svg: svg('<path d="M17.6 9.48 19.44 6.3a.42.42 0 0 0-.73-.42l-1.87 3.23A11.4 11.4 0 0 0 12 8.1c-1.7 0-3.3.36-4.84 1.01L5.29 5.88a.42.42 0 1 0-.73.42l1.84 3.18A10.3 10.3 0 0 0 1 17.5h22a10.3 10.3 0 0 0-5.4-8.02ZM7.8 12.4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm8.4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>') },
    linux: { label: "Linux", svg: svg('<path d="M12 2c-2.2 0-3.9 1.7-3.9 3.9v1.9c0 .9-.4 1.6-1 2.4C5.8 11.7 5 13.6 5 15.6c0 .6.2 1.1.5 1.5-.8.9-1.4 1.8-1.7 2.6-.3.9.2 1.6 1.1 1.6.7 0 1.5-.3 2.3-.8A7.7 7.7 0 0 0 12 22c1.7 0 3.3-.4 4.8-1.6.8.5 1.6.8 2.3.8.9 0 1.4-.7 1.1-1.6-.3-.8-.9-1.7-1.7-2.6.3-.4.5-.9.5-1.5 0-2-.8-3.9-2.1-5.4-.6-.8-1-1.5-1-2.4V5.9C15.9 3.7 14.2 2 12 2Zm-1.6 3.4a.9 1.1 0 1 1 0 2.2.9 1.1 0 0 1 0-2.2Zm3.2 0a.9 1.1 0 1 1 0 2.2.9 1.1 0 0 1 0-2.2ZM12 7.9c.8 0 1.6.5 1.6 1.1 0 .5-.8 1-1.6 1s-1.6-.5-1.6-1c0-.6.8-1.1 1.6-1.1Z"/>') },
    github: { label: "GitHub", svg: svg('<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>') },
    // ---- file / content kinds ----
    package: { label: "Installer / package", svg: svg('<path d="M21 8v8a1 1 0 0 1-.53.88l-8 4.5a1 1 0 0 1-.94 0l-8-4.5A1 1 0 0 1 3 16V8a1 1 0 0 1 .53-.88l8-4.5a1 1 0 0 1 .94 0l8 4.5A1 1 0 0 1 21 8Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>', 1) },
    download: { label: "Download", svg: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', 1) },
    zip: { label: "ZIP archive", svg: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 6h2M10 9h2M10 12h2M10 15h2"/>', 1) },
    pdf: { label: "PDF / document", svg: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>', 1) },
    terminal: { label: "Terminal / CLI", svg: svg('<rect x="2.5" y="4" width="19" height="16" rx="2"/><polyline points="7 9 10 12 7 15"/><line x1="12.5" y1="15" x2="17" y2="15"/>', 1) },
    code: { label: "Source code", svg: svg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>', 1) },
    video: { label: "Video", svg: svg('<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m22 8-6 4 6 4V8Z"/>', 1) },
    image: { label: "Image / assets", svg: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/>', 1) },
    audio: { label: "Audio", svg: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', 1) },
    book: { label: "Ebook / guide", svg: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>', 1) },
    // ---- generic marks ----
    globe: { label: "Web / online", svg: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>', 1) },
    chip: { label: "AI / model", svg: svg('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>', 1) },
    brush: { label: "Design / presets", svg: svg('<path d="M9.5 14.5 3 21s3.5.5 5.5-1.5S9.5 14.5 9.5 14.5Z"/><path d="M14 4.5 19.5 10 11 18.5 5.5 13 14 4.5Z"/><path d="m16.5 2 5.5 5.5-2.5 2.5L14 4.5 16.5 2Z"/>', 1) },
    rocket: { label: "Bonus / launch", svg: svg('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="M12 15 9 12a11 11 0 0 1 8-9 11 11 0 0 1-2 9 5 5 0 0 1-3 3Z"/>', 1) },
    key: { label: "License key", svg: svg('<circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 9-9 2 2-2 2 2 2-2 2-2-2-2 2"/>', 1) },
    lock: { label: "Secure / locked", svg: svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', 1) },
    cart: { label: "Buy / cart", svg: svg('<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.7 12.4a1.5 1.5 0 0 0 1.5 1.1h8.1a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/>', 1) },
    play: { label: "Play / watch", svg: svg('<circle cx="12" cy="12" r="9.2"/><path d="m10 8.5 6 3.5-6 3.5v-7Z"/>', 1) },
  };

  // Options for the admin pickers, in the order declared above.
  const list = Object.keys(ICONS).map((k) => ({ key: k, label: ICONS[k].label }));

  // Resolve a block/resource icon to markup. An uploaded image always wins over
  // the preset key, so any real brand logo can be dropped in from the admin.
  function markup(key, src, cls) {
    const c = cls || "pt-ico";
    const url = String(src || "").trim();
    if (url) {
      const href = (/^https?:\/\//i.test(url) ? url : "/" + url.replace(/^\//, "")).replace(/"/g, "&quot;");
      return `<img class="${c} ${c}-img" src="${href}" alt="" loading="lazy" onerror="this.style.display='none'"/>`;
    }
    const ico = ICONS[String(key || "").trim()];
    return ico ? `<span class="${c}">${ico.svg}</span>` : "";
  }

  window.PTIcons = { list, markup, has: (k) => !!ICONS[k] };
})();
