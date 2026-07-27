"use strict";

const STORAGE_KEY = "mytimetracker_entries_v3";
const ASSISTANT_TASKS_KEY = "mytimetracker_assistant_tasks_v1";

/* =========================
   Βασικά στοιχεία εφαρμογής
========================= */

const currentDateElement = document.getElementById("current-date");

const todayTotalElement = document.getElementById("today-total");
const selectedDayTotalElement = document.getElementById(
  "selected-day-total"
);
const selectedDayCountElement = document.getElementById(
  "selected-day-count"
);

const navigationButtons = document.querySelectorAll(
  "[data-section-target]"
);

/* =========================
   Ημερολόγιο
========================= */

const calendarMonthTitle = document.getElementById(
  "calendar-month-title"
);
const calendarGrid = document.getElementById("calendar-grid");

const previousMonthButton = document.getElementById(
  "previous-month-button"
);
const nextMonthButton = document.getElementById(
  "next-month-button"
);
const todayButton = document.getElementById("today-button");

const selectedDateTitle = document.getElementById(
  "selected-date-title"
);
const entriesDateLabel = document.getElementById(
  "entries-date-label"
);

/* =========================
   Χρονόμετρο
========================= */

const taskNameInput = document.getElementById("task-name");
const categorySelect = document.getElementById("category");
const taskNotesInput = document.getElementById("task-notes");

const timerDisplay = document.getElementById("timer-display");

const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const stopButton = document.getElementById("stop-button");

/* =========================
   Καταχωρήσεις
========================= */

const entriesList = document.getElementById("entries-list");
const emptyState = document.getElementById("empty-state");
const clearDayButton = document.getElementById("clear-day-button");

/* =========================
   Modal
========================= */

const entryModal = document.getElementById("entry-modal");
const entryModalTitle = document.getElementById("entry-modal-title");

const openManualEntryButton = document.getElementById(
  "open-manual-entry-button"
);
const closeModalButton = document.getElementById(
  "close-modal-button"
);
const cancelModalButton = document.getElementById(
  "cancel-modal-button"
);
const saveEntryButton = document.getElementById(
  "save-entry-button"
);

const entryIdInput = document.getElementById("entry-id");
const entryTaskNameInput = document.getElementById(
  "entry-task-name"
);
const entryCategorySelect = document.getElementById(
  "entry-category"
);
const entryDateInput = document.getElementById("entry-date");
const entryStartTimeInput = document.getElementById(
  "entry-start-time"
);
const entryEndTimeInput = document.getElementById(
  "entry-end-time"
);
const entryNotesInput = document.getElementById("entry-notes");

/* =========================
   Ψηφιακός βοηθός
========================= */

const assistantDateInput = document.getElementById(
  "assistant-date"
);
const availableHoursInput = document.getElementById(
  "available-hours"
);
const dayStartTimeInput = document.getElementById(
  "day-start-time"
);
const breakMinutesSelect = document.getElementById(
  "break-minutes"
);

const assistantTaskNameInput = document.getElementById(
  "assistant-task-name"
);
const assistantTaskHoursInput = document.getElementById(
  "assistant-task-hours"
);
const assistantTaskPrioritySelect = document.getElementById(
  "assistant-task-priority"
);

const addAssistantTaskButton = document.getElementById(
  "add-assistant-task-button"
);
const generatePlanButton = document.getElementById(
  "generate-plan-button"
);
const clearAssistantButton = document.getElementById(
  "clear-assistant-button"
);
const savePlanButton = document.getElementById(
  "save-plan-button"
);

const assistantTaskList = document.getElementById(
  "assistant-task-list"
);
const assistantEmptyTasks = document.getElementById(
  "assistant-empty-tasks"
);
const assistantMessage = document.getElementById(
  "assistant-message"
);
const assistantPlanWrapper = document.getElementById(
  "assistant-plan-wrapper"
);
const assistantPlanList = document.getElementById(
  "assistant-plan-list"
);

/* =========================
   Κατάσταση εφαρμογής
========================= */

let entries = loadJson(STORAGE_KEY, []);
let assistantTasks = loadJson(ASSISTANT_TASKS_KEY, []);
let generatedPlan = [];

let selectedDate = startOfDay(new Date());

let calendarDate = new Date(
  selectedDate.getFullYear(),
  selectedDate.getMonth(),
  1
);

let timerInterval = null;
let timerStartedTimestamp = null;
let timerSessionStart = null;
let elapsedSeconds = 0;
let isTimerRunning = false;

/* =========================
   Αρχικοποίηση
========================= */

initializeApplication();

function initializeApplication() {
  currentDateElement.textContent = formatLongDate(new Date());

  assistantDateInput.value = formatDateForInput(selectedDate);

  renderTimer();
  renderCalendar();
  renderSelectedDate();
  renderEntries();
  renderSummary();
  renderAssistantTasks();
  updateTimerButtons();
}

/* =========================
   Πλοήγηση
========================= */

navigationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    navigationButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    const targetId = button.dataset.sectionTarget;
    const target = document.getElementById(targetId);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
});

/* =========================
   Χρονόμετρο
========================= */

startButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", pauseTimer);
stopButton.addEventListener("click", stopTimer);

function startTimer() {
  const taskName = taskNameInput.value.trim();

  if (!taskName) {
    alert("Γράψε πρώτα το όνομα του task.");
    taskNameInput.focus();
    return;
  }

  if (isTimerRunning) {
    return;
  }

  if (!timerSessionStart) {
    timerSessionStart = new Date();
  }

  isTimerRunning = true;

  timerStartedTimestamp =
    Date.now() - elapsedSeconds * 1000;

  timerInterval = window.setInterval(() => {
    elapsedSeconds = Math.floor(
      (Date.now() - timerStartedTimestamp) / 1000
    );

    renderTimer();
  }, 1000);

  updateTimerButtons();
}

function pauseTimer() {
  if (!isTimerRunning) {
    return;
  }

  isTimerRunning = false;

  window.clearInterval(timerInterval);
  timerInterval = null;

  updateTimerButtons();
}

function stopTimer() {
  if (elapsedSeconds <= 0) {
    return;
  }

  const taskName = taskNameInput.value.trim();

  if (!taskName) {
    alert("Το task πρέπει να έχει όνομα.");
    return;
  }

  const dateKey = formatDateForInput(selectedDate);

  const startTime = timerSessionStart
    ? formatTimeForInput(timerSessionStart)
    : "";

  const endTime = addSecondsToTime(
    dateKey,
    startTime,
    elapsedSeconds
  );

  entries.push({
    id: createId(),
    taskName,
    category: categorySelect.value,
    notes: taskNotesInput.value.trim(),
    date: dateKey,
    startTime,
    endTime,
    durationSeconds: elapsedSeconds,
    source: "timer",
    createdAt: new Date().toISOString()
  });

  saveEntries();
  resetTimer();

  renderAll();
}

function resetTimer() {
  window.clearInterval(timerInterval);

  timerInterval = null;
  timerStartedTimestamp = null;
  timerSessionStart = null;
  elapsedSeconds = 0;
  isTimerRunning = false;

  taskNameInput.value = "";
  taskNotesInput.value = "";

  renderTimer();
  updateTimerButtons();
}

function renderTimer() {
  timerDisplay.textContent = formatDuration(elapsedSeconds);
}

function updateTimerButtons() {
  startButton.disabled = isTimerRunning;
  pauseButton.disabled = !isTimerRunning;
  stopButton.disabled = elapsedSeconds <= 0;
}

/* =========================
   Ημερολόγιο
========================= */

previousMonthButton.addEventListener("click", () => {
  calendarDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() - 1,
    1
  );

  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  calendarDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    1
  );

  renderCalendar();
});

todayButton.addEventListener("click", () => {
  selectDate(new Date());
});

function renderCalendar() {
  calendarGrid.innerHTML = "";

  calendarMonthTitle.textContent =
    new Intl.DateTimeFormat("el-GR", {
      month: "long",
      year: "numeric"
    }).format(calendarDate);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const mondayIndex = (firstDay.getDay() + 6) % 7;

  const calendarStart = new Date(
    year,
    month,
    1 - mondayIndex
  );

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(calendarStart);

    date.setDate(calendarStart.getDate() + index);

    calendarGrid.append(
      createCalendarDay(date, month)
    );
  }
}

function createCalendarDay(date, visibleMonth) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "calendar-day";

  const dateKey = formatDateForInput(date);
  const dayEntries = getEntriesForDate(dateKey);
  const totalSeconds = calculateEntriesTotal(dayEntries);

  if (date.getMonth() !== visibleMonth) {
    button.classList.add("other-month");
  }

  if (isSameDay(date, new Date())) {
    button.classList.add("today");
  }

  if (isSameDay(date, selectedDate)) {
    button.classList.add("selected");
  }

  const dayNumber = document.createElement("span");
  dayNumber.className = "calendar-day-number";
  dayNumber.textContent = String(date.getDate());

  button.append(dayNumber);

  if (dayEntries.length > 0) {
    const total = document.createElement("span");
    total.className = "calendar-day-total";
    total.textContent = formatCompactDuration(totalSeconds);

    const dot = document.createElement("span");
    dot.className = "calendar-day-dot";

    button.append(total, dot);
  }

  button.addEventListener("click", () => {
    selectDate(date);
  });

  return button;
}

function selectDate(date) {
  selectedDate = startOfDay(date);

  calendarDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  );

  assistantDateInput.value = formatDateForInput(selectedDate);

  renderAll();
}

function renderSelectedDate() {
  const formattedDate = formatLongDate(selectedDate);

  selectedDateTitle.textContent = formattedDate;
  entriesDateLabel.textContent = formattedDate;
}

/* =========================
   Καταχωρήσεις
========================= */

function renderEntries() {
  entriesList.innerHTML = "";

  const dateKey = formatDateForInput(selectedDate);

  const dayEntries = getEntriesForDate(dateKey).sort(
    (first, second) =>
      (first.startTime || "").localeCompare(
        second.startTime || ""
      )
  );

  emptyState.hidden = dayEntries.length > 0;
  clearDayButton.disabled = dayEntries.length === 0;

  dayEntries.forEach((entry) => {
    entriesList.append(createEntryElement(entry));
  });
}

function createEntryElement(entry) {
  const article = document.createElement("article");
  article.className = "entry-item";

  const information = document.createElement("div");

  const title = document.createElement("h3");
  title.className = "entry-title";
  title.textContent = entry.taskName;

  const meta = document.createElement("p");
  meta.className = "entry-meta";

  const timeRange =
    entry.startTime && entry.endTime
      ? `${entry.startTime} – ${entry.endTime}`
      : "Χωρίς συγκεκριμένη ώρα";

  meta.textContent =
    `${entry.category} · ${timeRange}`;

  information.append(title, meta);

  if (entry.notes) {
    const notes = document.createElement("p");
    notes.className = "entry-notes";
    notes.textContent = entry.notes;

    information.append(notes);
  }

  const rightSection = document.createElement("div");
  rightSection.className = "entry-right";

  const duration = document.createElement("strong");
  duration.className = "entry-duration";
  duration.textContent = formatDuration(
    entry.durationSeconds
  );

  const actions = document.createElement("div");
  actions.className = "entry-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "entry-action-button edit";
  editButton.textContent = "Επεξεργασία";

  editButton.addEventListener("click", () => {
    openEditModal(entry.id);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "entry-action-button delete";
  deleteButton.textContent = "Διαγραφή";

  deleteButton.addEventListener("click", () => {
    deleteEntry(entry.id);
  });

  actions.append(editButton, deleteButton);
  rightSection.append(duration, actions);

  article.append(information, rightSection);

  return article;
}

clearDayButton.addEventListener("click", () => {
  const dateKey = formatDateForInput(selectedDate);

  const confirmed = window.confirm(
    "Να διαγραφούν όλες οι καταχωρήσεις της επιλεγμένης ημέρας;"
  );

  if (!confirmed) {
    return;
  }

  entries = entries.filter(
    (entry) => entry.date !== dateKey
  );

  saveEntries();
  renderAll();
});

function deleteEntry(entryId) {
  const entry = entries.find(
    (item) => item.id === entryId
  );

  if (!entry) {
    return;
  }

  const confirmed = window.confirm(
    `Να διαγραφεί το task "${entry.taskName}";`
  );

  if (!confirmed) {
    return;
  }

  entries = entries.filter(
    (item) => item.id !== entryId
  );

  saveEntries();
  renderAll();
}

/* =========================
   Modal καταχώρησης
========================= */

openManualEntryButton.addEventListener("click", () => {
  openNewEntryModal();
});

closeModalButton.addEventListener("click", closeEntryModal);
cancelModalButton.addEventListener("click", closeEntryModal);
saveEntryButton.addEventListener("click", saveModalEntry);

entryModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeModal === "true") {
    closeEntryModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !entryModal.hidden) {
    closeEntryModal();
  }
});

function openNewEntryModal() {
  entryModalTitle.textContent = "Νέα καταχώρηση";

  entryIdInput.value = "";
  entryTaskNameInput.value = "";
  entryCategorySelect.value = "Εργασία";
  entryDateInput.value = formatDateForInput(selectedDate);
  entryStartTimeInput.value = "09:00";
  entryEndTimeInput.value = "10:00";
  entryNotesInput.value = "";

  showEntryModal();
}

function openEditModal(entryId) {
  const entry = entries.find(
    (item) => item.id === entryId
  );

  if (!entry) {
    return;
  }

  entryModalTitle.textContent = "Επεξεργασία task";

  entryIdInput.value = entry.id;
  entryTaskNameInput.value = entry.taskName;
  entryCategorySelect.value = entry.category;
  entryDateInput.value = entry.date;
  entryStartTimeInput.value = entry.startTime || "";
  entryEndTimeInput.value = entry.endTime || "";
  entryNotesInput.value = entry.notes || "";

  showEntryModal();
}

function showEntryModal() {
  entryModal.hidden = false;
  document.body.classList.add("modal-open");

  entryTaskNameInput.focus();
}

function closeEntryModal() {
  entryModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function saveModalEntry() {
  const taskName = entryTaskNameInput.value.trim();
  const date = entryDateInput.value;
  const startTime = entryStartTimeInput.value;
  const endTime = entryEndTimeInput.value;

  if (!taskName) {
    alert("Γράψε το όνομα του task.");
    entryTaskNameInput.focus();
    return;
  }

  if (!date || !startTime || !endTime) {
    alert("Συμπλήρωσε ημερομηνία και ώρες.");
    return;
  }

  const durationSeconds = calculateDurationSeconds(
    date,
    startTime,
    endTime
  );

  if (durationSeconds <= 0) {
    alert(
      "Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης."
    );
    return;
  }

  const entryId = entryIdInput.value;

  const entryData = {
    taskName,
    category: entryCategorySelect.value,
    date,
    startTime,
    endTime,
    notes: entryNotesInput.value.trim(),
    durationSeconds,
    source: "manual",
    updatedAt: new Date().toISOString()
  };

  if (entryId) {
    const index = entries.findIndex(
      (entry) => entry.id === entryId
    );

    if (index !== -1) {
      entries[index] = {
        ...entries[index],
        ...entryData
      };
    }
  } else {
    entries.push({
      id: createId(),
      ...entryData,
      createdAt: new Date().toISOString()
    });
  }

  selectedDate = parseDateInput(date);

  calendarDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  );

  saveEntries();
  closeEntryModal();
  renderAll();
}

/* =========================
   Ψηφιακός βοηθός
========================= */

addAssistantTaskButton.addEventListener(
  "click",
  addAssistantTask
);

assistantTaskNameInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      addAssistantTask();
    }
  }
);

generatePlanButton.addEventListener(
  "click",
  generateAssistantPlan
);

clearAssistantButton.addEventListener(
  "click",
  clearAssistant
);

savePlanButton.addEventListener(
  "click",
  saveGeneratedPlan
);

function addAssistantTask() {
  const name = assistantTaskNameInput.value.trim();
  const hours = Number(assistantTaskHoursInput.value);
  const priority = Number(
    assistantTaskPrioritySelect.value
  );

  if (!name) {
    showAssistantMessage(
      "Γράψε το όνομα του task.",
      "error"
    );

    assistantTaskNameInput.focus();
    return;
  }

  if (!Number.isFinite(hours) || hours <= 0) {
    showAssistantMessage(
      "Οι ώρες πρέπει να είναι μεγαλύτερες από το μηδέν.",
      "error"
    );

    return;
  }

  assistantTasks.push({
    id: createId(),
    name,
    requestedMinutes: Math.round(hours * 60),
    priority
  });

  saveAssistantTasks();

  assistantTaskNameInput.value = "";
  assistantTaskHoursInput.value = "1";
  assistantTaskPrioritySelect.value = "2";

  hideAssistantMessage();
  resetGeneratedPlan();
  renderAssistantTasks();

  assistantTaskNameInput.focus();
}

function renderAssistantTasks() {
  assistantTaskList
    .querySelectorAll(".assistant-task-item")
    .forEach((item) => item.remove());

  assistantEmptyTasks.hidden = assistantTasks.length > 0;

  assistantTasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = "assistant-task-item";

    const information = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = task.name;

    const details = document.createElement("p");
    details.textContent =
      `${formatMinutes(task.requestedMinutes)} · ` +
      `${priorityLabel(task.priority)} προτεραιότητα`;

    information.append(title, details);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className =
      "entry-action-button delete";
    deleteButton.textContent = "Αφαίρεση";

    deleteButton.addEventListener("click", () => {
      assistantTasks = assistantTasks.filter(
        (itemTask) => itemTask.id !== task.id
      );

      saveAssistantTasks();
      resetGeneratedPlan();
      renderAssistantTasks();
    });

    item.append(information, deleteButton);

    assistantTaskList.append(item);
  });
}

function generateAssistantPlan() {
  const availableHours = Number(
    availableHoursInput.value
  );

  const startTime = dayStartTimeInput.value;
  const date = assistantDateInput.value;

  const breakMinutes = Number(
    breakMinutesSelect.value
  );

  if (!date || !startTime) {
    showAssistantMessage(
      "Συμπλήρωσε ημερομηνία και ώρα έναρξης.",
      "error"
    );
    return;
  }

  if (
    !Number.isFinite(availableHours) ||
    availableHours <= 0
  ) {
    showAssistantMessage(
      "Οι διαθέσιμες ώρες δεν είναι σωστές.",
      "error"
    );
    return;
  }

  if (assistantTasks.length === 0) {
    showAssistantMessage(
      "Πρόσθεσε τουλάχιστον ένα task.",
      "error"
    );
    return;
  }

  const availableMinutes = Math.round(
    availableHours * 60
  );

  const sortedTasks = [...assistantTasks].sort(
    (first, second) => {
      if (second.priority !== first.priority) {
        return second.priority - first.priority;
      }

      return (
        first.requestedMinutes -
        second.requestedMinutes
      );
    }
  );

  const totalBreakMinutes =
    Math.max(0, sortedTasks.length - 1) *
    breakMinutes;

  const usableMinutes = Math.max(
    0,
    availableMinutes - totalBreakMinutes
  );

  let remainingMinutes = usableMinutes;
  let currentTime = startTime;

  generatedPlan = [];

  sortedTasks.forEach((task) => {
    if (remainingMinutes <= 0) {
      return;
    }

    const allocatedMinutes = Math.min(
      task.requestedMinutes,
      remainingMinutes
    );

    if (allocatedMinutes <= 0) {
      return;
    }

    const endTime = addMinutesToTime(
      date,
      currentTime,
      allocatedMinutes
    );

    generatedPlan.push({
      id: createId(),
      taskId: task.id,
      taskName: task.name,
      priority: task.priority,
      date,
      startTime: currentTime,
      endTime,
      allocatedMinutes,
      requestedMinutes: task.requestedMinutes
    });

    remainingMinutes -= allocatedMinutes;

    currentTime = addMinutesToTime(
      date,
      endTime,
      breakMinutes
    );
  });

  renderGeneratedPlan();

  const requestedTotal = assistantTasks.reduce(
    (sum, task) => sum + task.requestedMinutes,
    0
  );

  if (requestedTotal > usableMinutes) {
    showAssistantMessage(
      "Ο διαθέσιμος χρόνος δεν επαρκεί για όλα τα tasks. " +
      "Ο βοηθός έδωσε προτεραιότητα στα πιο σημαντικά.",
      "warning"
    );
  } else {
    showAssistantMessage(
      `Το πρόγραμμα χωράει στον διαθέσιμο χρόνο. ` +
      `Παραμένουν ${formatMinutes(remainingMinutes)} ελεύθερα.`,
      "success"
    );
  }
}

function renderGeneratedPlan() {
  assistantPlanList.innerHTML = "";

  assistantPlanWrapper.hidden =
    generatedPlan.length === 0;

  generatedPlan.forEach((planItem, index) => {
    const item = document.createElement("article");
    item.className = "assistant-plan-item";

    const order = document.createElement("span");
    order.className = "plan-order";
    order.textContent = String(index + 1);

    const details = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = planItem.taskName;

    const timing = document.createElement("p");

    timing.textContent =
      `${planItem.startTime} – ${planItem.endTime} · ` +
      `${formatMinutes(planItem.allocatedMinutes)}`;

    details.append(title, timing);

    const priority = document.createElement("span");
    priority.className =
      `priority-badge priority-${planItem.priority}`;

    priority.textContent =
      priorityLabel(planItem.priority);

    item.append(order, details, priority);

    assistantPlanList.append(item);
  });
}

function saveGeneratedPlan() {
  if (generatedPlan.length === 0) {
    return;
  }

  generatedPlan.forEach((planItem) => {
    entries.push({
      id: createId(),
      taskName: planItem.taskName,
      category: "Πρόγραμμα βοηθού",
      notes:
        `Προτεινόμενη κατανομή · ` +
        `${priorityLabel(planItem.priority)} προτεραιότητα`,
      date: planItem.date,
      startTime: planItem.startTime,
      endTime: planItem.endTime,
      durationSeconds:
        planItem.allocatedMinutes * 60,
      source: "assistant",
      createdAt: new Date().toISOString()
    });
  });

  selectedDate = parseDateInput(
    generatedPlan[0].date
  );

  calendarDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  );

  saveEntries();

  showAssistantMessage(
    "Το προτεινόμενο πρόγραμμα προστέθηκε στο ημερολόγιο.",
    "success"
  );

  generatedPlan = [];
  assistantPlanWrapper.hidden = true;

  renderAll();
}

function clearAssistant() {
  const confirmed = window.confirm(
    "Να καθαριστούν όλα τα tasks του βοηθού;"
  );

  if (!confirmed) {
    return;
  }

  assistantTasks = [];
  generatedPlan = [];

  saveAssistantTasks();
  hideAssistantMessage();

  assistantPlanWrapper.hidden = true;
  assistantPlanList.innerHTML = "";

  renderAssistantTasks();
}

function resetGeneratedPlan() {
  generatedPlan = [];
  assistantPlanWrapper.hidden = true;
  assistantPlanList.innerHTML = "";
}

function showAssistantMessage(message, type) {
  assistantMessage.hidden = false;
  assistantMessage.textContent = message;

  assistantMessage.className =
    `assistant-message assistant-message-${type}`;
}

function hideAssistantMessage() {
  assistantMessage.hidden = true;
  assistantMessage.textContent = "";
}

function priorityLabel(priority) {
  if (priority === 3) {
    return "Υψηλή";
  }

  if (priority === 2) {
    return "Μεσαία";
  }

  return "Χαμηλή";
}

/* =========================
   Σύνοψη
========================= */

function renderSummary() {
  const todayKey = formatDateForInput(new Date());
  const selectedKey = formatDateForInput(selectedDate);

  const todayEntries = getEntriesForDate(todayKey);
  const selectedEntries = getEntriesForDate(selectedKey);

  todayTotalElement.textContent = formatDuration(
    calculateEntriesTotal(todayEntries)
  );

  selectedDayTotalElement.textContent = formatDuration(
    calculateEntriesTotal(selectedEntries)
  );

  selectedDayCountElement.textContent = String(
    selectedEntries.length
  );
}

/* =========================
   Κοινή ανανέωση
========================= */

function renderAll() {
  renderCalendar();
  renderSelectedDate();
  renderEntries();
  renderSummary();
}

/* =========================
   Local storage
========================= */

function saveEntries() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries)
  );
}

function saveAssistantTasks() {
  localStorage.setItem(
    ASSISTANT_TASKS_KEY,
    JSON.stringify(assistantTasks)
  );
}

function loadJson(key, fallbackValue) {
  try {
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      return fallbackValue;
    }

    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue
      : fallbackValue;
  } catch (error) {
    console.error(
      `Αποτυχία φόρτωσης του ${key}:`,
      error
    );

    return fallbackValue;
  }
}

/* =========================
   Βοηθητικές συναρτήσεις
========================= */

function getEntriesForDate(dateKey) {
  return entries.filter(
    (entry) => entry.date === dateKey
  );
}

function calculateEntriesTotal(items) {
  return items.reduce(
    (sum, item) =>
      sum + Number(item.durationSeconds || 0),
    0
  );
}

function calculateDurationSeconds(
  date,
  startTime,
  endTime
) {
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);

  return Math.floor(
    (end.getTime() - start.getTime()) / 1000
  );
}

function addMinutesToTime(
  date,
  time,
  minutesToAdd
) {
  const value = new Date(`${date}T${time}:00`);

  value.setMinutes(
    value.getMinutes() + minutesToAdd
  );

  return formatTimeForInput(value);
}

function addSecondsToTime(
  date,
  time,
  secondsToAdd
) {
  if (!time) {
    return "";
  }

  const value = new Date(`${date}T${time}:00`);

  value.setSeconds(
    value.getSeconds() + secondsToAdd
  );

  return formatTimeForInput(value);
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(
    0,
    Number(totalSeconds || 0)
  );

  const hours = Math.floor(safeSeconds / 3600);

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) =>
      String(value).padStart(2, "0")
    )
    .join(":");
}

function formatCompactDuration(totalSeconds) {
  const totalMinutes = Math.floor(
    totalSeconds / 60
  );

  return formatMinutes(totalMinutes);
}

function formatMinutes(totalMinutes) {
  const safeMinutes = Math.max(
    0,
    Math.round(totalMinutes)
  );

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}ω ${minutes}λ`;
  }

  if (hours > 0) {
    return `${hours}ω`;
  }

  return `${minutes}λ`;
}

function formatDateForInput(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date) {
  const hours = String(
    date.getHours()
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function parseDateInput(dateValue) {
  const [year, month, day] = dateValue
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("el-GR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    `${Date.now()}-` +
    Math.random().toString(16).slice(2)
  );
}

/* =========================
   Service worker
========================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((error) => {
        console.error(
          "Αποτυχία service worker:",
          error
        );
      });
  });
}