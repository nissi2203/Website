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

// Prüft, ob maintenance.json Wartungsmodus aktiviert hat.
async function checkMaintenanceMode() {
  const maintenancePath = '/maintenance.html';
  const isMaintenancePage = window.location.pathname === maintenancePath;

  try {
    const response = await fetch('/maintenance.json', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const isEnabled = Boolean(data.enabled);

    if (isEnabled && !isMaintenancePage) {
      window.location.href = maintenancePath;
      return;
    }

    if (!isEnabled && isMaintenancePage) {
      window.location.href = '/';
      return;
    }

    if (isMaintenancePage && data.message) {
      const target = document.querySelector('[data-maintenance-message]');
      if (target) {
        target.textContent = data.message;
      }
    }
  } catch (error) {
    console.warn('maintenance.json konnte nicht geladen werden:', error);
  }
}

// Startpunkt nach dem Laden der Seite.
function initSite() {
  checkMaintenanceMode();
  highlightActiveNav();
  insertCurrentYear();
}

document.addEventListener('DOMContentLoaded', initSite);
