// Mobile menu toggle functionality
document.addEventListener('DOMContentLoaded', function () {
    const menuToggleBtn = document.querySelector('.mobile-menu-control-bar button');
    const mobileMenu = document.querySelector('.navbar-main');
    const menuOverlay = document.querySelector('.mobile-menu-overlay');

    if (menuToggleBtn && mobileMenu && menuOverlay) {
        // Toggle menu on button click
        menuToggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            mobileMenu.classList.toggle('show');
            menuOverlay.classList.toggle('show');
        });

        // Close menu when clicking overlay
        menuOverlay.addEventListener('click', function () {
            mobileMenu.classList.remove('show');
            menuOverlay.classList.remove('show');
        });

        // Close menu when clicking a nav link
        const navLinks = mobileMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function () {
                mobileMenu.classList.remove('show');
                menuOverlay.classList.remove('show');
            });
        });
    }
});
