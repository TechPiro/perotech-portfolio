// PeroTech newsletter form -> backend (/api/subscribe) with toast notifications

/* ---------- Toast system ---------- */
(function () {
  const ICONS = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line><circle cx="12" cy="12" r="9"></circle></svg>',
  };

  window.showToast = function ({ type = "success", title, message = "", duration = 5500 }) {
    let container = document.getElementById("pt-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "pt-toast-container";
      container.className = "pt-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "pt-toast pt-" + type;
    toast.innerHTML = `
      <div class="pt-toast-icon">${ICONS[type] || ICONS.success}</div>
      <div class="pt-toast-body">
        <p class="pt-toast-title">${title}</p>
        ${message ? `<p class="pt-toast-msg">${message}</p>` : ""}
      </div>
      <button class="pt-toast-close" aria-label="Close">&times;</button>
      <span class="pt-toast-bar" style="animation-duration:${duration}ms"></span>`;
    container.appendChild(toast);

    let timer;
    const remove = () => {
      clearTimeout(timer);
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 350);
    };
    const start = () => (timer = setTimeout(remove, duration));

    toast.querySelector(".pt-toast-close").addEventListener("click", remove);
    toast.addEventListener("mouseenter", () => clearTimeout(timer));
    toast.addEventListener("mouseleave", start);
    start();
    return toast;
  };
})();

/* ---------- Newsletter form ---------- */
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const btn = form.querySelector('button[type="submit"]');

  const firstNameOf = (full) => {
    const n = (full || "").trim().split(/\s+/)[0] || "";
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const nameEl = form.querySelector('[name="name"]');
    const emailEl = form.querySelector('[name="email"]');
    const fullName = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const first = firstNameOf(fullName);

    if (!email) {
      window.showToast({ type: "error", title: "Email required", message: "Please enter your email address." });
      return;
    }

    const originalHTML = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.7";
      btn.textContent = "Joining...";
    }

    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName, email: email }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then((res) => {
        if (res.ok && res.data && res.data.success) {
          window.showToast({
            type: "success",
            title: first ? `You're in, ${first}! 🎉` : "You're in! 🎉",
            message: "Thanks for subscribing — check your inbox to confirm.",
          });
          form.reset();
        } else {
          window.showToast({
            type: "error",
            title: "Subscription failed",
            message: (res.data && res.data.message) || "Something went wrong. Please try again.",
          });
        }
      })
      .catch(() => {
        window.showToast({
          type: "error",
          title: "Connection error",
          message: "Could not reach the server. Please try again.",
        });
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.innerHTML = originalHTML;
        }
      });
  });
})();
