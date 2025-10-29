const maintenanceConfig = {
  jsonPath: '/maintenance.json',
  pagePath: '/maintenance.html',
  homePath: '/',
  pollIntervalMs: 15000,
};

let maintenanceState = { enabled: null, message: null };
let maintenanceIntervalId = null;

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

function updateMaintenanceMessage(message) {
  const target = document.querySelector('[data-maintenance-message]');
  if (!target) {
    return;
  }

  const defaultMessage = target.dataset.defaultMessage || target.textContent || '';
  target.textContent = message || defaultMessage;
}

async function fetchMaintenanceData() {
  try {
    const response = await fetch(maintenanceConfig.jsonPath, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      enabled: Boolean(data.enabled),
      message: typeof data.message === 'string' ? data.message.trim() : '',
    };
  } catch (error) {
    console.warn('maintenance.json konnte nicht geladen werden:', error);
    return null;
  }
}

async function checkMaintenanceMode() {
  const data = await fetchMaintenanceData();
  if (!data) {
    return;
  }

  const isMaintenancePage = window.location.pathname === maintenanceConfig.pagePath;
  maintenanceState = data;

  if (data.enabled && !isMaintenancePage) {
    window.location.href = maintenanceConfig.pagePath;
    return;
  }

  if (!data.enabled && isMaintenancePage) {
    window.location.href = maintenanceConfig.homePath;
    return;
  }

  if (isMaintenancePage) {
    updateMaintenanceMessage(data.message);
  }
}

function startMaintenanceWatcher() {
  checkMaintenanceMode();

  if (maintenanceIntervalId === null && maintenanceConfig.pollIntervalMs > 0) {
    maintenanceIntervalId = window.setInterval(checkMaintenanceMode, maintenanceConfig.pollIntervalMs);
  }
}

// Startpunkt nach dem Laden der Seite.
function initSite() {
  startMaintenanceWatcher();
  highlightActiveNav();
  insertCurrentYear();
}

document.addEventListener('DOMContentLoaded', initSite);
