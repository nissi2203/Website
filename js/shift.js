const API_BASE = 'https://shiftapi.dyonisosfergadiotis.de/schichten';
const HOURLY_WAGE = 15.43;

let initialized = false;
let form;
let dateInput;
let dayInput;
let startInput;
let endInput;
let breakInput;
let hoursInput;
let wageInput;
let statusNode;
let tableBody;
let submitBtn;
let fetchBtn;
let deleteBtn;

function setStatus(message, isError = false) {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.classList.toggle('shift-status--error', isError);
}

function parseDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const base = trimmed.split('T')[0];
  let day;
  let month;
  let year;

  const dotMatch = base.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (dotMatch) {
    day = Number(dotMatch[1]);
    month = Number(dotMatch[2]);
    year = Number(dotMatch[3]);
    if (year < 100) {
      year += 2000;
    }
  } else {
    const dashMatch = base.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dashMatch) {
      return null;
    }
    year = Number(dashMatch[1]);
    month = Number(dashMatch[2]);
    day = Number(dashMatch[3]);
  }

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWeekday(date) {
  return date.toLocaleDateString('de-DE', { weekday: 'long' });
}

function updateDayFromDate() {
  if (!dateInput || !dayInput) return;
  const date = parseDate(dateInput.value);
  dayInput.value = date ? formatWeekday(date) : '';
}

function calculateTotals() {
  if (!startInput || !endInput) return;
  const start = startInput.value;
  const end = endInput.value;
  if (!start || !end) return;

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startDate = new Date(0, 0, 0, sh || 0, sm || 0);
  const endDate = new Date(0, 0, 0, eh || 0, em || 0);
  let diff = (endDate - startDate) / (1000 * 60 * 60);

  if (Number.isNaN(diff) || diff <= 0) {
    breakInput.value = '';
    hoursInput.value = '';
    wageInput.value = '';
    return;
  }

  let pause = 0;
  if (diff >= 9) pause = 0.75;
  else if (diff >= 6) pause = 0.5;

  const workingHours = diff - pause;
  breakInput.value = pause === 0 ? '00:00' : pause === 0.5 ? '00:30' : '00:45';
  hoursInput.value = workingHours.toFixed(2);
  wageInput.value = (workingHours * HOURLY_WAGE).toFixed(2);
}

function normaliseNumber(value) {
  if (!value) return 0;
  return Number(String(value).replace(',', '.')) || 0;
}

async function submitShift() {
  const normalisedDate = normaliseDateInputValue(dateInput.value);
  if (normalisedDate) {
    dateInput.value = normalisedDate;
    updateDayFromDate();
  }
  const parsedDate = parseDate(normalisedDate || dateInput.value);
  const tag = parsedDate ? formatWeekday(parsedDate) : '';

  const payload = {
    datum: dateInput.value,
    tag,
    start: startInput.value,
    ende: endInput.value,
    pause: breakInput.value,
    stunden: normaliseNumber(hoursInput.value),
    lohn: Number((normaliseNumber(hoursInput.value) * HOURLY_WAGE).toFixed(2)),
  };

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Fehler ${response.status}`);
    }

    setStatus('Schicht gespeichert.');
    await fetchShifts();
  } catch (error) {
    setStatus(`Fehler beim Speichern: ${error.message}`, true);
  }
}

function ensureDay(entry) {
  if (entry.tag) return entry.tag;
  const date = parseDate(entry.datum || '');
  return date ? formatWeekday(date) : '';
}

function normaliseDateInputValue(value) {
  const parsed = parseDate(value);
  if (!parsed) return '';
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = String(parsed.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

function normaliseApiDate(value) {
  const parsed = parseDate(value);
  if (!parsed) return value || '';
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = String(parsed.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

async function fetchShifts() {
  try {
    const normalisedFilterDate = normaliseDateInputValue(dateInput.value);
    if (normalisedFilterDate) {
      dateInput.value = normalisedFilterDate;
    }
    const query = normalisedFilterDate ? `?datum=${encodeURIComponent(normalisedFilterDate)}` : '';
    const response = await fetch(`${API_BASE}${query}`);
    if (!response.ok) {
      throw new Error(`Fehler ${response.status}`);
    }
    const data = await response.json();
    const list = Array.isArray(data) ? data.map((entry) => ({ ...entry, datum: normaliseApiDate(entry.datum) })) : [];
    renderTable(list);
    updateDayFromDate();
    setStatus('Schichten aktualisiert.');
  } catch (error) {
    setStatus(`Fehler beim Abrufen: ${error.message}`, true);
  }
}

function renderTable(entries) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!entries.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = 'Keine Einträge.';
    row.append(cell);
    tableBody.append(row);
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement('tr');
    const displayDatum = normaliseApiDate(entry.datum);
    const cells = [
      displayDatum,
      ensureDay(entry),
      entry.start,
      entry.ende,
      entry.pause,
      Number(entry.stunden || 0).toFixed(2),
      Number(entry.lohn || 0).toFixed(2),
    ];

    cells.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });

    tableBody.append(row);
  });
}

function bindEvents() {
  dateInput.addEventListener('change', () => {
    updateDayFromDate();
    calculateTotals();
  });
  startInput.addEventListener('change', calculateTotals);
  endInput.addEventListener('change', calculateTotals);
  submitBtn.addEventListener('click', submitShift);
  fetchBtn.addEventListener('click', fetchShifts);
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const normalisedDate = normaliseDateInputValue(dateInput.value);
      if (!normalisedDate) {
        setStatus('Bitte ein gültiges Datum angeben, um Schichten zu löschen.', true);
        return;
      }
      dateInput.value = normalisedDate;
      updateDayFromDate();
      deleteShiftsByDate(normalisedDate);
    });
  }
}

function init() {
  if (initialized) return;

  form = document.querySelector('[data-shift-form]');
  if (!form) return;

  dateInput = form.querySelector('[data-shift-date]');
  dayInput = form.querySelector('[data-shift-day]');
  startInput = form.querySelector('[data-shift-start]');
  endInput = form.querySelector('[data-shift-end]');
  breakInput = form.querySelector('[data-shift-break]');
  hoursInput = form.querySelector('[data-shift-hours]');
  wageInput = form.querySelector('[data-shift-wage]');
  submitBtn = form.querySelector('[data-shift-submit]');
  fetchBtn = form.querySelector('[data-shift-fetch]');
  deleteBtn = form.querySelector('[data-shift-delete]');
  statusNode = document.querySelector('[data-shift-status]');
  tableBody = document.querySelector('[data-shift-table-body]');

  if (!dateInput || !startInput || !endInput || !submitBtn || !fetchBtn || !tableBody) {
    return;
  }

  initialized = true;

  bindEvents();
  updateDayFromDate();
  calculateTotals();
  fetchShifts();
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

document.addEventListener('partials:ready', init);

async function deleteShiftsByDate(date) {
  const normalised = normaliseDateInputValue(date);
  if (!normalised) {
    setStatus('Ungültiges Datum zum Löschen.', true);
    return;
  }
  const query = normalised ? `?datum=${encodeURIComponent(normalised)}` : '';
  try {
    const response = await fetch(`${API_BASE}${query}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Fehler ${response.status}`);
    }

    setStatus('Schichten gelöscht.');
    await fetchShifts();
  } catch (error) {
    setStatus(`Fehler beim Löschen: ${error.message}`, true);
  }
}
