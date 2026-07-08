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
  return { token, email, name, setSession, clear, authHeaders, renderAuthBar };
})();
