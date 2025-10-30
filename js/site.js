const maintenanceConfig = {
  jsonPath: '/maintenance.json',
  pagePath: '/maintenance.html',
  homePath: '/',
  pollIntervalMs: 15000,
};

let maintenanceState = { enabled: null, message: null };
let maintenanceIntervalId = null;

const statusConfig = {
  endpoint: '/status.json',
  containerSelector: '#status',
  refreshMs: 5 * 60 * 1000,
};

let statusIntervalId = null;

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

function normaliseStatusValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function createStatusItem(service) {
  const item = document.createElement('div');
  item.classList.add('status-item');

  const statusValue = normaliseStatusValue(service.status);
  const allowedStatuses = ['online', 'offline', 'maintenance'];
  const statusClass = allowedStatuses.includes(statusValue) ? `status-${statusValue}` : 'status-maintenance';
  item.classList.add(statusClass);

  const name = document.createElement('span');
  name.className = 'status-item__name';
  name.textContent = service.name || 'Unbenannter Dienst';

  const details = document.createElement('span');
  details.className = 'status-item__details';
  const fallbackLabel = statusValue ? statusValue.charAt(0).toUpperCase() + statusValue.slice(1) : 'Unbekannt';
  details.textContent = service.message || `Status: ${fallbackLabel}`;

  item.append(name, details);
  return item;
}

function renderStatus(container, services) {
  container.innerHTML = '';

  if (!services.length) {
    container.innerHTML = '<p class="status-hint">Aktuell liegen keine Statusinformationen vor.</p>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'status-list';

  services.forEach((service) => {
    list.appendChild(createStatusItem(service));
  });

  container.appendChild(list);
}

function showStatusError(container, message) {
  container.innerHTML = '';
  const error = document.createElement('p');
  error.className = 'status-hint status-error';
  error.textContent = message;
  container.appendChild(error);
}

function parseStatusData(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.services)) {
    return data.services;
  }

  if (data.services && typeof data.services === 'object') {
    return Object.entries(data.services).map(([name, statusValue]) => ({
      name,
      status: statusValue,
    }));
  }

  return [];
}

async function fetchStatus(container) {
  try {
    const response = await fetch(statusConfig.endpoint, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const services = parseStatusData(data);
    renderStatus(container, services);
  } catch (error) {
    showStatusError(container, 'Status konnte nicht geladen werden. Bitte später erneut versuchen.');
  }
}

function startStatusUpdates() {
  const container = document.querySelector(statusConfig.containerSelector);
  if (!container) {
    return;
  }

  fetchStatus(container);

  if (statusIntervalId === null && statusConfig.refreshMs > 0) {
    statusIntervalId = window.setInterval(() => fetchStatus(container), statusConfig.refreshMs);
  }
}

// Startpunkt nach dem Laden der Seite.
function initSite() {
  startMaintenanceWatcher();
  startStatusUpdates();
  highlightActiveNav();
  insertCurrentYear();
}

document.addEventListener('DOMContentLoaded', initSite);
