const ROUTES = {
  maintenance: '/maintenance.html',
  home: '/',
};

const STORAGE_KEYS = {
  settings: 'df-site-settings',
  auth: 'df-site-auth',
  intended: 'df-intended-path',
};

const defaultSettings = {
  password: 'mintglass',
  maintenanceEnabled: false,
  maintenanceMessage: 'Wir spielen gerade Updates ein. Die Seite lädt automatisch neu, sobald alles wieder erreichbar ist.',
};

const statusConfig = {
  endpoint: '/status.json',
  containerSelector: '#status',
  refreshMs: 5 * 60 * 1000,
};

let siteSettings = loadSiteSettings();
let maintenanceIntervalId = null;
let statusIntervalId = null;
let tabsInitialised = false;
let settingsOverlayRoot = null;
let settingsTriggerButton = null;
let loginOverlayRoot = null;

// Hilfsfunktionen: Einstellungen & Authentifizierung ---------------------------------

function loadSiteSettings() {
  const stored = localStorage.getItem(STORAGE_KEYS.settings);
  if (!stored) {
    return { ...defaultSettings };
  }

  try {
    const parsed = JSON.parse(stored);
    return { ...defaultSettings, ...parsed };
  } catch (error) {
    console.warn('Konnte gespeicherte Einstellungen nicht lesen, setze zurück.', error);
    return { ...defaultSettings };
  }
}

function saveSiteSettings(partialUpdate) {
  siteSettings = { ...siteSettings, ...partialUpdate };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(siteSettings));
  updateSettingsForms();
  updateMaintenanceMessage();
  enforceMaintenanceState();
}

function isAuthenticated() {
  return sessionStorage.getItem(STORAGE_KEYS.auth) === 'true';
}

function setAuthenticated(value) {
  if (value) {
    sessionStorage.setItem(STORAGE_KEYS.auth, 'true');
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.auth);
  }

  if (settingsOverlayRoot && !settingsOverlayRoot.hidden) {
    updateSettingsForms();
  }
}

function setIntendedPath(path) {
  sessionStorage.setItem(STORAGE_KEYS.intended, path);
}

function popIntendedPath() {
  const value = sessionStorage.getItem(STORAGE_KEYS.intended);
  sessionStorage.removeItem(STORAGE_KEYS.intended);
  return value || ROUTES.home;
}

// Maintenance-Handling --------------------------------------------------------------

function updateMaintenanceMessage() {
  const target = document.querySelector('[data-maintenance-message]');
  if (!target) {
    return;
  }

  const message = siteSettings.maintenanceMessage || defaultSettings.maintenanceMessage;
  target.textContent = message;
}

function enforceMaintenanceState() {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const maintenancePath = ROUTES.maintenance.replace(/\/+$/, '');
  const isMaintenancePage = currentPath === maintenancePath;

  if (siteSettings.maintenanceEnabled) {
    if (!isAuthenticated()) {
      if (!isMaintenancePage) {
        setIntendedPath(window.location.pathname + window.location.search + window.location.hash);
        window.location.href = ROUTES.maintenance;
        return;
      }
    } else if (isMaintenancePage) {
      window.location.href = popIntendedPath();
      return;
    }
  } else if (isMaintenancePage) {
    window.location.href = ROUTES.home;
    return;
  }

  if (isMaintenancePage) {
    updateMaintenanceMessage();
  }
}

function onStorageSync(event) {
  if (event.key === STORAGE_KEYS.settings) {
    siteSettings = loadSiteSettings();
    updateSettingsForms();
    enforceMaintenanceState();
  }
}

function startMaintenanceWatcher() {
  enforceMaintenanceState();

  if (maintenanceIntervalId === null) {
    maintenanceIntervalId = window.setInterval(enforceMaintenanceState, 7000);
    window.addEventListener('storage', onStorageSync);
  }
}

// Layout & Navigation ----------------------------------------------------------------

function highlightActiveNav() {
  const currentPath = window.location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.site-nav__link').forEach((link) => {
    const linkPath = new URL(link.href, window.location.origin).pathname.replace(/index\.html$/, '');
    const isActive = linkPath === currentPath;

    link.classList.toggle('site-nav__link--active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function insertCurrentYear() {
  const year = new Date().getFullYear();
  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = year;
  });
}

// Tabs & Tools -----------------------------------------------------------------------

function initTabs() {
  if (tabsInitialised) {
    return;
  }

  const tabsRoot = document.querySelector('[data-tabs]');
  if (!tabsRoot) {
    return;
  }

  const tabButtons = Array.from(tabsRoot.querySelectorAll('[data-tab-target]'));
  const tabPanels = Array.from(tabsRoot.querySelectorAll('[data-tab-panel]'));

  if (!tabButtons.length || !tabPanels.length) {
    return;
  }

  function activateTab(targetName) {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.tabTarget === targetName;
      button.setAttribute('aria-selected', String(isActive));
      button.setAttribute('tabindex', isActive ? '0' : '-1');
      button.classList.toggle('tabs__tab--active', isActive);
    });

    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === targetName;
      panel.classList.toggle('tabs__panel--hidden', !isActive);
      panel.setAttribute('aria-hidden', String(!isActive));
    });
  }

  function focusAdjacentTab(currentIndex, direction) {
    const total = tabButtons.length;
    const nextIndex = (currentIndex + direction + total) % total;
    tabButtons[nextIndex].focus();
    const target = tabButtons[nextIndex].dataset.tabTarget;
    activateTab(target);
  }

  tabButtons.forEach((button, index) => {
    const target = button.dataset.tabTarget;
    const panel = tabPanels.find((node) => node.dataset.tabPanel === target);
    if (panel && panel.id) {
      button.setAttribute('aria-controls', panel.id);
    }

    button.addEventListener('click', () => activateTab(target));

    button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusAdjacentTab(index, 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusAdjacentTab(index, -1);
      }
    });
  });

  const initialTarget =
    tabButtons.find((button) => button.getAttribute('aria-selected') === 'true')?.dataset.tabTarget ||
    tabButtons[0].dataset.tabTarget;
  activateTab(initialTarget);
  tabsInitialised = true;
}

// Zeitrechner ------------------------------------------------------------------------

function formatMinutes(totalMinutes) {
  const sign = totalMinutes < 0 ? '-' : '';
  const absolute = Math.abs(totalMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${sign}${paddedHours}:${paddedMinutes}`;
}

function evaluateTimeExpression(rawExpression) {
  if (typeof rawExpression !== 'string') {
    throw new Error('Ungültiger Ausdruck.');
  }

  const cleaned = rawExpression.replace(/\s+/g, '');
  if (!cleaned) {
    throw new Error('Bitte einen Ausdruck eingeben.');
  }

  if (!/^[0-9:+\-*]+$/.test(cleaned)) {
    throw new Error('Syntaxfehler: Erlaubt sind hh:mm, +, -, k*hh:mm.');
  }

  const termPattern = /([+\-]?)(\d+\*)?(\d{1,2}:[0-5]\d)/g;
  let totalMinutes = 0;
  let match;
  let lastIndex = 0;
  let termCount = 0;

  while ((match = termPattern.exec(cleaned)) !== null) {
    if (match.index !== lastIndex) {
      throw new Error('Syntaxfehler: Bitte Ausdruck prüfen.');
    }

    const sign = match[1] === '-' ? -1 : 1;
    const multiplier = match[2] ? parseInt(match[2].slice(0, -1), 10) : 1;
    const [hoursStr, minutesStr] = match[3].split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const termMinutes = (hours * 60 + minutes) * multiplier;
    totalMinutes += sign * termMinutes;

    lastIndex = termPattern.lastIndex;
    termCount += 1;
  }

  if (lastIndex !== cleaned.length || termCount === 0) {
    throw new Error('Syntaxfehler: Bitte Ausdruck prüfen.');
  }

  return totalMinutes;
}

function initTimeCalculator() {
  const form = document.querySelector('[data-time-calculator]');
  if (!form) {
    return;
  }

  const input = form.querySelector('#time-expression');
  const resultNode = document.querySelector('[data-time-result]');

  function showResult(message, isError = false) {
    if (!resultNode) {
      return;
    }
    resultNode.textContent = message;
    resultNode.classList.toggle('time-calculator__result--error', isError);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    try {
      const totalMinutes = evaluateTimeExpression(input.value);
      const formatted = formatMinutes(totalMinutes);
      const hoursDecimals = (totalMinutes / 60).toFixed(2);
      showResult(`Ergebnis: ${formatted} (≈ ${hoursDecimals} Stunden)`);
    } catch (error) {
      showResult(error.message, true);
    }
  });
}

// Einstellungen-Overlay --------------------------------------------------------------

function updateSettingsForms() {
  if (!settingsOverlayRoot) {
    return;
  }

  const maintenanceToggle = settingsOverlayRoot.querySelector('[data-settings-maintenance-toggle]');
  const maintenanceMessage = settingsOverlayRoot.querySelector('[data-settings-maintenance-message]');
  const feedback = settingsOverlayRoot.querySelector('[data-settings-feedback]');

  if (maintenanceToggle) {
    maintenanceToggle.checked = Boolean(siteSettings.maintenanceEnabled);
  }

  if (maintenanceMessage) {
    maintenanceMessage.value = siteSettings.maintenanceMessage || '';
  }

  if (feedback) {
    feedback.textContent = '';
    feedback.classList.remove('settings-feedback--error');
  }
}

function initSettingsOverlay() {
  settingsOverlayRoot = document.querySelector('[data-settings-overlay]');
  loginOverlayRoot = document.querySelector('[data-settings-login-overlay]');
  settingsTriggerButton = document.querySelector('[data-settings-trigger]');

  if (!settingsOverlayRoot || !settingsTriggerButton || !loginOverlayRoot) {
    return;
  }

  const settingsModal = settingsOverlayRoot.querySelector('.settings-modal');
  const closeButton = settingsOverlayRoot.querySelector('[data-settings-close]');
  const maintenanceForm = settingsOverlayRoot.querySelector('[data-settings-maintenance]');
  const passwordForm = settingsOverlayRoot.querySelector('[data-settings-password]');
  const feedback = settingsOverlayRoot.querySelector('[data-settings-feedback]');

  const loginModal = loginOverlayRoot.querySelector('.settings-login-modal');
  const loginCloseButton = loginOverlayRoot.querySelector('[data-settings-login-close]');
  const loginForm = loginOverlayRoot.querySelector('[data-settings-login]');
  const loginPasswordInput = loginOverlayRoot.querySelector('#settings-login-password');
  const loginFeedback = loginOverlayRoot.querySelector('[data-settings-login-feedback]');

  const showSettingsFeedback = (message, isError = false) => {
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.classList.toggle('settings-feedback--error', isError);
  };

  const showLoginFeedback = (message, isError = false) => {
    if (!loginFeedback) {
      return;
    }
    loginFeedback.textContent = message;
    loginFeedback.classList.toggle('settings-feedback--error', isError);
  };

  const openSettingsOverlay = () => {
    settingsOverlayRoot.hidden = false;
    updateSettingsForms();
    settingsModal?.focus();
  };

  const closeSettingsOverlay = () => {
    settingsOverlayRoot.hidden = true;
    showSettingsFeedback('');
    settingsTriggerButton?.focus();
  };

  const openLoginOverlay = () => {
    loginOverlayRoot.hidden = false;
    showLoginFeedback('');
    if (loginPasswordInput) {
      loginPasswordInput.value = '';
      loginPasswordInput.focus();
    }
  };

  const closeLoginOverlay = () => {
    loginOverlayRoot.hidden = true;
    showLoginFeedback('');
    settingsTriggerButton?.focus();
  };

  if (settingsModal && !settingsModal.hasAttribute('tabindex')) {
    settingsModal.setAttribute('tabindex', '-1');
  }

  if (loginModal && !loginModal.hasAttribute('tabindex')) {
    loginModal.setAttribute('tabindex', '-1');
  }

  settingsTriggerButton.addEventListener('click', () => {
    if (isAuthenticated()) {
      openSettingsOverlay();
    } else {
      openLoginOverlay();
    }
  });

  closeButton?.addEventListener('click', closeSettingsOverlay);

  settingsOverlayRoot.addEventListener('click', (event) => {
    if (event.target === settingsOverlayRoot) {
      closeSettingsOverlay();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!settingsOverlayRoot.hidden) {
        closeSettingsOverlay();
      } else if (!loginOverlayRoot.hidden) {
        closeLoginOverlay();
      }
    }
  });

  if (loginOverlayRoot) {
    loginOverlayRoot.addEventListener('click', (event) => {
      if (event.target === loginOverlayRoot) {
        closeLoginOverlay();
      }
    });
  }

  loginCloseButton?.addEventListener('click', closeLoginOverlay);

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = loginPasswordInput?.value.trim() || '';

      if (!value) {
        showLoginFeedback('Bitte Passwort eingeben.', true);
        return;
      }

      if (value === siteSettings.password) {
        setAuthenticated(true);
        showLoginFeedback('');
        closeLoginOverlay();
        openSettingsOverlay();
      } else {
        showLoginFeedback('Passwort ist falsch.', true);
      }
    });
  }

  if (maintenanceForm) {
    maintenanceForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!isAuthenticated()) {
        showSettingsFeedback('Bitte zuerst anmelden.', true);
        return;
      }

      const enabled = Boolean(settingsOverlayRoot.querySelector('[data-settings-maintenance-toggle]')?.checked);
      const messageField = settingsOverlayRoot.querySelector('[data-settings-maintenance-message]');
      const message = (messageField?.value || '').trim() || defaultSettings.maintenanceMessage;

      saveSiteSettings({ maintenanceEnabled: enabled, maintenanceMessage: message });
      showSettingsFeedback(enabled ? 'Wartungsmodus aktiviert.' : 'Wartungsmodus deaktiviert.');
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!isAuthenticated()) {
        showSettingsFeedback('Bitte zuerst anmelden.', true);
        return;
      }

      const current = settingsOverlayRoot.querySelector('[data-settings-current-password]')?.value.trim() || '';
      const next = settingsOverlayRoot.querySelector('[data-settings-new-password]')?.value.trim() || '';
      const confirm = settingsOverlayRoot.querySelector('[data-settings-confirm-password]')?.value.trim() || '';

      if (current !== siteSettings.password) {
        showSettingsFeedback('Aktuelles Passwort ist falsch.', true);
        return;
      }

      if (next.length < 4) {
        showSettingsFeedback('Neues Passwort muss mindestens 4 Zeichen lang sein.', true);
        return;
      }

      if (next !== confirm) {
        showSettingsFeedback('Passwörter stimmen nicht überein.', true);
        return;
      }

      saveSiteSettings({ password: next });
      const currentField = settingsOverlayRoot.querySelector('[data-settings-current-password]');
      const newField = settingsOverlayRoot.querySelector('[data-settings-new-password]');
      const confirmField = settingsOverlayRoot.querySelector('[data-settings-confirm-password]');
      if (currentField) currentField.value = '';
      if (newField) newField.value = '';
      if (confirmField) confirmField.value = '';
      showSettingsFeedback('Passwort gespeichert.');
    });
  }

  updateSettingsForms();
}

// Wartungsseite Login ----------------------------------------------------------------

function initMaintenancePage() {
  const loginForm = document.querySelector('[data-maintenance-login]');
  if (!loginForm) {
    return;
  }

  const passwordInput = loginForm.querySelector('[data-maintenance-password]');
  const feedback = loginForm.querySelector('[data-maintenance-feedback]');

  function showMessage(message, isError = false) {
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.classList.toggle('settings-feedback--error', isError);
  }

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = passwordInput.value.trim();

    if (!value) {
      showMessage('Bitte Passwort eingeben.', true);
      return;
    }

    if (value === siteSettings.password) {
      setAuthenticated(true);
      passwordInput.value = '';
      showMessage('Willkommen zurück.');
      window.location.href = popIntendedPath();
    } else {
      showMessage('Passwort ist falsch.', true);
    }
  });

  updateMaintenanceMessage();
}

// Tools Seite initialisieren ---------------------------------------------------------

function initToolsPage() {
  const normalisedPath = window.location.pathname.replace(/\/+$/, '');
  const isToolsPage =
    normalisedPath.endsWith('/tools') ||
    normalisedPath.endsWith('/tools/index.html') ||
    normalisedPath === '/tools';

  if (!isToolsPage) {
    return;
  }

  initTabs();
  initTimeCalculator();
}

// Statusanzeige ----------------------------------------------------------------------

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

function updateStatusTimestamp(timestamp) {
  const target = document.querySelector('[data-status-updated]');
  if (!target) {
    return;
  }

  if (!timestamp) {
    target.textContent = 'Stand: unbekannt';
    target.removeAttribute('data-iso');
    return;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    target.textContent = `Stand: ${timestamp}`;
    target.removeAttribute('data-iso');
    return;
  }

  const formatted = parsed.toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  target.textContent = `Stand: ${formatted}`;
  target.dataset.iso = parsed.toISOString();
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
    updateStatusTimestamp(data.last_update);
    renderStatus(container, services);
  } catch (error) {
    showStatusError(container, 'Status konnte nicht geladen werden. Bitte später erneut versuchen.');
    updateStatusTimestamp(null);
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

// Initialisierung --------------------------------------------------------------------

function initSite() {
  startMaintenanceWatcher();
  startStatusUpdates();
  initSettingsOverlay();
  initToolsPage();
  initMaintenancePage();
  highlightActiveNav();
  insertCurrentYear();
}

document.addEventListener('DOMContentLoaded', initSite);
