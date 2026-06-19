// Renders the Products page from /api/products (admin-managed). Falls back to
// the static markup already in the page if the API is unavailable.
(function () {
  const list = document.getElementById("products-list");
  if (!list) return;

  const preview =
    'M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V12L17.206 8.207L11.2071 14.2071L9.79289 12.7929L15.792 6.793L12 3H21Z';

  function card(p) {
    return `<div class="col-lg-12">
      <div class="portfolio-item">
        <div class="image"><img src="${p.image}" alt="${p.title}" class="img-fluid w-100" />
          <a href="${p.url}" target="_blank" class="full-image-preview">
            <svg class="icon" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="${preview}"></path></svg>
          </a>
        </div>
        <div class="text">
          <div class="info"><a target="_blank" class="title" href="${p.url}">${p.title}</a>
            <p class="subtitle">${p.subtitle || ""}</p>
          </div>
          <div class="visite-btn"><a target="_blank" href="${p.url}">Visit Site<svg class="arrow-up" width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.91634 4.5835L4.08301 10.4168" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.66699 4.5835H9.91699V9.8335" stroke-linecap="round" stroke-linejoin="round"></path></svg></a></div>
        </div>
      </div>
    </div>`;
  }

  fetch("/api/products")
    .then((r) => r.json())
    .then((items) => {
      if (Array.isArray(items) && items.length) list.innerHTML = items.map(card).join("");
    })
    .catch(() => {});
})();
