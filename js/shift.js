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

function setStatus(message, isError = false) {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.classList.toggle('shift-status--error', isError);
}

function parseDate(value) {
  const [dd, mm, yy] = value.split('.');
  if (!dd || !mm || !yy) return null;
  const year = yy.length === 2 ? Number(`20${yy}`) : Number(yy);
  return new Date(year, Number(mm) - 1, Number(dd));
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
  const payload = {
    datum: dateInput.value,
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

async function fetchShifts() {
  try {
    const query = dateInput.value ? `?datum=${encodeURIComponent(dateInput.value)}` : '';
    const response = await fetch(`${API_BASE}${query}`);
    if (!response.ok) {
      throw new Error(`Fehler ${response.status}`);
    }
    const data = await response.json();
    renderTable(Array.isArray(data) ? data : []);
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
    const cells = [
      entry.datum,
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
