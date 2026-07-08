// Shared student-session helpers (passwordless). Token lives in localStorage.
window.PT = (function () {
  const TK = "pt_student_token", EM = "pt_student_email", NM = "pt_student_name";
  const token = () => localStorage.getItem(TK) || "";
  const email = () => localStorage.getItem(EM) || "";
  const name = () => localStorage.getItem(NM) || "";
  const setSession = (t, e, n) => { localStorage.setItem(TK, t); localStorage.setItem(EM, e || ""); if (n != null) localStorage.setItem(NM, n); };
  const clear = () => { localStorage.removeItem(TK); localStorage.removeItem(EM); localStorage.removeItem(NM); };
  const authHeaders = () => (token() ? { Authorization: "Bearer " + token() } : {});

  // Render the top-right auth bar into a container element.
  function renderAuthBar(el) {
    if (!el) return;
    if (token()) {
      el.innerHTML =
        `<span class="who">Signed in as <b>${email()}</b></span>` +
        ` <a class="pill-link" href="/learn-dashboard">My courses</a>` +
        ` <button id="pt-logout">Sign out</button>`;
      const b = el.querySelector("#pt-logout");
      if (b) b.addEventListener("click", () => { clear(); location.reload(); });
    } else {
      el.innerHTML = `<a class="pill-link" href="/student-login">Sign in</a>`;
    }
  }
  // App-style bottom navigation for signed-in students (mobile only). `active`
  // is one of: "browse" | "courses" | "profile".
  function renderBottomNav(active) {
    if (!token()) return;                                  // students only
    if (document.getElementById("pt-bottomnav")) return;   // once
    const ICON = {
      browse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
      courses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z"/></svg>',
      profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    };
    const tabs = [
      { id: "browse", label: "Browse", href: "/learn" },
      { id: "courses", label: "My Courses", href: "/learn-dashboard" },
      { id: "profile", label: "Profile", href: "/student-profile" },
    ];
    const nav = document.createElement("nav");
    nav.id = "pt-bottomnav";
    nav.className = "pt-bottomnav";
    nav.setAttribute("aria-label", "Student navigation");
    nav.innerHTML = tabs.map((t) =>
      `<a class="ptn-item${t.id === active ? " active" : ""}" href="${t.href}">${ICON[t.id]}<span>${t.label}</span></a>`
    ).join("");
    document.body.appendChild(nav);
    document.body.classList.add("has-bottomnav");
  }

  return { token, email, name, setSession, clear, authHeaders, renderAuthBar, renderBottomNav };
})();
