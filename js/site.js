// Markiert in der Navigation den Link zur aktuellen Seite.
function highlightActiveNav() {
  const currentPath = window.location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.site-nav__link').forEach((link) => {
    const linkPath = new URL(link.href).pathname.replace(/index\.html$/, '');
    const isActive = linkPath === currentPath;

    link.classList.toggle('site-nav__link--active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

// Setzt das aktuelle Jahr im Footer.
function insertCurrentYear() {
  const year = new Date().getFullYear();
  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = year;
  });
}

// Startpunkt nach dem Laden der Seite.
function initSite() {
  highlightActiveNav();
  insertCurrentYear();
}

document.addEventListener('DOMContentLoaded', initSite);
