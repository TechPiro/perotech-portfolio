// Horizontal sliders (YouTube videos + reviews). Exposed globally so dynamically
// loaded content (home.js) can re-initialise after injecting slides.
function initSlider(selector, itemsDesktop, itemsMobile) {
  const container = document.querySelector(selector);
  if (!container) return;

  // Cleanup: remove cloned slides to prevent duplicate content / layout issues
  container.querySelectorAll('.slick-cloned').forEach((slide) => slide.remove());

  const list = container.querySelector('.slick-list');
  const track = list ? list.querySelector('.slick-track') : null;
  let prevBtn = container.querySelector('.fa-arrow-left, .icon.left');
  let nextBtn = container.querySelector('.fa-arrow-right, .icon.right');

  if (!list || !track || !prevBtn || !nextBtn) return;

  list.removeAttribute('style');
  track.removeAttribute('style');

  Object.assign(list.style, {
    overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none',
    display: 'flex', width: '100%', margin: '0', padding: '0',
  });
  Object.assign(track.style, {
    display: 'flex', width: 'max-content', transform: 'none', left: '0', margin: '0', gap: '0',
  });

  const slides = track.querySelectorAll('.slick-slide');
  if (!slides.length) return;

  function updateLayout() {
    const itemsPerRow = window.innerWidth >= 768 ? itemsDesktop : itemsMobile;
    const itemWidth = list.clientWidth / itemsPerRow;
    slides.forEach((slide) => {
      slide.removeAttribute('style');
      Object.assign(slide.style, {
        display: 'block', float: 'none', height: 'auto',
        width: `${itemWidth}px`, flexShrink: '0', boxSizing: 'border-box', padding: '0 12px',
      });
    });
  }
  updateLayout();
  window.addEventListener('resize', updateLayout);

  // Reset arrow listeners by cloning (avoids double-binding on re-init)
  const freshPrev = prevBtn.cloneNode(true); prevBtn.parentNode.replaceChild(freshPrev, prevBtn); prevBtn = freshPrev;
  const freshNext = nextBtn.cloneNode(true); nextBtn.parentNode.replaceChild(freshNext, nextBtn); nextBtn = freshNext;

  prevBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); list.scrollBy({ left: -slides[0].offsetWidth, behavior: 'smooth' }); });
  nextBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); list.scrollBy({ left: slides[0].offsetWidth, behavior: 'smooth' }); });
  prevBtn.style.cursor = nextBtn.style.cursor = 'pointer';
  prevBtn.style.display = nextBtn.style.display = 'block';
}

window.initSlider = initSlider;

document.addEventListener('DOMContentLoaded', function () {
  initSlider('.article-publications-slider', 3, 1);
  initSlider('.client-feedback-slider', 2, 1);
});
