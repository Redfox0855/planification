const STORAGE_KEY = "calendrier-personnel-v1-events";
const THEME_KEY = "calendrier-personnel-v1-theme";

let events = loadEvents();
let currentDate = new Date();
currentDate.setDate(1);
let selectedColor = "default";

const monthName = document.getElementById("monthName");
const yearName = document.getElementById("yearName");
const calendarGrid = document.getElementById("calendarGrid");
const upcomingEvents = document.getElementById("upcomingEvents");
const searchResults = document.getElementById("searchResults");
const searchInput = document.getElementById("searchInput");

const modalBackdrop = document.getElementById("modalBackdrop");
const eventForm = document.getElementById("eventForm");
const modalTitle = document.getElementById("modalTitle");
const eventId = document.getElementById("eventId");
const eventTitle = document.getElementById("eventTitle");
const eventDate = document.getElementById("eventDate");
const eventStart = document.getElementById("eventStart");
const eventEnd = document.getElementById("eventEnd");
const eventCategory = document.getElementById("eventCategory");
const eventDescription = document.getElementById("eventDescription");
const deleteEventBtn = document.getElementById("deleteEventBtn");

const months = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  document.getElementById("storageStatus").textContent = `${events.length} événement${events.length > 1 ? "s" : ""} enregistré${events.length > 1 ? "s" : ""} localement`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLongDate(key) {
  return parseDate(key).toLocaleDateString("fr-CH", {
    weekday: "long", day: "numeric", month: "long"
  });
}

function formatShortDate(key) {
  return parseDate(key).toLocaleDateString("fr-CH", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}

function renderCalendar() {
  monthName.textContent = months[currentDate.getMonth()];
  yearName.textContent = currentDate.getFullYear();

  calendarGrid.innerHTML = "";

  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const previousMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();

  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const todayKey = dateKey(new Date());

  for (let i = 0; i < totalCells; i++) {
    const day = i - offset + 1;
    let cellDate;
    let isOtherMonth = false;

    if (day < 1) {
      cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, previousMonthDays + day);
      isOtherMonth = true;
    } else if (day > daysInMonth) {
      cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day - daysInMonth);
      isOtherMonth = true;
    } else {
      cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    }

    const key = dateKey(cellDate);
    const cell = document.createElement("div");
    cell.className = "day";
    if (isOtherMonth) cell.classList.add("other-month");
    if (key === todayKey) cell.classList.add("today");

    const header = document.createElement("div");
    header.className = "day-header";

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = cellDate.getDate();

    header.appendChild(number);
    cell.appendChild(header);

    const dayEvents = events
      .filter(e => e.date === key)
      .sort((a, b) => (a.start || "99:99").localeCompare(b.start || "99:99"));

    dayEvents.forEach(e => {
      const btn = document.createElement("button");
      btn.className = `event ${e.color || "default"}`;
      btn.type = "button";
      btn.innerHTML = `
        <div class="event-time">${escapeHtml(eventTime(e))}</div>
        <div class="event-title">${escapeHtml(e.title)}</div>
      `;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openModal(e.id);
      });
      cell.appendChild(btn);
    });

    cell.addEventListener("click", () => openModal(null, key));
    calendarGrid.appendChild(cell);
  }
}

function eventTime(e) {
  if (!e.start && !e.end) return "Toute la journée";
  if (e.start && e.end) return `${e.start} – ${e.end}`;
  return e.start || e.end;
}

function renderUpcoming() {
  const today = dateKey(new Date());
  const upcoming = [...events]
    .filter(e => e.date >= today)
    .sort((a, b) => {
      const da = `${a.date} ${a.start || "99:99"}`;
      const db = `${b.date} ${b.start || "99:99"}`;
      return da.localeCompare(db);
    })
    .slice(0, 8);

  upcomingEvents.innerHTML = "";

  if (!upcoming.length) {
    upcomingEvents.innerHTML = `<div class="empty">Aucun événement à venir.</div>`;
    return;
  }

  upcoming.forEach(e => upcomingEvents.appendChild(createListEvent(e)));
}

function createListEvent(e) {
  const item = document.createElement("div");
  item.className = "list-event";
  item.innerHTML = `
    <div>
      <div class="list-date">${escapeHtml(formatShortDate(e.date))}</div>
      <div class="list-time">${escapeHtml(eventTime(e))}</div>
    </div>
    <div>
      <div class="list-title">${escapeHtml(e.title)}</div>
      <div class="list-description">${escapeHtml(e.description || "")}</div>
    </div>
    <div class="list-category">${escapeHtml(e.category || "Autre")}</div>
  `;
  item.addEventListener("click", () => openModal(e.id));
  return item;
}

function renderSearch() {
  const q = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!q) {
    searchResults.innerHTML = `<div class="empty">Saisis un mot-clé pour rechercher.</div>`;
    return;
  }

  const found = events
    .filter(e => [e.title, e.description, e.category, e.date].join(" ").toLowerCase().includes(q))
    .sort((a, b) => `${a.date}${a.start || ""}`.localeCompare(`${b.date}${b.start || ""}`))
    .slice(0, 12);

  if (!found.length) {
    searchResults.innerHTML = `<div class="empty">Aucun résultat.</div>`;
    return;
  }

  found.forEach(e => searchResults.appendChild(createListEvent(e)));
}

function openModal(id = null, presetDate = null) {
  eventForm.reset();
  selectedColor = "default";
  updateColorSelection();

  if (id) {
    const e = events.find(item => item.id === id);
    if (!e) return;

    modalTitle.textContent = "Modifier l'événement";
    eventId.value = e.id;
    eventTitle.value = e.title;
    eventDate.value = e.date;
    eventStart.value = e.start || "";
    eventEnd.value = e.end || "";
    eventCategory.value = e.category || "Autre";
    eventDescription.value = e.description || "";
    selectedColor = e.color || "default";
    deleteEventBtn.classList.remove("hidden");
    updateColorSelection();
  } else {
    modalTitle.textContent = "Nouvel événement";
    eventId.value = "";
    eventDate.value = presetDate || dateKey(new Date());
    deleteEventBtn.classList.add("hidden");
  }

  modalBackdrop.classList.remove("hidden");
  setTimeout(() => eventTitle.focus(), 30);
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
}

function updateColorSelection() {
  document.querySelectorAll(".color-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.color === selectedColor);
  });
}

eventForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    id: eventId.value || crypto.randomUUID(),
    title: eventTitle.value.trim(),
    date: eventDate.value,
    start: eventStart.value,
    end: eventEnd.value,
    category: eventCategory.value,
    description: eventDescription.value.trim(),
    color: selectedColor
  };

  if (!data.title || !data.date) return;

  const existingIndex = events.findIndex(item => item.id === data.id);

  if (existingIndex >= 0) {
    events[existingIndex] = data;
  } else {
    events.push(data);
  }

  saveEvents();
  renderAll();
  closeModal();
});

deleteEventBtn.addEventListener("click", () => {
  const id = eventId.value;
  if (!id) return;

  const e = events.find(item => item.id === id);
  if (!e) return;

  if (confirm(`Supprimer « ${e.title} » ?`)) {
    events = events.filter(item => item.id !== id);
    saveEvents();
    renderAll();
    closeModal();
  }
});

document.getElementById("addEventBtn").addEventListener("click", () => openModal());
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

document.querySelectorAll(".color-option").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedColor = btn.dataset.color;
    updateColorSelection();
  });
});

document.getElementById("prevMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  currentDate = new Date();
  currentDate.setDate(1);
  renderCalendar();
});

searchInput.addEventListener("input", renderSearch);

document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  document.getElementById("themeBtn").textContent = dark ? "☀" : "☾";
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAll() {
  renderCalendar();
  renderUpcoming();
  renderSearch();
}

(function init() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    document.getElementById("themeBtn").textContent = "☀";
  }
  saveEvents();
  renderAll();
})();
