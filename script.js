const STORAGE_KEY = "calendrier-personnel-v2-events";
const ROTATION_KEY = "calendrier-personnel-v2-rotation";
const THEME_KEY = "calendrier-personnel-v2-theme";

const SHIFT_TIMES = {
  jour: ["06:30", "16:00"],
  soir: ["14:30", "00:00"],
  nuit: ["21:30", "07:00"]
};

let events = load(STORAGE_KEY, []);
let rotation = load(ROTATION_KEY, {
  periods: [],
  vacations: []
});

let currentDate = new Date();
currentDate.setDate(1);
let selectedEventColor = "default";

const $ = id => document.getElementById(id);

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
function parseDate(key) { const [y,m,d] = key.split("-").map(Number); return new Date(y,m-1,d); }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function formatDate(key, options={day:"2-digit",month:"2-digit",year:"numeric"}) {
  return parseDate(key).toLocaleDateString("fr-CH", options);
}
function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function normalPeriodDefaults(start) {
  return {
    id: uid(),
    type: "normal",
    start,
    length: 10,
    shifts: ["jour","soir","nuit","jour","soir","nuit"]
  };
}

function getRotationForDate(key) {
  const date = parseDate(key);

  // Vacances have priority over the rotation background.
  const vacation = rotation.vacations.find(v => key >= v.start && key <= v.end);
  if (vacation) return { type: "vacation", label: "Vacances" };

  const periods = [...rotation.periods].sort((a,b) => a.start.localeCompare(b.start));
  let active = null;
  for (const p of periods) {
    if (p.start <= key) active = p;
    else break;
  }
  if (!active) return null;

  const start = parseDate(active.start);
  const diff = Math.floor((date - start) / 86400000);
  if (diff < 0) return null;

  if (active.type === "normal") {
    const cycleIndex = diff % 10;
    if (cycleIndex < 6) {
      const shift = active.shifts?.[cycleIndex] || "jour";
      return {
        type: "service",
        shift,
        label: shiftLabel(shift),
        start: SHIFT_TIMES[shift][0],
        end: SHIFT_TIMES[shift][1]
      };
    }
    return { type: "rest", label: "Repos" };
  }

  if (active.type === "polyvalent") {
    const len = Number(active.length) || 8;
    const cycleIndex = diff % len;
    const leave = (active.leaveDays || []).includes(cycleIndex);
    if (leave) return { type: "vacation", label: "Congé" };
    const shift = active.shifts?.[cycleIndex] || "jour";
    return {
      type: "service",
      shift,
      label: shiftLabel(shift),
      start: SHIFT_TIMES[shift][0],
      end: SHIFT_TIMES[shift][1]
    };
  }

  return null;
}

function shiftLabel(shift) {
  return shift === "jour" ? "Service de jour" :
         shift === "soir" ? "Service du soir" :
         "Service de nuit";
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  $("monthTitle").textContent = currentDate.toLocaleDateString("fr-CH", {month:"long", year:"numeric"});

  const first = new Date(year, month, 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = addDays(first, -mondayIndex);

  const grid = $("calendarGrid");
  grid.innerHTML = "";

  let activeDays = 0;
  let serviceDays = 0;
  let restDays = 0;
  let vacationDays = 0;

  for (let i=0; i<42; i++) {
    const date = addDays(start, i);
    const key = dateKey(date);
    const info = getRotationForDate(key);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (date.getMonth() !== month) cell.classList.add("other-month");
    if (key === dateKey(new Date())) cell.classList.add("today");

    if (info) {
      activeDays++;
      if (info.type === "service") { serviceDays++; cell.classList.add("service-day"); }
      if (info.type === "rest") { restDays++; cell.classList.add("rest-day"); }
      if (info.type === "vacation") { vacationDays++; cell.classList.add("vacation-day"); }
    }

    cell.addEventListener("dblclick", () => openEventModal(key));

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = date.getDate();
    cell.appendChild(num);

    if (info?.type === "service") {
      const service = document.createElement("div");
      service.className = "service-info";
      service.innerHTML = `<div class="service-label">${info.label}</div><div class="service-time">${info.start} – ${info.end}</div>`;
      cell.appendChild(service);
    } else if (info?.type === "rest") {
      const rest = document.createElement("div");
      rest.className = "rest-label";
      rest.textContent = "REPOS";
      cell.appendChild(rest);
    } else if (info?.type === "vacation") {
      const vac = document.createElement("div");
      vac.className = "vacation-label";
      vac.textContent = info.label.toUpperCase();
      cell.appendChild(vac);
    }

    const dayEvents = events.filter(e => e.date === key).sort((a,b) => (a.start || "").localeCompare(b.start || ""));
    const stack = document.createElement("div");
    stack.className = "event-stack";
    dayEvents.slice(0, 3).forEach(event => {
      const chip = document.createElement("div");
      chip.className = `event-chip ${event.color || "default"}`;
      chip.innerHTML = `<div class="event-chip-title">${escapeHtml(event.title)}</div>
        ${event.start || event.end ? `<div class="event-chip-time">${event.start || ""}${event.end ? " – " + event.end : ""}</div>` : ""}`;
      chip.addEventListener("click", e => { e.stopPropagation(); openEventModal(key, event.id); });
      stack.appendChild(chip);
    });
    if (dayEvents.length > 3) {
      const more = document.createElement("div");
      more.className = "empty-event";
      more.textContent = `+ ${dayEvents.length - 3} autre(s)`;
      stack.appendChild(more);
    }
    cell.appendChild(stack);
    grid.appendChild(cell);
  }

  if (activeDays) {
    $("rotationSummary").textContent = `${serviceDays} services · ${restDays} repos · ${vacationDays} congés/vacances`;
  } else {
    $("rotationSummary").textContent = "";
  }
}

function openEventModal(dateKeyValue = dateKey(new Date()), id = null) {
  const event = id ? events.find(e => e.id === id) : null;
  $("eventModalTitle").textContent = event ? "Modifier l'événement" : "Nouvel événement";
  $("eventId").value = event?.id || "";
  $("eventTitle").value = event?.title || "";
  $("eventDate").value = event?.date || dateKeyValue;
  $("eventStart").value = event?.start || "";
  $("eventEnd").value = event?.end || "";
  $("eventCategory").value = event?.category || "Personnel";
  $("eventDescription").value = event?.description || "";
  selectedEventColor = event?.color || "default";
  updateColorSelection();
  $("deleteEventBtn").classList.toggle("hidden", !event);
  $("eventModal").classList.remove("hidden");
  $("eventTitle").focus();
}

function closeEventModal() { $("eventModal").classList.add("hidden"); }

$("eventForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("eventId").value;
  const data = {
    id: id || uid(),
    title: $("eventTitle").value.trim(),
    date: $("eventDate").value,
    start: $("eventStart").value,
    end: $("eventEnd").value,
    category: $("eventCategory").value,
    description: $("eventDescription").value.trim(),
    color: selectedEventColor
  };
  if (!data.title || !data.date) return;
  if (id) events = events.map(e => e.id === id ? data : e);
  else events.push(data);
  save(STORAGE_KEY, events);
  closeEventModal();
  renderAll();
});

$("deleteEventBtn").addEventListener("click", () => {
  const id = $("eventId").value;
  if (!id) return;
  events = events.filter(e => e.id !== id);
  save(STORAGE_KEY, events);
  closeEventModal();
  renderAll();
});

$("cancelEventBtn").addEventListener("click", closeEventModal);
$("closeEventModal").addEventListener("click", closeEventModal);
$("eventModal").querySelector(".modal-backdrop").addEventListener("click", closeEventModal);

document.querySelectorAll(".color-choice").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedEventColor = btn.dataset.color;
    updateColorSelection();
  });
});
function updateColorSelection() {
  document.querySelectorAll(".color-choice").forEach(b => b.classList.toggle("selected", b.dataset.color === selectedEventColor));
}

function renderUpcoming() {
  const nowKey = dateKey(new Date());
  const list = [...events].filter(e => e.date >= nowKey).sort((a,b) =>
    `${a.date}${a.start || ""}`.localeCompare(`${b.date}${b.start || ""}`)
  ).slice(0, 10);

  $("upcomingList").innerHTML = list.length ? "" : `<div class="list-item"><div class="list-item-meta">Aucun événement à venir.</div></div>`;
  list.forEach(e => {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `<div class="list-item-main">
      <div class="list-item-title">${escapeHtml(e.title)}</div>
      <div class="list-item-meta">${formatDate(e.date, {weekday:"short", day:"2-digit", month:"long"})}${e.start ? " · " + e.start + (e.end ? "–" + e.end : "") : ""} · ${escapeHtml(e.category)}</div>
      ${e.description ? `<div class="list-item-desc">${escapeHtml(e.description)}</div>` : ""}
    </div>
    <button class="list-item-action">Modifier</button>`;
    row.querySelector("button").addEventListener("click", () => openEventModal(e.date, e.id));
    $("upcomingList").appendChild(row);
  });
}

function renderSearch() {
  const q = $("searchInput").value.trim().toLowerCase();
  if (!q) { $("searchResults").innerHTML = ""; return; }
  const results = events.filter(e => `${e.title} ${e.category} ${e.description}`.toLowerCase().includes(q))
    .sort((a,b) => a.date.localeCompare(b.date)).slice(0,20);
  $("searchResults").innerHTML = results.length ? "" : `<div class="list-item"><div class="list-item-meta">Aucun résultat.</div></div>`;
  results.forEach(e => {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `<div class="list-item-main"><div class="list-item-title">${escapeHtml(e.title)}</div><div class="list-item-meta">${formatDate(e.date)} · ${escapeHtml(e.category)}</div></div>`;
    row.addEventListener("click", () => openEventModal(e.date, e.id));
    $("searchResults").appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

// Rotation UI
function openRotationModal() {
  renderRotationEditor();
  $("rotationModal").classList.remove("hidden");
}
function closeRotationModal() { $("rotationModal").classList.add("hidden"); }

$("rotationBtn").addEventListener("click", openRotationModal);
$("closeRotationModal").addEventListener("click", closeRotationModal);
$("cancelRotationBtn").addEventListener("click", closeRotationModal);
$("rotationModal").querySelector(".modal-backdrop").addEventListener("click", closeRotationModal);

$("addPeriodBtn").addEventListener("click", () => {
  rotation.periods.push(normalPeriodDefaults(dateKey(new Date())));
  renderRotationEditor();
});

$("addVacationBtn").addEventListener("click", () => {
  rotation.vacations.push({id:uid(), start:dateKey(new Date()), end:dateKey(new Date())});
  renderRotationEditor();
});

function renderRotationEditor() {
  const container = $("periodsList");
  container.innerHTML = "";

  rotation.periods.forEach((p, index) => {
    const card = document.createElement("div");
    card.className = "period-card";

    const typeOptions = `<option value="normal" ${p.type==="normal"?"selected":""}>Rotation 6 travail / 4 repos</option>
      <option value="polyvalent" ${p.type==="polyvalent"?"selected":""}>Service polyvalent</option>`;

    card.innerHTML = `<div class="period-head">
      <label class="field-label">Début<input class="period-start" type="date" value="${p.start}"></label>
      <label class="field-label">Type<select class="period-type">${typeOptions}</select></label>
      <label class="field-label">${p.type==="polyvalent" ? "Durée" : "Cycle"}<input disabled value="${p.type==="polyvalent" ? "8 jours · 5 travail / 3 congé" : "10 jours · 6 travail / 4 repos"}></label>
      <button class="period-delete" title="Supprimer">×</button>
    </div>`;

    const days = document.createElement("div");
    days.className = "rotation-days";

    if (p.type === "normal") {
      for (let i=0;i<6;i++) {
        const box = document.createElement("div");
        box.className = "rotation-day";
        box.innerHTML = `<span class="field-label">Jour ${i+1}</span>
          <select class="shift-select">
            <option value="jour" ${p.shifts?.[i]==="jour"?"selected":""}>Jour · 06:30–16:00</option>
            <option value="soir" ${p.shifts?.[i]==="soir"?"selected":""}>Soir · 14:30–00:00</option>
            <option value="nuit" ${p.shifts?.[i]==="nuit"?"selected":""}>Nuit · 21:30–07:00</option>
          </select>`;
        box.querySelector("select").addEventListener("change", e => p.shifts[i] = e.target.value);
        days.appendChild(box);
      }
    } else {
      for (let i=0;i<8;i++) {
        const box = document.createElement("div");
        box.className = "rotation-day";
        const isLeave = (p.leaveDays || []).includes(i);
        box.innerHTML = `<span class="field-label">Jour ${i+1}</span>
          <select class="poly-status">
            <option value="work" ${!isLeave?"selected":""}>Travail</option>
            <option value="leave" ${isLeave?"selected":""}>Congé</option>
          </select>`;
        box.querySelector("select").addEventListener("change", e => {
          p.leaveDays = p.leaveDays || [];
          if (e.target.value === "leave" && !p.leaveDays.includes(i)) p.leaveDays.push(i);
          if (e.target.value === "work") p.leaveDays = p.leaveDays.filter(x => x !== i);
          if (e.target.value === "leave") p.shifts = p.shifts || [];
          renderRotationEditor();
        });
        if (!isLeave) {
          const shift = document.createElement("select");
          shift.innerHTML = `<option value="jour" ${p.shifts?.[i]==="jour"?"selected":""}>Jour</option>
            <option value="soir" ${p.shifts?.[i]==="soir"?"selected":""}>Soir</option>
            <option value="nuit" ${p.shifts?.[i]==="nuit"?"selected":""}>Nuit</option>`;
          shift.addEventListener("change", e => p.shifts[i] = e.target.value);
          box.appendChild(shift);
        }
        days.appendChild(box);
      }
    }

    card.appendChild(days);
    card.querySelector(".period-start").addEventListener("change", e => p.start = e.target.value);
    card.querySelector(".period-type").addEventListener("change", e => {
      p.type = e.target.value;
      if (p.type === "normal") {
        p.shifts = ["jour","soir","nuit","jour","soir","nuit"];
        delete p.leaveDays;
      } else {
        p.shifts = ["jour","jour","soir","soir","nuit","jour","jour","soir"];
        p.leaveDays = [5,6,7];
      }
      renderRotationEditor();
    });
    card.querySelector(".period-delete").addEventListener("click", () => {
      rotation.periods.splice(index, 1);
      renderRotationEditor();
    });
    container.appendChild(card);
  });

  const vac = $("vacationsList");
  vac.innerHTML = rotation.vacations.length ? "" : `<div class="list-item"><div class="list-item-meta">Aucune période de vacances configurée.</div></div>`;
  rotation.vacations.forEach((v,index) => {
    const row = document.createElement("div");
    row.className = "vacation-row";
    row.innerHTML = `<label class="field-label">Du<input type="date" value="${v.start}"></label>
      <label class="field-label">Au<input type="date" value="${v.end}"></label>
      <button class="vacation-delete">×</button>`;
    row.querySelectorAll("input")[0].addEventListener("change", e => v.start = e.target.value);
    row.querySelectorAll("input")[1].addEventListener("change", e => v.end = e.target.value);
    row.querySelector("button").addEventListener("click", () => { rotation.vacations.splice(index,1); renderRotationEditor(); });
    vac.appendChild(row);
  });
}

$("saveRotationBtn").addEventListener("click", () => {
  rotation.periods.sort((a,b) => a.start.localeCompare(b.start));
  save(ROTATION_KEY, rotation);
  closeRotationModal();
  renderAll();
});

$("prevMonth").addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(); });
$("nextMonth").addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(); });
$("todayBtn").addEventListener("click", () => { currentDate = new Date(); currentDate.setDate(1); renderCalendar(); });
$("addEventBtn").addEventListener("click", () => openEventModal());

$("searchInput").addEventListener("input", renderSearch);
$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  save(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
});
if (load(THEME_KEY, "light") === "dark") document.body.classList.add("dark");

function renderAll() {
  renderCalendar();
  renderUpcoming();
  renderSearch();
}

renderAll();
