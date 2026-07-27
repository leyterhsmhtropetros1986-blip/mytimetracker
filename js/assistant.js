"use strict";

import * as state from "./state.js";
import { PRIORITIES, priorityLabel, priorityWeight } from "./state.js";
import * as ui from "./ui.js";
import {
  createId,
  formatDateForInput,
  formatMinutes,
  timeToMinutes,
  minutesToTime
} from "./utils.js";

let assistantDateInput;
let availableHoursInput;
let assistantStartTimeInput;
let breakMinutesSelect;

let assistantTaskNameInput;
let assistantTaskHoursInput;
let assistantTaskCategorySelect;
let assistantTaskPrioritySelect;
let addAssistantTaskButton;

let assistantTaskList;
let assistantEmptyState;

let generatePlanButton;
let clearAssistantButton;
let savePlanButton;

let messageThread;
let assistantPlanWrapper;
let assistantPlanList;
let assistantUnfitWrapper;
let assistantUnfitList;

let generatedPlan = [];
let unfitTasks = [];

export function init() {
  assistantDateInput = document.getElementById("assistant-date");
  availableHoursInput = document.getElementById("available-hours");
  assistantStartTimeInput = document.getElementById("assistant-start-time");
  breakMinutesSelect = document.getElementById("break-minutes");

  assistantTaskNameInput = document.getElementById("assistant-task-name");
  assistantTaskHoursInput = document.getElementById("assistant-task-hours");
  assistantTaskCategorySelect = document.getElementById("assistant-task-category");
  assistantTaskPrioritySelect = document.getElementById("assistant-task-priority");
  addAssistantTaskButton = document.getElementById("add-assistant-task-button");

  assistantTaskList = document.getElementById("assistant-task-list");
  assistantEmptyState = document.getElementById("assistant-empty-state");

  generatePlanButton = document.getElementById("generate-plan-button");
  clearAssistantButton = document.getElementById("clear-assistant-button");
  savePlanButton = document.getElementById("save-plan-button");

  messageThread = document.getElementById("assistant-message-thread");
  assistantPlanWrapper = document.getElementById("assistant-plan-wrapper");
  assistantPlanList = document.getElementById("assistant-plan-list");
  assistantUnfitWrapper = document.getElementById("assistant-unfit-wrapper");
  assistantUnfitList = document.getElementById("assistant-unfit-list");

  populatePrioritySelect();
  refreshCategoryOptions();

  assistantDateInput.value = formatDateForInput(state.getSelectedDate());

  addAssistantTaskButton.addEventListener("click", addAssistantTask);

  assistantTaskNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addAssistantTask();
    }
  });

  generatePlanButton.addEventListener("click", generateAssistantPlan);
  clearAssistantButton.addEventListener("click", clearAssistant);
  savePlanButton.addEventListener("click", saveGeneratedPlan);
}

function populatePrioritySelect() {
  assistantTaskPrioritySelect.innerHTML = "";

  PRIORITIES.forEach((priority) => {
    const option = document.createElement("option");
    option.value = priority.value;
    option.textContent = priority.label;

    if (priority.value === "medium") {
      option.selected = true;
    }

    assistantTaskPrioritySelect.append(option);
  });
}

export function refreshCategoryOptions() {
  const previousValue = assistantTaskCategorySelect.value;
  assistantTaskCategorySelect.innerHTML = "";

  state.getCategories().forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = `${category.icon} ${category.name}`;
    assistantTaskCategorySelect.append(option);
  });

  assistantTaskCategorySelect.value = previousValue || state.DEFAULT_CATEGORY;
}

/* =========================
   Λίστα tasks προς προγραμματισμό
========================= */

function addAssistantTask() {
  const taskName = assistantTaskNameInput.value.trim();
  const taskHours = Number(assistantTaskHoursInput.value);
  const priority = assistantTaskPrioritySelect.value;
  const category = assistantTaskCategorySelect.value;

  if (!taskName) {
    addBotMessage("Γράψε το όνομα του task.", "error");
    return;
  }

  if (!Number.isFinite(taskHours) || taskHours <= 0) {
    addBotMessage("Συμπλήρωσε σωστά τις ώρες.", "error");
    return;
  }

  state.addAssistantTask({
    taskName,
    category,
    requestedMinutes: Math.round(taskHours * 60),
    priority
  });

  assistantTaskNameInput.value = "";
  assistantTaskHoursInput.value = "1";
  assistantTaskPrioritySelect.value = "medium";
  refreshCategoryOptions();

  resetPlan();
  assistantTaskNameInput.focus();
}

export function render() {
  refreshCategoryOptions();
  renderAssistantTasks();
}

function renderAssistantTasks() {
  const tasks = state.getAssistantTasks();

  assistantTaskList.innerHTML = "";
  assistantTaskList.append(assistantEmptyState);

  ui.toggleEmptyState(assistantEmptyState, tasks.length === 0);

  tasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = "assistant-task-item";

    const details = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = task.taskName;

    const meta = document.createElement("p");
    meta.textContent =
      `${task.category} · ${formatMinutes(task.requestedMinutes)} · ` +
      `${priorityLabel(task.priority)} προτεραιότητα`;

    details.append(title, meta);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "entry-action-button delete";
    removeButton.textContent = "Αφαίρεση";

    removeButton.addEventListener("click", () => {
      state.removeAssistantTask(task.id);
      resetPlan();
    });

    item.append(details, removeButton);
    assistantTaskList.append(item);
  });
}

/* =========================
   Δημιουργία προγράμματος
========================= */

function generateAssistantPlan() {
  const dateKey = assistantDateInput.value;
  const startTime = assistantStartTimeInput.value;
  const availableHours = Number(availableHoursInput.value);
  const breakMinutes = Number(breakMinutesSelect.value);
  const tasks = state.getAssistantTasks();

  if (!dateKey || !startTime) {
    addBotMessage("Συμπλήρωσε ημερομηνία και ώρα έναρξης.", "error");
    return;
  }

  if (!Number.isFinite(availableHours) || availableHours <= 0) {
    addBotMessage("Συμπλήρωσε σωστά τις διαθέσιμες ώρες.", "error");
    return;
  }

  if (tasks.length === 0) {
    addBotMessage("Πρόσθεσε τουλάχιστον ένα task για να φτιάξω πρόγραμμα.", "error");
    return;
  }

  const windowStart = timeToMinutes(startTime);
  const windowEnd = Math.min(windowStart + Math.round(availableHours * 60), 24 * 60);

  const existingEntries = state.getEntriesForDate(dateKey);
  const freeSlots = buildFreeSlots(existingEntries, windowStart, windowEnd);

  const { placed, unfit } = scheduleTasks({ tasks, freeSlots, breakMinutes });

  generatedPlan = placed.map((item) => ({
    id: createId(),
    taskName: item.taskName,
    category: item.category,
    priority: item.priority,
    date: dateKey,
    startTime: minutesToTime(item.startMinutes),
    endTime: minutesToTime(item.endMinutes),
    allocatedMinutes: item.endMinutes - item.startMinutes
  }));

  unfitTasks = unfit;

  renderGeneratedPlan();
  renderUnfitTasks();

  if (freeSlots.length === 0) {
    addBotMessage(
      "Δεν υπάρχει ελεύθερο διάστημα σε αυτό το παράθυρο ώρας — όλη η ώρα καλύπτεται από υπάρχουσες καταχωρήσεις.",
      "warning"
    );
  } else if (unfitTasks.length > 0) {
    addBotMessage(
      `Τοποθέτησα ${generatedPlan.length} από ${tasks.length} tasks χωρίς επικαλύψεις. ${unfitTasks.length} δεν χώρεσαν — τα βλέπεις παρακάτω.`,
      "warning"
    );
  } else {
    addBotMessage("Έτοιμο! Το πρόγραμμα δημιουργήθηκε χωρίς επικαλύψεις με τις υπάρχουσες καταχωρήσεις σου.", "success");
  }
}

/** Ελεύθερα διαστήματα (σε λεπτά από τα μεσάνυχτα) μέσα στο παράθυρο, αφαιρώντας τις υπάρχουσες καταχωρήσεις. */
function buildFreeSlots(existingEntries, windowStart, windowEnd) {
  const busyIntervals = existingEntries
    .map((entry) => ({ start: timeToMinutes(entry.startTime), end: timeToMinutes(entry.endTime) }))
    .filter((interval) => interval.end > windowStart && interval.start < windowEnd)
    .map((interval) => ({
      start: Math.max(interval.start, windowStart),
      end: Math.min(interval.end, windowEnd)
    }))
    .sort((first, second) => first.start - second.start);

  const merged = [];

  busyIntervals.forEach((interval) => {
    const last = merged[merged.length - 1];

    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  });

  const free = [];
  let cursor = windowStart;

  merged.forEach((interval) => {
    if (interval.start > cursor) {
      free.push({ start: cursor, end: interval.start });
    }

    cursor = Math.max(cursor, interval.end);
  });

  if (cursor < windowEnd) {
    free.push({ start: cursor, end: windowEnd });
  }

  return free;
}

/** Τοποθετεί τα tasks (υψηλότερη προτεραιότητα πρώτα) στα πρώτα ελεύθερα διαστήματα που χωράνε. */
function scheduleTasks({ tasks, freeSlots, breakMinutes }) {
  const slots = freeSlots.map((slot) => ({ ...slot, cursor: slot.start, used: false }));

  const orderedTasks = tasks
    .map((task, index) => ({ task, index }))
    .sort((first, second) => priorityWeight(second.task.priority) - priorityWeight(first.task.priority) || first.index - second.index)
    .map((entry) => entry.task);

  const placed = [];
  const unfit = [];

  orderedTasks.forEach((task) => {
    let didPlace = false;

    for (const slot of slots) {
      const breakNeeded = slot.used ? breakMinutes : 0;
      const start = slot.cursor + breakNeeded;
      const end = start + task.requestedMinutes;

      if (end <= slot.end) {
        placed.push({
          taskName: task.taskName,
          category: task.category,
          priority: task.priority,
          startMinutes: start,
          endMinutes: end
        });

        slot.cursor = end;
        slot.used = true;
        didPlace = true;
        break;
      }
    }

    if (!didPlace) {
      unfit.push(task);
    }
  });

  placed.sort((first, second) => first.startMinutes - second.startMinutes);

  return { placed, unfit };
}

/* =========================
   Εμφάνιση προγράμματος (με δυνατότητα επεξεργασίας)
========================= */

function renderGeneratedPlan() {
  assistantPlanList.innerHTML = "";
  assistantPlanWrapper.hidden = generatedPlan.length === 0;

  generatedPlan.forEach((planItem, index) => {
    assistantPlanList.append(createPlanItemElement(planItem, index));
  });
}

function createPlanItemElement(planItem, index) {
  const item = document.createElement("article");
  item.className = "assistant-plan-item";

  const order = document.createElement("span");
  order.className = "plan-order";
  order.textContent = String(index + 1);

  const details = document.createElement("div");
  details.className = "plan-item-details";

  const title = document.createElement("strong");
  title.textContent = `${planItem.taskName} · ${planItem.category}`;

  const timing = document.createElement("div");
  timing.className = "plan-item-timing";

  const startInput = document.createElement("input");
  startInput.type = "time";
  startInput.value = planItem.startTime;
  startInput.setAttribute("aria-label", `Ώρα έναρξης για ${planItem.taskName}`);

  const separator = document.createElement("span");
  separator.textContent = "–";

  const endInput = document.createElement("input");
  endInput.type = "time";
  endInput.value = planItem.endTime;
  endInput.setAttribute("aria-label", `Ώρα λήξης για ${planItem.taskName}`);

  const durationLabel = document.createElement("span");
  durationLabel.className = "plan-item-duration";
  durationLabel.textContent = formatMinutes(planItem.allocatedMinutes);

  function recalculate() {
    const startMinutes = timeToMinutes(startInput.value);
    const endMinutes = timeToMinutes(endInput.value);

    planItem.startTime = startInput.value;
    planItem.endTime = endInput.value;
    planItem.allocatedMinutes = Math.max(0, endMinutes - startMinutes);

    durationLabel.textContent = formatMinutes(planItem.allocatedMinutes);
  }

  startInput.addEventListener("change", recalculate);
  endInput.addEventListener("change", recalculate);

  timing.append(startInput, separator, endInput, durationLabel);
  details.append(title, timing);

  const priority = document.createElement("span");
  priority.className = `priority-badge priority-badge-${planItem.priority}`;
  priority.textContent = priorityLabel(planItem.priority);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "entry-action-button delete";
  removeButton.textContent = "Αφαίρεση";

  removeButton.addEventListener("click", () => {
    generatedPlan = generatedPlan.filter((current) => current.id !== planItem.id);
    renderGeneratedPlan();
  });

  item.append(order, details, priority, removeButton);

  return item;
}

function renderUnfitTasks() {
  assistantUnfitList.innerHTML = "";
  assistantUnfitWrapper.hidden = unfitTasks.length === 0;

  unfitTasks.forEach((task) => {
    const item = document.createElement("li");
    item.textContent = `${task.taskName} (${formatMinutes(task.requestedMinutes)}, ${priorityLabel(task.priority)} προτεραιότητα)`;
    assistantUnfitList.append(item);
  });
}

function saveGeneratedPlan() {
  if (generatedPlan.length === 0) {
    ui.toast("Δεν υπάρχει πρόγραμμα προς αποθήκευση.", "error");
    return;
  }

  const invalidItem = generatedPlan.find((item) => item.allocatedMinutes <= 0);

  if (invalidItem) {
    ui.toast(`Η ώρα λήξης του "${invalidItem.taskName}" πρέπει να είναι μετά την έναρξη.`, "error");
    return;
  }

  state.addEntries(
    generatedPlan.map((planItem) => ({
      taskName: planItem.taskName,
      category: planItem.category,
      status: "scheduled",
      priority: planItem.priority,
      date: planItem.date,
      startTime: planItem.startTime,
      endTime: planItem.endTime,
      notes: `Προτάθηκε από τον βοηθό · ${priorityLabel(planItem.priority)} προτεραιότητα`,
      durationSeconds: planItem.allocatedMinutes * 60,
      source: "assistant"
    }))
  );

  state.setSelectedDate(new Date(`${generatedPlan[0].date}T00:00:00`));

  const savedCount = generatedPlan.length;
  generatedPlan = [];
  unfitTasks = [];

  assistantPlanWrapper.hidden = true;
  assistantUnfitWrapper.hidden = true;

  addBotMessage(`Πρόσθεσα ${savedCount} tasks στο ημερολόγιο. 🎉`, "success");
}

function clearAssistant() {
  state.clearAssistantTasks();
  resetPlan();
}

function resetPlan() {
  generatedPlan = [];
  unfitTasks = [];
  assistantPlanWrapper.hidden = true;
  assistantUnfitWrapper.hidden = true;
  assistantPlanList.innerHTML = "";
  assistantUnfitList.innerHTML = "";
}

function addBotMessage(message, type = "info") {
  const bubble = document.createElement("div");
  bubble.className = "assistant-chat-bubble assistant-chat-bubble-bot";

  const avatar = document.createElement("span");
  avatar.className = "assistant-chat-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = type === "error" ? "⚠️" : type === "warning" ? "🟡" : type === "success" ? "✅" : "✨";

  const content = document.createElement("div");
  content.className = `assistant-chat-content${type !== "info" ? ` assistant-chat-content-${type}` : ""}`;
  content.textContent = message;

  bubble.append(avatar, content);
  messageThread.append(bubble);
  messageThread.scrollTop = messageThread.scrollHeight;
}
