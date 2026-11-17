const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const uid = () => crypto.randomUUID();
const paths = {
  sun: "M12 3v1m0 16v1M3 12h1m16 0h1M5.6 5.6l.7.7m11.4 11.4.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z",
  calendar:
    "M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1M8 14h2m4 0h2m-8 3h2",
  checklist:
    "m4 6 1.5 1.5L8 5m3 1h9M4 12l1.5 1.5L8 11m3 1h9M4 18l1.5 1.5L8 17m3 1h9",
  note: "M5 3h14v13l-5 5H5ZM14 21v-5h5M8 8h8M8 12h6",
  palette:
    "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.5 1.5 0 0 1 .8-2.8H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3ZM7 10h.01M10 6h.01M15 6h.01M18 10h.01",
  moon: "M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z",
  settings:
    "m9 3-.5 3L6 7l-2.5-1-2 3 2 2v2l-2 2 2 3L6 17l2.5 1L9 21h6l.5-3 2.5-1 2.5 1 2-3-2-2v-2l2-2-2-3L18 7l-2.5-1L15 3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  board: "M3 4h18v16H3ZM9 4v16M15 4v16",
  edit: "m15 4 5 5M4 20l1-6L16 3a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3L10 19Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  check: "m5 12 4 4L19 6",
  pin: "m9 3 6 0-1 6 4 4H6l4-4ZM12 13v8",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  grip: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
  folder: "M3 6h7l2 2h9v12H3ZM3 6V4h7l2 2",
  close: "m6 6 12 12M18 6 6 18",
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.note}"/></svg>`;
}
$$("[data-icon]").forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
const STORAGE_KEY = "workspace-v1";
const LAYOUT_KEY = "workspace-layout";
const VIEW_KEY = "workspace-active-view";
const todayKey = () => new Date().toLocaleDateString("en-CA");
const natureWallpaper = new NatureWallpaper(() => applyAppearance());
function effectiveWallpaper() {
  return natureWallpaper.current || state.wallpaper || "";
}
function useManualBackground() {
  state.autoNature = false;
  natureWallpaper.sync(false, state.natureQuality);
}
const noteBackground = new NoteBackgroundEditor($, encodeBackground);
const fontFamilies = {
  "google-sans": '"Google Sans", sans-serif',
  arial: "Arial, sans-serif",
  helvetica: "Helvetica, Arial, sans-serif",
  verdana: "Verdana, sans-serif",
  tahoma: "Tahoma, sans-serif",
  "trebuchet-ms": '"Trebuchet MS", sans-serif',
  georgia: "Georgia, serif",
  "times-new-roman": '"Times New Roman", serif',
  garamond: "Garamond, serif",
  "palatino-linotype": '"Palatino Linotype", "Book Antiqua", serif',
  "courier-new": '"Courier New", monospace',
  consolas: "Consolas, monospace",
  "system-ui": "system-ui, sans-serif",
  monospace: "monospace",
};
const seed = {
  tasks: [],
  notes: [],
  lists: [
    { id: "work", name: "Work" },
    { id: "personal", name: "Personal" },
  ],
  theme: "light",
  bg: "linen",
  brightness: 85,
  radius: 16,
  fontSize: 15,
  fontFamily: "google-sans",
  blur: 0,
  overlay: 0,
  pattern: "none",
  fit: "cover",
  position: "center",
  backgroundColor: "#f7f5ef",
};
let state;
try {
  const savedState = localStorage.getItem(STORAGE_KEY);
  state = JSON.parse(savedState) || structuredClone(seed);
} catch {
  state = structuredClone(seed);
}
state.lists ||= structuredClone(seed.lists);
state.brightness ||= 85;
state.fontSize ??= 15;
state.fontFamily ??= "google-sans";
// Upgrade existing workspaces without replacing their tasks or notes.
state.tasks.forEach((t) => {
  t.steps ||= [];
  if (t.myDay === undefined) t.myDay = t.status !== "done" ? todayKey() : null;
  t.list ||= "";
});
function isValidView(candidate) {
  return (
    ["all", "important", "reminders", "tasks", "notes"].includes(candidate) ||
    (typeof candidate === "string" &&
      candidate.startsWith("list:") &&
      state.lists.some((list) => list.id === candidate.slice(5)))
  );
}
function restoreView() {
  try {
    const savedView = localStorage.getItem(VIEW_KEY);
    return isValidView(savedView) ? savedView : "all";
  } catch {
    $("#save-status").textContent = "Could not restore the last view";
    return "all";
  }
}
let view = restoreView(),
  query = "",
  editing = null,
  kind = "task",
  dragging = null,
  filter = "active",
  layout = localStorage.getItem(LAYOUT_KEY) || "list",
  sort = "manual",
  draftSteps = [],
  undoAction = null,
  taskCompleteAudio = null;
function selectView(nextView) {
  view = nextView;
  try {
    localStorage.setItem(VIEW_KEY, nextView);
  } catch {
    $("#save-status").textContent = "Could not save the selected view";
  }
}
function playTaskCompleteSound() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  try {
    const ctx = taskCompleteAudio || new AudioCtor();
    taskCompleteAudio = ctx;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    const oscillator = ctx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(620, now);
    oscillator.frequency.exponentialRampToValueAtTime(860, now + 0.18);
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch {
    // Ignore unsupported browsers or autoplay restrictions.
  }
}
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function toast(message, undo) {
  $("#toast-message").textContent = message;
  undoAction = undo || null;
  $("#undo").hidden = !undo;
  $("#toast").classList.toggle("has-undo", !!undo);
  $("#toast").classList.add("show");
  clearTimeout(window.tt);
  window.tt = setTimeout(
    () => $("#toast").classList.remove("show"),
    undo ? 8000 : 4500,
  );
}
$("#undo").onclick = () => {
  if (undoAction) {
    undoAction();
    undoAction = null;
    save();
    render();
    $("#toast").classList.remove("show");
  }
};
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("#save-status").textContent = "All changes saved";
    return true;
  } catch {
    $("#save-status").textContent = "Could not save changes";
    toast("Device storage is full. Export a backup before closing.");
    return false;
  }
}
function applyAppearance() {
  natureWallpaper.sync(state.autoNature, state.natureQuality);
  document.body.classList.toggle("dark", state.theme === "dark");
  document.body.dataset.bg = state.bg;
  document.body.classList.toggle("custom-bg", !!effectiveWallpaper());
  const image = effectiveWallpaper() ? `url("${effectiveWallpaper()}")` : "";
  $("#wallpaper").style.backgroundImage = image;
  $("#wallpaper").style.filter = `brightness(${state.brightness / 100})`;
  $("#bg-preview").style.backgroundImage = image;
  $("#bg-preview").dataset.bg = state.bg;
  $("#bg-preview span").textContent = effectiveWallpaper()
    ? "Your image"
    : "Background preview";
  $("#bg-brightness").value = state.brightness;
  $$("[data-theme]").forEach((b) =>
    b.classList.toggle("selected", b.dataset.theme === state.theme),
  );
  $$("[data-bg]").forEach((b) =>
    b.classList.toggle(
      "selected",
      b.dataset.bg === state.bg && !effectiveWallpaper(),
    ),
  );
  $("#theme").innerHTML = icon(state.theme === "dark" ? "sun" : "moon");
  applyWorkspaceControls();
}
function dateLabel(t) {
  if (!t.date) return "";
  const d = new Date(t.date),
    today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const label =
    +day === +today
      ? "Today"
      : +day === +tomorrow
        ? "Tomorrow"
        : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `<span class="due ${d < today && t.status !== "done" ? "overdue" : ""}">${icon("calendar")}${label}</span>`;
}
function listName(id) {
  return state.lists.find((l) => l.id === id)?.name || "";
}
function inView(t) {
  if (query) return true;
  if (view === "all") return t.myDay === todayKey();
  if (view === "important") return t.priority === "High";
  if (view.startsWith("list:")) return t.list === view.slice(5);
  return true;
}
function matching(x) {
  return (x.title + " " + (x.body || "")).toLowerCase().includes(query);
}
function sorted(tasks) {
  return [...tasks].sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : sort === "date"
        ? (a.date ? new Date(a.date).getTime() : Infinity) -
          (b.date ? new Date(b.date).getTime() : Infinity)
        : sort === "priority"
          ? Number(b.priority === "High") - Number(a.priority === "High")
          : 0,
  );
}
function taskCard(t) {
  const done = t.status === "done",
    steps = t.steps || [];
  return `<article class="task ${done ? "completed" : ""}" draggable="true" data-id="${t.id}"><button class="drag-handle" data-move-task="${t.id}" aria-label="Reorder task. Use arrow keys to move." title="Drag to reorder, or use arrow keys">${icon("grip")}</button><button class="complete ${done ? "checked" : ""}" data-complete="${t.id}" aria-label="${done ? "Reopen" : "Complete"} ${esc(t.title)}">${done ? icon("check") : ""}</button><button class="task-main" data-edit="${t.id}"><span class="task-title">${esc(t.title)}</span><span class="task-meta">${t.list ? `<span>${esc(listName(t.list))}</span>` : ""}${dateLabel(t)}${steps.length ? `<span>${icon("checklist")}${steps.filter((s) => s.done).length}/${steps.length}</span>` : ""}${t.body ? `<span class="has-detail">${icon("note")}</span>` : ""}${t.status === "progress" ? '<span class="progress-label">In progress</span>' : ""}</span></button><button class="star-button ${t.priority === "High" ? "starred" : ""}" data-star="${t.id}" aria-label="${t.priority === "High" ? "Remove importance" : "Mark important"}">${icon("star")}</button></article>`;
}
function render() {
  const positions = DragMotion.capture();
  applyAppearance();
  const active = state.tasks.filter((t) => t.status !== "done");
  $("#task-count").textContent = active.length;
  $("#day-count").textContent = active.filter(
    (t) => t.myDay === todayKey(),
  ).length;
  $("#important-count").textContent = active.filter(
    (t) => t.priority === "High",
  ).length;
  $("#planned-count").textContent = active.filter((t) => t.date).length;
  $("#note-count").textContent = state.notes.length;
  const names = {
      all: "My Day",
      important: "Important",
      tasks: "All tasks",
      notes: "Notes",
      reminders: "Planned",
    },
    name = view.startsWith("list:") ? listName(view.slice(5)) : names[view];
  $("#mobile-lists").innerHTML =
    '<option value="">My lists</option>' +
    state.lists
      .map((l) => `<option value="${l.id}">${esc(l.name)}</option>`)
      .join("") +
    '<option value="__new">+ New list</option>';
  $("#mobile-lists").value = view.startsWith("list:") ? view.slice(5) : "";
  $("#page-heading").textContent = query ? "Search results" : name;
  $$("nav [data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  $("#list-nav").innerHTML = state.lists
    .map(
      (l) =>
        `<button data-view="list:${l.id}" class="${view === "list:" + l.id ? "active" : ""}">${icon("list")}<span>${esc(l.name)}</span><b>${active.filter((t) => t.list === l.id).length}</b></button>`,
    )
    .join("");
  const tasks = state.tasks.filter((t) => inView(t) && matching(t)),
    shown = sorted(
      tasks.filter((t) =>
        filter === "done" ? t.status === "done" : t.status !== "done",
      ),
    );
  $("#active-count").textContent = tasks.filter(
    (t) => t.status !== "done",
  ).length;
  $("#done-stat").textContent = tasks.filter((t) => t.status === "done").length;
  $$("[data-filter]").forEach((b) =>
    b.classList.toggle("selected", b.dataset.filter === filter),
  );
  $("#list-layout").classList.toggle("selected", layout === "list");
  $("#board-layout").classList.toggle("selected", layout === "board");
  $("#board").className = layout === "board" ? "board" : "task-list";
  const completedCount = tasks.filter((t) => t.status === "done").length;
  $("#clear-completed").hidden =
    !completedCount || (filter !== "done" && layout !== "board");
  $("#clear-completed").textContent = `Clear completed (${completedCount})`;
  const empty = `<div class="empty-state">${icon(filter === "done" ? "check" : "sun")}<h3>${query ? "No matching tasks" : filter === "done" ? "Completed tasks appear here" : view === "all" ? "No tasks for today" : "No tasks here yet"}</h3><p>${query ? "Try a different search." : view === "all" ? "Add a task above, or open All tasks to choose one for today." : "Add your first task using the field above."}</p></div>`;
  $("#board").innerHTML =
    layout === "board"
      ? ["todo", "progress", "done"]
          .map(
            (status, i) =>
              `<div class="column ${status}" data-status="${status}"><div class="column-heading"><span class="status-dot"></span>${["To do", "In progress", "Completed"][i]}<small>${tasks.filter((t) => t.status === status).length}</small><button data-add="${status}" aria-label="Add task">+</button></div>${sorted(
                tasks.filter((t) => t.status === status),
              )
                .map(taskCard)
                .join(
                  "",
                )}<button class="add-inline" data-add="${status}">+ Add task</button></div>`,
          )
          .join("")
      : shown.length
        ? shown.map(taskCard).join("")
        : empty;
  const notes = [...state.notes]
    .filter(matching)
    .sort((a, b) => Number(b.pin) - Number(a.pin));
  $("#notes").innerHTML =
    notes.map(renderNote).join("") ||
    `<div class="empty-notes">${icon("note")}<p>Your notes will appear here.</p></div>`;
  applyNoteBackgrounds();
  const planned = sorted(
    state.tasks.filter((t) => t.date && t.status !== "done" && matching(t)),
  ).sort((a, b) => new Date(a.date) - new Date(b.date));
  renderPlanned(planned);
  $(".content").dataset.layout = !query && view === "all" ? "split" : "single";
  $("#tasks-section").hidden = !query && ["notes", "reminders"].includes(view);
  $("#notes-section").hidden = !query && !["all", "notes"].includes(view);
  $("#reminders-section").hidden = !!query || view !== "reminders";
  $("#new-task").hidden = view === "notes";
  updateSearchFeedback();
  DragMotion.settle(positions);
}
function renderSteps() {
  $("#steps-list").innerHTML = draftSteps
    .map(
      (s, i) =>
        `<div class="step-row"><input type="checkbox" data-step="${i}" ${s.done ? "checked" : ""} aria-label="Complete step"><span class="${s.done ? "struck" : ""}">${esc(s.title)}</span><button type="button" data-remove-step="${i}" aria-label="Remove step">${icon("close")}</button></div>`,
    )
    .join("");
}
function openEditor(type, id, status = "todo") {
  kind = type;
  editing = id || null;
  const item = id
    ? (type === "task" ? state.tasks : state.notes).find((x) => x.id === id)
    : {};
  if (!item) return;
  $("#modal-title").textContent = (id ? "Edit " : "New ") + type;
  $("#title-input").value = item.title || "";
  $("#body-input").value = item.body || "";
  $("#task-fields").hidden = type !== "task";
  $("#note-fields").hidden = type !== "note";
  $("#status-input").value = item.status || status;
  $("#priority-input").value = item.priority || "Normal";
  $("#date-input").value = item.date || "";
  $("#list-input").innerHTML =
    '<option value="">No list</option>' +
    state.lists
      .map((l) => `<option value="${l.id}">${esc(l.name)}</option>`)
      .join("");
  $("#list-input").value =
    item.list || (view.startsWith("list:") ? view.slice(5) : "");
  $("#myday-input").checked = id ? item.myDay === todayKey() : view === "all";
  $("#color-input").value = item.color || "paper";
  $("#task-steps").hidden = type !== "task";
  noteBackground.reset(item);
  $("#pin-input").checked = !!item.pin;
  $("#checklist-input").checked = !!item.checklist;
  draftSteps = structuredClone(item.steps || []);
  renderSteps();
  $("#step-input").value = "";
  $("#delete-item").hidden = !id;
  $("#duplicate-item").hidden = !id;
  $("#task-calendar").hidden = type !== "task" || !item.date;
  $("#editor").showModal();
  $("#title-input").focus();
}
function addStep() {
  const title = $("#step-input").value.trim();
  if (!title) return;
  draftSteps.push({ title, done: false });
  $("#step-input").value = "";
  renderSteps();
  $("#step-input").focus();
}
$("#add-step").onclick = addStep;
$("#step-input").onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addStep();
  }
};
$("#edit-form").onsubmit = (e) => {
  e.preventDefault();
  if (noteBackground.busy) return;
  const title = $("#title-input").value.trim();
  if (!title) return;
  const previous =
    (kind === "task" ? state.tasks : state.notes).find(
      (x) => x.id === editing,
    ) || {};
  const item = {
    ...previous,
    id: editing || uid(),
    title,
    body: $("#body-input").value.trim(),
    ...(kind === "task"
      ? {
          status: $("#status-input").value,
          priority: $("#priority-input").value,
          date: $("#date-input").value,
          list: $("#list-input").value,
          myDay: $("#myday-input").checked ? todayKey() : null,
          steps: draftSteps,
          notified:
            previous.date === $("#date-input").value
              ? previous.notified
              : false,
        }
      : {
          color: $("#color-input").value,
          background: noteBackground.image,
          ...noteBackground.settings(),
          pin: $("#pin-input").checked,
          checklist: $("#checklist-input").checked,
          checked:
            previous.body === $("#body-input").value.trim()
              ? previous.checked || []
              : [],
          updated: Date.now(),
        }),
  };
  const list = kind === "task" ? state.tasks : state.notes,
    index = list.findIndex((x) => x.id === editing);
  if (index >= 0) list[index] = item;
  else list.unshift(item);
  if (!save()) {
    if (index >= 0) list[index] = previous;
    else list.shift();
    return;
  }
  render();
  $("#editor").close();
  toast(kind === "task" ? "Task saved" : "Note saved");
};
function removeItem(key, id) {
  const index = state[key].findIndex((x) => x.id === id);
  if (index < 0) return;
  const [item] = state[key].splice(index, 1);
  save();
  render();
  toast(key === "tasks" ? "Task deleted" : "Note deleted", () =>
    state[key].splice(index, 0, item),
  );
}
$("#delete-item").onclick = () => {
  removeItem(kind === "task" ? "tasks" : "notes", editing);
  $("#editor").close();
};
$("#close-modal").onclick = () => $("#editor").close();
function download(content, name, type) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function calendar(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t?.date) return;
  const fmt = (d) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const clean = (s) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const start = new Date(t.date);
  download(
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Workspace//Tasks//EN",
      "BEGIN:VEVENT",
      `UID:${t.id}@workspace.local`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(new Date(+start + 1800000))}`,
      `SUMMARY:${clean(t.title)}`,
      `DESCRIPTION:${clean(t.body || "Workspace task")}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Task reminder",
      "TRIGGER:-PT10M",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"),
    "workspace-reminder.ics",
    "text/calendar",
  );
  toast("Open the downloaded file in your calendar to activate the reminder.");
}
$("#task-calendar").onclick = () => calendar(editing);
document.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  const d = el.dataset;
  if (d.complete) {
    const t = state.tasks.find((t) => t.id === d.complete),
      old = t.status;
    const completed = t.status !== "done";
    t.status = completed ? "done" : "todo";
    if (completed) playTaskCompleteSound();
    save();
    render();
    toast(
      completed ? "Task completed" : "Task reopened",
      () => (t.status = old),
    );
    return;
  }
  if (d.star) {
    const t = state.tasks.find((t) => t.id === d.star);
    t.priority = t.priority === "High" ? "Normal" : "High";
    save();
    render();
    return;
  }
  if (d.edit) {
    openEditor("task", d.edit);
    return;
  }
  if (d.calendar) {
    calendar(d.calendar);
    return;
  }
  if (d.add) {
    openEditor("task", null, d.add);
    return;
  }
  if (d.note) {
    openEditor("note", d.note);
    return;
  }
  if (d.pin) {
    const n = state.notes.find((n) => n.id === d.pin);
    n.pin = !n.pin;
    save();
    render();
    return;
  }
  if (d.deleteNote) {
    removeItem("notes", d.deleteNote);
    return;
  }
  if (d.view) {
    selectView(d.view);
    filter = "active";
    query = "";
    $("#search").value = "";
    render();
    return;
  }
  if (d.filter) {
    filter = d.filter;
    render();
    return;
  }
  if (d.theme) {
    state.theme = d.theme;
    save();
    applyAppearance();
  }
  if (d.bg) {
    state.bg = d.bg;
    useManualBackground();
    delete state.wallpaper;
    save();
    applyAppearance();
    $("#upload-status").textContent = "Background updated.";
  }
  if (d.removeStep !== undefined) {
    draftSteps.splice(Number(d.removeStep), 1);
    renderSteps();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.step !== undefined) {
    draftSteps[Number(e.target.dataset.step)].done = e.target.checked;
    renderSteps();
  }
  if (e.target.dataset.noteCheck) {
    const n = state.notes.find((n) => n.id === e.target.dataset.noteCheck),
      i = Number(e.target.dataset.index);
    n.checked = e.target.checked
      ? [...new Set([...(n.checked || []), i])]
      : (n.checked || []).filter((x) => x !== i);
    save();
    render();
  }
});
document.addEventListener("workspace:add-task", (event) => {
  const { title, body, onComplete } = event.detail || {};
  if (typeof title !== "string" || !title.trim()) {
    onComplete?.(false);
    return;
  }
  const task = {
    id: uid(),
    title: title.trim(),
    body: typeof body === "string" ? body.trim() : "",
    status: "todo",
    priority: "Normal",
    date: "",
    steps: [],
    myDay: todayKey(),
    list: "",
  };
  state.tasks.unshift(task);
  if (!save()) {
    state.tasks.shift();
    onComplete?.(false);
    return;
  }
  render();
  onComplete?.(true);
});
$("#quick-task").onsubmit = (e) => {
  e.preventDefault();
  const title = $("#quick-title").value.trim();
  if (!title) return;
  state.tasks.unshift({
    id: uid(),
    title,
    body: "",
    status: "todo",
    priority: view === "important" ? "High" : "Normal",
    date: "",
    steps: [],
    myDay: view === "all" ? todayKey() : null,
    list: view.startsWith("list:") ? view.slice(5) : "",
  });
  $("#quick-title").value = "";
  filter = "active";
  save();
  render();
  $("#quick-title").focus();
};
$("#board").addEventListener("dragstart", (e) => {
  const card = e.target.closest(".task");
  if (card) {
    dragging = card.dataset.id;
    e.dataTransfer.setData("text/plain", dragging);
    e.dataTransfer.effectAllowed = "move";
    card.classList.add("dragging");
  }
});
$("#board").addEventListener("dragover", (e) => {
  e.preventDefault();
  $$(".drop-target").forEach((el) => el.classList.remove("drop-target"));
  const target = e.target.closest(layout === "board" ? ".column" : ".task");
  target?.classList.add("drop-target");
});
$("#board").addEventListener("drop", (e) => {
  e.preventDefault();
  const id = e.dataTransfer.getData("text/plain") || dragging,
    t = state.tasks.find((t) => t.id === id);
  if (!t) return;
  if (layout === "board") {
    const col = e.target.closest(".column");
    if (col) t.status = col.dataset.status;
  } else {
    const target = e.target.closest(".task");
    if (target && target.dataset.id !== id) {
      reorder("tasks", id, target.dataset.id);
      sort = "manual";
      $("#sort-tasks").value = sort;
    }
  }
  save();
  render();
});
$("#board").addEventListener("dragend", () => {
  $$(".drop-target,.dragging").forEach((c) =>
    c.classList.remove("drop-target", "dragging"),
  );
  dragging = null;
});
$("#new-task").onclick = () => openEditor("task");
$("#new-note").onclick = $("#note-capture").onclick = () => openEditor("note");
$("#search").oninput = (e) => {
  query = e.target.value.toLowerCase();
  render();
};
$("#sort-tasks").onchange = (e) => {
  sort = e.target.value;
  render();
};
$("#list-layout").onclick = () => {
  layout = "list";
  localStorage.setItem(LAYOUT_KEY, layout);
  render();
};
$("#board-layout").onclick = () => {
  layout = "board";
  localStorage.setItem(LAYOUT_KEY, layout);
  render();
};
$("#theme").onclick = () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  save();
  applyAppearance();
};
$("#appearance").onclick = () => $("#settings").showModal();
$("#close-settings").onclick = $("#done-settings").onclick = () =>
  $("#settings").close();
$("#reset-bg").onclick = () => {
  useManualBackground();
  delete state.wallpaper;
  state.bg = "blue";
  state.brightness = 85;
  state.blur = 0;
  state.overlay = 0;
  state.fit = "cover";
  state.position = "center";
  state.pattern = "none";
  state.backgroundColor = "#f7f5ef";
  save();
  applyAppearance();
  $("#upload-status").textContent = "Background reset.";
};
$("#bg-brightness").oninput = (e) => {
  state.brightness = Number(e.target.value);
  applyAppearance();
};
$("#bg-brightness").onchange = save;
// Decode and resize uploads before storing them. Paint on a dedicated fixed layer so
// solid header and content backgrounds cannot obscure the user's photo.
async function encodeBackground(file, maxDimension = 1920) {
  if (file.size > 25 * 1024 * 1024)
    throw Error("Choose an image smaller than 25 MB.");
  if (!file.type.startsWith("image/"))
    throw Error("Choose a JPG, PNG, WebP or GIF image.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
        1,
        maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
      ),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw Error("This browser cannot process the image.");
    context.fillStyle = "#dce5ed";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
$("#background-upload").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $("#upload-status").textContent = "Processing image...";
  try {
    const data = await encodeBackground(file),
      previous = state.wallpaper;
    useManualBackground();
    state.wallpaper = data;
    if (!save()) {
      state.wallpaper = previous;
      throw Error(
        "Not enough device storage. Export a backup and free space, then try again.",
      );
    }
    applyAppearance();
    $("#upload-status").textContent =
      "Image applied and saved. Close this panel to see your background.";
    toast("Background updated");
  } catch (err) {
    $("#upload-status").textContent = err.message;
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
$("#backup").onclick = () =>
  download(
    JSON.stringify(state, null, 2),
    "workspace-backup.json",
    "application/json",
  );
function validImageData(value) {
  return (
    !value ||
    (typeof value === "string" &&
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
  );
}
function validBackup(data) {
  const safeId = (x) =>
    typeof x === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(x);
  return (
    data &&
    Array.isArray(data.tasks) &&
    Array.isArray(data.notes) &&
    data.tasks.every(
      (t) =>
        t &&
        safeId(t.id) &&
        typeof t.title === "string" &&
        (!t.body || typeof t.body === "string") &&
        ["todo", "progress", "done"].includes(t.status) &&
        ["High", "Normal", "Low"].includes(t.priority) &&
        (!t.date || !isNaN(new Date(t.date))) &&
        (!t.list || safeId(t.list)) &&
        (!t.steps ||
          (Array.isArray(t.steps) &&
            t.steps.every((s) => s && typeof s.title === "string"))),
    ) &&
    data.notes.every(
      (n) =>
        n &&
        safeId(n.id) &&
        typeof n.title === "string" &&
        (!n.body || typeof n.body === "string") &&
        validImageData(n.background) &&
        ["butter", "sage", "rose", "lavender", "paper"].includes(n.color) &&
        (!n.checked ||
          (Array.isArray(n.checked) && n.checked.every(Number.isInteger))),
    ) &&
    (!data.wallpaper ||
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
        data.wallpaper,
      )) &&
    (!data.lists ||
      (Array.isArray(data.lists) &&
        data.lists.every(
          (l) => l && safeId(l.id) && typeof l.name === "string",
        )))
  );
}
$("#restore").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!validBackup(data)) throw Error("This is not a valid workspace backup.");
    const old = structuredClone(state);
    state = { ...structuredClone(seed), ...data };
    state.lists ||= structuredClone(seed.lists);
    state.brightness = Math.min(
      100,
      Math.max(20, Number(state.brightness) || 85),
    );
    state.theme = state.theme === "dark" ? "dark" : "light";
    state.bg = ["blue", "linen", "sage", "sand", "custom"].includes(state.bg)
      ? state.bg
      : "blue";
    state.tasks.forEach((t) => {
      t.steps ||= [];
      t.list ||= "";
    });
    selectView("tasks");
    if (!save()) {
      state = old;
      return;
    }
    render();
    toast("Backup restored", () => (state = old));
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
$("#mobile-lists").onchange = (e) => {
  if (e.target.value === "__new") {
    $("#new-list").click();
    e.target.value = "";
  } else if (e.target.value) {
    selectView("list:" + e.target.value);
    filter = "active";
    render();
  }
};
$("#new-list").onclick = () => {
  $("#list-name").value = "";
  $("#list-dialog").showModal();
  $("#list-name").focus();
};
$("#close-list").onclick = () => $("#list-dialog").close();
$("#list-form").onsubmit = (e) => {
  e.preventDefault();
  const name = $("#list-name").value.trim();
  if (!name) return;
  const list = { id: uid(), name };
  state.lists.push(list);
  selectView("list:" + list.id);
  save();
  render();
  $("#list-dialog").close();
  toast("List created");
};
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && !e.target.matches("input,textarea,select")) {
    e.preventDefault();
    $("#search").focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !$("dialog[open]")) {
    e.preventDefault();
    openEditor(e.shiftKey ? "note" : "task");
  }
});
$("#today").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});
render();
setInterval(() => {
  const due = state.tasks.filter(
    (t) =>
      t.date &&
      t.status !== "done" &&
      !t.notified &&
      new Date(t.date) <= new Date(),
  );
  for (const t of due) {
    t.notified = true;
    toast("Reminder: " + t.title);
  }
  if (due.length) save();
}, 15000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});

function reorder(key, id, targetId) {
  const list = state[key],
    from = list.findIndex((x) => x.id === id),
    to = list.findIndex((x) => x.id === targetId);
  if (from < 0 || to < 0 || from === to) return false;
  if (key === "notes" && !!list[from].pin !== !!list[to].pin) {
    toast("Pinned notes stay first. Unpin a note to move it below.");
    return false;
  }
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return true;
}
let draggedNote = null;
$("#notes").addEventListener("dragstart", (e) => {
  const card = e.target.closest("[data-note-id]");
  if (!card) return;
  draggedNote = card.dataset.noteId;
  e.dataTransfer.setData("text/plain", draggedNote);
  e.dataTransfer.effectAllowed = "move";
  card.classList.add("dragging");
});
$("#notes").addEventListener("dragover", (e) => {
  if (!draggedNote) return;
  e.preventDefault();
  $$("#notes .drop-target").forEach((el) => el.classList.remove("drop-target"));
  const target = e.target.closest("[data-note-id]");
  if (target && target.dataset.noteId !== draggedNote)
    target.classList.add("drop-target");
});
$("#notes").addEventListener("drop", (e) => {
  if (!draggedNote) return;
  e.preventDefault();
  const target = e.target.closest("[data-note-id]");
  if (target && reorder("notes", draggedNote, target.dataset.noteId)) {
    save();
    render();
  }
  $$("#notes .drop-target,#notes .dragging").forEach((el) =>
    el.classList.remove("drop-target", "dragging"),
  );
  draggedNote = null;
});
$("#notes").addEventListener("dragend", () => {
  $$("#notes .drop-target,#notes .dragging").forEach((el) =>
    el.classList.remove("drop-target", "dragging"),
  );
  draggedNote = null;
});
document.addEventListener("keydown", (e) => {
  const handle = e.target.closest?.("[data-move-note],[data-move-task]");
  if (
    !handle ||
    !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
  )
    return;
  e.preventDefault();
  const key = handle.dataset.moveNote ? "notes" : "tasks",
    id = handle.dataset.moveNote || handle.dataset.moveTask;
  const visible =
    key === "notes"
      ? [...state.notes]
          .filter(matching)
          .sort((a, b) => Number(b.pin) - Number(a.pin))
      : sorted(
          state.tasks.filter(
            (t) =>
              inView(t) &&
              matching(t) &&
              (filter === "done" ? t.status === "done" : t.status !== "done"),
          ),
        );
  const index = visible.findIndex((x) => x.id === id),
    next = index + (["ArrowUp", "ArrowLeft"].includes(e.key) ? -1 : 1);
  if (!visible[next]) return;
  if (reorder(key, id, visible[next].id)) {
    if (key === "tasks") {
      sort = "manual";
      $("#sort-tasks").value = sort;
    }
    save();
    render();
    document
      .querySelector(`[data-move-${key === "notes" ? "note" : "task"}="${id}"]`)
      ?.focus();
    toast(key === "notes" ? "Note moved" : "Task moved");
  }
});

function renderNote(n) {
  return `<article class="note ${n.color || "paper"}" draggable="true" data-note-id="${n.id}"><div class="note-heading"><button class="note-title" data-note="${n.id}">${esc(n.title)}</button><button class="note-pin ${n.pin ? "pinned" : ""}" data-pin="${n.id}" aria-label="${n.pin ? "Unpin" : "Pin"} note">${icon("pin")}</button></div>${
    n.checklist
      ? `<div class="note-checks">${(n.body || "")
          .split("\n")
          .filter(Boolean)
          .map(
            (line, i) =>
              `<label><input type="checkbox" data-note-check="${n.id}" data-index="${i}" ${(n.checked || []).includes(i) ? "checked" : ""}><span>${esc(line)}</span></label>`,
          )
          .join("")}</div>`
      : `<button class="note-body" data-note="${n.id}">${esc(n.body)}</button>`
  }<div class="note-actions"><button class="note-drag" data-move-note="${n.id}" aria-label="Reorder note. Use arrow keys to move." title="Drag to reorder, or use arrow keys">${icon("grip")}</button><span class="note-date">${n.pin ? "Pinned" : n.updated ? new Date(n.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Note"}</span><button data-note="${n.id}" aria-label="Edit note">${icon("edit")}</button><button data-delete-note="${n.id}" aria-label="Delete note">${icon("trash")}</button></div></article>`;
}
function applyNoteBackgrounds() {
  $$("#notes [data-note-id]").forEach((card) => {
    const note = state.notes.find((note) => note.id === card.dataset.noteId);
    if (note)
      BackgroundStyle.applyNote(card, {
        ...note,
        background: validImageData(note.background) ? note.background : "",
      });
    if (note && validImageData(note.background) && note.background) {
      card.classList.add("note-photo");
    }
  });
}

function applyWorkspaceControls() {
  const clamp = BackgroundStyle.clamp.bind(BackgroundStyle);
  const radius = clamp(state.radius, 0, 28, 16);
  const fontSize = Math.round(clamp(state.fontSize, 12, 24, 15));
  const fontKey = Object.prototype.hasOwnProperty.call(
    fontFamilies,
    state.fontFamily,
  )
    ? state.fontFamily
    : "google-sans";
  state.fontFamily = fontKey;
  const fontFamily = fontFamilies[fontKey];
  const blur = clamp(state.blur, 0, 16, 0);
  const overlay = clamp(state.overlay, 0, 70, 0);
  const fit = ["cover", "contain", "tile"].includes(state.fit)
    ? state.fit
    : "cover";
  const position = BackgroundStyle.position(state.position);
  const pattern = [
    "dots",
    "grid",
    "lines",
    "diagonal",
    "leaves",
    "waves",
    "crosses",
    "contour",
    "woven",
  ].includes(state.pattern)
    ? state.pattern
    : "none";
  const colors = {
    linen: state.theme === "dark" ? "#20201e" : "#f7f5ef",
    sage: state.theme === "dark" ? "#20201e" : "#f7f5ef",
    blue: "#20201e",
    sand: "#c63820",
  };
  const color =
    state.bg === "custom"
      ? BackgroundStyle.color(state.backgroundColor)
      : colors[state.bg] || colors.linen;
  applyBrandColors();
  const foreground = BackgroundStyle.foreground(color);
  const texture = BackgroundStyle.texture(pattern, color);
  document.body.style.setProperty("--radius", radius + "px");
  document.body.style.setProperty(
    "--workspace-font-scale",
    String(fontSize / 15),
  );
  if (fontKey === "google-sans")
    document.body.style.removeProperty("--workspace-font-family");
  else
    document.body.style.setProperty("--workspace-font-family", fontFamily);
  document.body.style.setProperty(
    "--control-radius",
    Math.min(radius, 10) + "px",
  );
  document.body.style.setProperty("--workspace-foreground", foreground);
  document.body.style.setProperty("--workspace-tone", color);
  const layer = $("#wallpaper");
  layer.style.backgroundColor = color;
  layer.style.backgroundSize = fit === "tile" ? "360px auto" : fit;
  layer.style.backgroundRepeat = fit === "tile" ? "repeat" : "no-repeat";
  layer.style.backgroundPosition = position;
  layer.style.filter = `brightness(${state.brightness / 100}) blur(${blur}px)`;
  $("#wallpaper-pattern").style.backgroundImage = texture;
  $("#wallpaper-pattern").style.opacity = pattern === "none" ? "0" : ".22";
  $("#wallpaper-overlay").style.opacity = effectiveWallpaper()
    ? String(overlay / 100)
    : "0";
  const preview = $("#bg-preview");
  const image = effectiveWallpaper()
    ? `url("${effectiveWallpaper()}")`
    : "none";
  preview.style.backgroundImage = "";
  preview.style.backgroundColor = color;
  preview.style.setProperty("--preview-image", image);
  preview.style.setProperty("--preview-texture", texture || "none");
  preview.style.setProperty(
    "--preview-size",
    fit === "tile" ? "90px auto" : fit,
  );
  preview.style.setProperty("--preview-position", position);
  preview.style.setProperty(
    "--preview-repeat",
    fit === "tile" ? "repeat" : "no-repeat",
  );
  preview.style.setProperty(
    "--preview-filter",
    `brightness(${state.brightness / 100}) blur(${blur / 4}px)`,
  );
  preview.style.setProperty(
    "--preview-overlay",
    effectiveWallpaper() ? overlay / 100 : 0,
  );
  for (const [id, value] of Object.entries({
    "corner-radius": radius,
    "font-size": fontSize,
    "font-family": fontKey,
    "bg-blur": blur,
    "bg-overlay": overlay,
    "bg-fit": fit,
    "bg-position": position,
    "bg-pattern": pattern,
    "bg-color": BackgroundStyle.color(state.backgroundColor),
  }))
    $("#" + id).value = value;
  $("#corner-radius-value").textContent = radius + " px";
  $("#font-size-value").textContent = fontSize + " px";
  $("#bg-brightness-value").textContent = state.brightness + "%";
  $("#bg-blur-value").textContent = blur + " px";
  $("#bg-overlay-value").textContent = overlay + "%";
  updatePresetSelection();
  updateNatureControls();
  applyInteractionSettings();
}
for (const [id, key] of Object.entries({
  "corner-radius": "radius",
  "font-size": "fontSize",
  "font-family": "fontFamily",
  "bg-blur": "blur",
  "bg-overlay": "overlay",
  "bg-fit": "fit",
  "bg-position": "position",
  "bg-pattern": "pattern",
})) {
  const input = $("#" + id);
  input.oninput = () => {
    state[key] = input.type === "range" ? Number(input.value) : input.value;
    applyAppearance();
  };
  input.onchange = () => {
    state[key] = input.type === "range" ? Number(input.value) : input.value;
    save();
    applyAppearance();
  };
}
$("#bg-color").oninput = (event) => {
  state.backgroundColor = event.target.value;
  state.bg = "custom";
  useManualBackground();
  delete state.wallpaper;
  applyAppearance();
};
$("#bg-color").onchange = save;

// Pointer interaction keeps fields quiet; keyboard navigation retains a focus ring.
document.addEventListener(
  "pointerdown",
  () => document.body.classList.remove("keyboard-focus"),
  true,
);
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Tab") document.body.classList.add("keyboard-focus");
  },
  true,
);

$("#duplicate-item").onclick = () => {
  const key = kind === "task" ? "tasks" : "notes";
  const original = state[key].find((item) => item.id === editing);
  if (!original) return;
  const copy = {
    ...structuredClone(original),
    id: uid(),
    title: original.title.slice(0, 173) + " (copy)",
  };
  if (kind === "task") {
    copy.status = "todo";
    copy.notified = false;
  } else {
    copy.pin = false;
    copy.updated = Date.now();
  }
  state[key].unshift(copy);
  if (!save()) {
    state[key].shift();
    return;
  }
  render();
  $("#editor").close();
  openEditor(kind, copy.id);
  toast(kind === "task" ? "Task duplicated" : "Note duplicated");
};

$("#clear-completed").onclick = () => {
  const removed = state.tasks
    .map((task, index) => ({ task, index }))
    .filter(
      ({ task }) => task.status === "done" && inView(task) && matching(task),
    );
  if (!removed.length) return;
  const ids = new Set(removed.map(({ task }) => task.id));
  const previous = state.tasks;
  state.tasks = state.tasks.filter((task) => !ids.has(task.id));
  if (!save()) {
    state.tasks = previous;
    return;
  }
  render();
  toast(
    `${removed.length} completed task${removed.length === 1 ? "" : "s"} cleared`,
    () => {
      removed.forEach(({ task, index }) =>
        state.tasks.splice(Math.min(index, state.tasks.length), 0, task),
      );
    },
  );
};

function applyBrandColors() {
  const primary = BackgroundStyle.color(state.primary, "#c63820");
  const secondary = BackgroundStyle.color(state.secondary, "#e8dfce");
  document.body.style.setProperty("--accent", primary);
  document.body.style.setProperty(
    "--accent-ink",
    BackgroundStyle.foreground(primary),
  );
  document.body.style.setProperty("--secondary", secondary);
  document.body.style.setProperty(
    "--secondary-ink",
    BackgroundStyle.foreground(secondary),
  );
  $("#primary-color").value = primary;
  $("#secondary-color").value = secondary;
}
function updatePresetSelection() {
  const target = $("#palette-target").value;
  const selected =
    target === "background" ? state.backgroundColor : state[target];
  $$("#palette button").forEach((button) => {
    const active = button.dataset.color === selected;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", active);
  });
  $$("#background-templates button").forEach((button) => {
    const preset = AppearancePresets.templates.find(
      (item) => item.id === button.dataset.template,
    );
    const active =
      state.bg === "custom" &&
      !effectiveWallpaper() &&
      state.backgroundColor === preset.color &&
      (state.pattern || "none") === preset.pattern;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", active);
  });
}
$("#palette").innerHTML = AppearancePresets.colors
  .map(
    ([name, color]) =>
      `<button type="button" data-color="${color}" title="${name}" aria-label="${name}" style="--swatch:${color}"></button>`,
  )
  .join("");
$("#background-templates").innerHTML = AppearancePresets.templates
  .map(
    (preset) =>
      `<button type="button" data-template="${preset.id}"><span class="template-sample" style="background-color:${preset.color}"></span><span>${preset.name}</span></button>`,
  )
  .join("");
$$("[data-template]").forEach((button) => {
  const preset = AppearancePresets.templates.find(
    (item) => item.id === button.dataset.template,
  );
  button.querySelector(".template-sample").style.backgroundImage =
    BackgroundStyle.texture(preset.pattern, preset.color);
});
$("#palette-target").onchange = updatePresetSelection;
$("#palette").onclick = (event) => {
  const button = event.target.closest("[data-color]");
  if (!button) return;
  const target = $("#palette-target").value;
  if (target === "background") {
    state.bg = "custom";
    state.backgroundColor = button.dataset.color;
    useManualBackground();
    delete state.wallpaper;
  } else state[target] = button.dataset.color;
  save();
  applyAppearance();
};
$("#background-templates").onclick = (event) => {
  const button = event.target.closest("[data-template]");
  if (!button) return;
  const preset = AppearancePresets.templates.find(
    (item) => item.id === button.dataset.template,
  );
  state.bg = "custom";
  state.backgroundColor = preset.color;
  state.pattern = preset.pattern;
  state.blur = 0;
  state.overlay = 0;
  state.brightness = 100;
  useManualBackground();
  delete state.wallpaper;
  save();
  applyAppearance();
  $("#upload-status").textContent = preset.name + " template applied.";
};
for (const key of ["primary", "secondary"]) {
  $("#" + key + "-color").oninput = (event) => {
    state[key] = event.target.value;
    applyAppearance();
  };
  $("#" + key + "-color").onchange = save;
}
function updateSearchFeedback() {
  const text = query.trim();
  $("#clear-search").hidden = !text;
  $(".sidebar-search kbd").hidden = !!text;
  $("#search-status").hidden = !text;
  if (text)
    $("#search-status").textContent =
      `${state.tasks.filter(matching).length} tasks ? ${state.notes.filter(matching).length} notes`;
}
$("#clear-search").onclick = () => {
  query = "";
  $("#search").value = "";
  render();
  $("#search").focus();
};
$("#search").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $("#clear-search").click();
    event.stopPropagation();
  }
});
applyAppearance();

function applyInteractionSettings() {
  const sidebar = ["paper", "ink", "secondary"].includes(state.sidebarTheme)
    ? state.sidebarTheme
    : "follow";
  const themePaper = state.theme === "dark" ? "#20201e" : "#f7f5ef";
  const background =
    window
      .getComputedStyle(document.body)
      .getPropertyValue("--workspace-tone")
      .trim() || themePaper;
  const tone =
    sidebar === "ink"
      ? "#20201e"
      : sidebar === "paper"
        ? "#f7f5ef"
        : sidebar === "secondary"
          ? BackgroundStyle.color(state.secondary, "#e8dfce")
          : effectiveWallpaper()
            ? themePaper
            : background;
  const panel = $("aside");
  panel.style.setProperty("--sidebar-tone", tone);
  panel.style.setProperty("--sidebar-ink", BackgroundStyle.foreground(tone));
  panel.style.setProperty(
    "--sidebar-image",
    sidebar === "follow" && effectiveWallpaper()
      ? `url("${effectiveWallpaper()}")`
      : "none",
  );
  document.body.classList.toggle("motion-off", state.animations === false);
  document.body.dataset.hover = ["lift", "none"].includes(state.hoverEffect)
    ? state.hoverEffect
    : "tint";
  $("#sidebar-theme").value = sidebar;
  $("#animations-enabled").checked = state.animations !== false;
  $("#hover-effect").value = document.body.dataset.hover;
  if (state.animations === false)
    document.getAnimations?.().forEach((animation) => animation.cancel());
}
$("#sidebar-theme").onchange = (event) => {
  state.sidebarTheme = event.target.value;
  save();
  applyAppearance();
};
$("#animations-enabled").onchange = (event) => {
  state.animations = event.target.checked;
  save();
  applyAppearance();
};
$("#hover-effect").onchange = (event) => {
  state.hoverEffect = event.target.value;
  save();
  applyAppearance();
};
function plannedBucket(task) {
  const date = new Date(task.date);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date < today
    ? "Overdue"
    : +date === +today
      ? "Today"
      : +date === +tomorrow
        ? "Tomorrow"
        : "Upcoming";
}
function myDayAction(task) {
  const included = task.myDay === todayKey();
  return `<button class="subtle" data-myday="${task.id}" ${included ? "disabled" : ""}>${included ? "In My Day" : "+ My Day"}</button>`;
}
function renderPlanned(planned) {
  $("#reminder-list").innerHTML =
    ["Overdue", "Today", "Tomorrow", "Upcoming"]
      .map((group) => {
        const tasks = planned.filter((task) => plannedBucket(task) === group);
        if (!tasks.length) return "";
        return `<section class="planned-group"><div class="planned-group-heading"><h2>${group}</h2><span>${tasks.length}</span></div>${tasks.map((task) => `<div class="planned-card">${taskCard(task)}<div class="planned-bottom"><span>${esc(new Date(task.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }))}</span><div class="planned-actions">${myDayAction(task)}<button class="subtle" data-calendar="${task.id}">${icon("calendar")} Calendar reminder</button></div></div></div>`).join("")}</section>`;
      })
      .join("") ||
    `<div class="empty-state">${icon("calendar")}<h3>No scheduled tasks</h3><p>Add a due date to a task to see it here.</p></div>`;
  $("#day-schedule").hidden = view !== "all" || !!query || !planned.length;
  $("#day-schedule-items").innerHTML = planned
    .slice(0, 3)
    .map(
      (task) =>
        `<div class="schedule-row"><span class="schedule-date">${plannedBucket(task)}</span><button data-edit="${task.id}" class="schedule-task">${esc(task.title)}<small>${esc(new Date(task.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</small></button>${myDayAction(task)}</div>`,
    )
    .join("");
}
document.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-myday]");
  if (!button) return;
  const task = state.tasks.find((task) => task.id === button.dataset.myday);
  if (!task) return;
  const previous = task.myDay;
  task.myDay = todayKey();
  if (!save()) {
    task.myDay = previous;
    return;
  }
  render();
  toast("Added to My Day", () => (task.myDay = previous));
});
applyInteractionSettings();

function updateNatureControls() {
  $("#nature-enabled").checked = state.autoNature === true;
  $("#nature-quality").value = state.natureQuality === "hd" ? "hd" : "4k";
  $("#nature-toggle-label").textContent = state.autoNature ? "On" : "Off";
  $("#nature-status").textContent = natureWallpaper.status;
  const photo = natureWallpaper.enabled && natureWallpaper.photo;
  $("#nature-source").href = photo
    ? NatureWallpaper.url(photo.id, natureWallpaper.quality)
    : "https://unsplash.com";
  $("#nature-source").textContent = photo
    ? "Open photo on Unsplash"
    : "Photos on Unsplash";
  $("#nature-next").textContent = state.autoNature
    ? "Changes every 5 min"
    : "Manual background active";
}
$("#nature-enabled").onchange = (event) => {
  state.autoNature = event.target.checked;
  save();
  applyAppearance();
};
$("#nature-quality").onchange = (event) => {
  state.natureQuality = event.target.value;
  save();
  applyAppearance();
};
