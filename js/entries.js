"use strict";

import * as state from "./state.js";
import { STATUSES, PRIORITIES, statusLabel, priorityLabel } from "./state.js";
import * as ui from "./ui.js";
import {
  formatDateForInput,
  formatDuration,
  calculateDurationSeconds,
  parseDateInput,
  addDays
} from "./utils.js";

const MAX_RECURRING_OCCURRENCES = 8;

let entryModal;
let entryModalTitle;
let entryIdInput;
let entryDateInput;
let entryTaskNameInput;
let entryDescriptionInput;
let entryCategorySelect;
let entryStatusSelect;
let entryPrioritySelect;
let entryLocationInput;
let entryStartTimeInput;
let entryEndTimeInput;
let entryEstimatedMinutesInput;
let entryCompletionPercentInput;
let entryCompletionPercentValue;
let entryTagsInput;
let entryTagsTextInput;
let entryRecurringToggle;
let entryRecurringFrequency;
let entryReminderToggle;
let entryReminderMinutes;
let entryNotesInput;

let entriesList;
let emptyState;
let clearDayButton;

let todayTotalElement;
let selectedDayTotalElement;
let selectedDayCountElement;

let currentTags = [];

export function init() {
  entryModal = document.getElementById("entry-modal");
  entryModalTitle = document.getElementById("entry-modal-title");
  entryIdInput = document.getElementById("entry-id");
  entryDateInput = document.getElementById("entry-date");
  entryTaskNameInput = document.getElementById("entry-task-name");
  entryDescriptionInput = document.getElementById("entry-description");
  entryCategorySelect = document.getElementById("entry-category");
  entryStatusSelect = document.getElementById("entry-status");
  entryPrioritySelect = document.getElementById("entry-priority");
  entryLocationInput = document.getElementById("entry-location");
  entryStartTimeInput = document.getElementById("entry-start-time");
  entryEndTimeInput = document.getElementById("entry-end-time");
  entryEstimatedMinutesInput = document.getElementById("entry-estimated-minutes");
  entryCompletionPercentInput = document.getElementById("entry-completion-percent");
  entryCompletionPercentValue = document.getElementById("entry-completion-percent-value");
  entryTagsInput = document.getElementById("entry-tags-input");
  entryTagsTextInput = document.getElementById("entry-tags-text-input");
  entryRecurringToggle = document.getElementById("entry-recurring-toggle");
  entryRecurringFrequency = document.getElementById("entry-recurring-frequency");
  entryReminderToggle = document.getElementById("entry-reminder-toggle");
  entryReminderMinutes = document.getElementById("entry-reminder-minutes");
  entryNotesInput = document.getElementById("entry-notes");

  entriesList = document.getElementById("entries-list");
  emptyState = document.getElementById("empty-state");
  clearDayButton = document.getElementById("clear-day-button");

  todayTotalElement = document.getElementById("today-total");
  selectedDayTotalElement = document.getElementById("selected-day-total");
  selectedDayCountElement = document.getElementById("selected-day-count");

  populateSelect(entryStatusSelect, STATUSES);
  populateSelect(entryPrioritySelect, PRIORITIES);
  refreshCategoryOptions();

  ui.wireModalDismissal(entryModal);

  document.getElementById("toolbar-new-entry-button").addEventListener("click", openNewEntryModal);
  document.getElementById("fab-new-entry-button").addEventListener("click", openNewEntryModal);
  document.getElementById("close-modal-button").addEventListener("click", () => ui.closeModal(entryModal));
  document.getElementById("cancel-modal-button").addEventListener("click", () => ui.closeModal(entryModal));
  document.getElementById("save-entry-button").addEventListener("click", saveEntry);

  clearDayButton.addEventListener("click", handleClearDay);

  entryCompletionPercentInput.addEventListener("input", () => {
    entryCompletionPercentValue.textContent = `${entryCompletionPercentInput.value}%`;
  });

  entryRecurringToggle.addEventListener("change", () => {
    entryRecurringFrequency.disabled = !entryRecurringToggle.checked;
  });

  entryReminderToggle.addEventListener("change", () => {
    entryReminderMinutes.disabled = !entryReminderToggle.checked;
  });

  entryTagsTextInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTagFromInput();
    } else if (event.key === "Backspace" && !entryTagsTextInput.value && currentTags.length > 0) {
      currentTags.pop();
      renderTagChips();
    }
  });

  entryTagsTextInput.addEventListener("blur", commitTagFromInput);
}

function populateSelect(selectElement, options) {
  selectElement.innerHTML = "";

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    selectElement.append(optionElement);
  });
}

export function refreshCategoryOptions() {
  entryCategorySelect.innerHTML = "";

  state.getCategories().forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = `${category.icon} ${category.name}`;
    entryCategorySelect.append(option);
  });
}

/* =========================
   Ετικέτες (tags)
========================= */

function commitTagFromInput() {
  const raw = entryTagsTextInput.value.trim().replace(/,$/, "");

  if (!raw) {
    return;
  }

  if (!currentTags.some((tag) => tag.toLowerCase() === raw.toLowerCase())) {
    currentTags.push(raw);
  }

  entryTagsTextInput.value = "";
  renderTagChips();
}

function renderTagChips() {
  entryTagsInput.querySelectorAll(".tag-chip").forEach((chip) => chip.remove());

  currentTags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";

    const label = document.createElement("span");
    label.textContent = tag;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Αφαίρεση ετικέτας ${tag}`);
    removeButton.textContent = "×";

    removeButton.addEventListener("click", () => {
      currentTags = currentTags.filter((existing) => existing !== tag);
      renderTagChips();
    });

    chip.append(label, removeButton);
    entryTagsInput.insertBefore(chip, entryTagsTextInput);
  });
}

/* =========================
   Modal
========================= */

function openNewEntryModal() {
  entryModalTitle.textContent = "Νέο task";

  entryIdInput.value = "";
  entryDateInput.value = formatDateForInput(state.getSelectedDate());

  entryTaskNameInput.value = "";
  entryDescriptionInput.value = "";
  refreshCategoryOptions();
  entryCategorySelect.value = state.DEFAULT_CATEGORY;
  entryStatusSelect.value = state.DEFAULT_STATUS;
  entryPrioritySelect.value = state.DEFAULT_PRIORITY;
  entryLocationInput.value = "";
  entryStartTimeInput.value = "09:00";
  entryEndTimeInput.value = "10:00";
  entryEstimatedMinutesInput.value = "";
  entryCompletionPercentInput.value = "0";
  entryCompletionPercentValue.textContent = "0%";
  entryRecurringToggle.checked = false;
  entryRecurringFrequency.disabled = true;
  entryRecurringFrequency.value = "weekly";
  entryReminderToggle.checked = false;
  entryReminderMinutes.disabled = true;
  entryReminderMinutes.value = "10";
  entryNotesInput.value = "";
  currentTags = [];
  renderTagChips();

  ui.openModal(entryModal, entryTaskNameInput);
}

export function openEditEntryModal(entryId) {
  const entry = state.findEntry(entryId);

  if (!entry) {
    return;
  }

  entryModalTitle.textContent = "Επεξεργασία task";

  entryIdInput.value = entry.id;
  entryDateInput.value = entry.date;
  entryTaskNameInput.value = entry.taskName;
  entryDescriptionInput.value = entry.description || "";
  refreshCategoryOptions();
  entryCategorySelect.value = entry.category;
  entryStatusSelect.value = entry.status;
  entryPrioritySelect.value = entry.priority || state.DEFAULT_PRIORITY;
  entryLocationInput.value = entry.location || "";
  entryStartTimeInput.value = entry.startTime || "09:00";
  entryEndTimeInput.value = entry.endTime || "10:00";
  entryEstimatedMinutesInput.value = entry.estimatedMinutes || "";
  entryCompletionPercentInput.value = String(entry.completionPercent || 0);
  entryCompletionPercentValue.textContent = `${entry.completionPercent || 0}%`;

  const recurring = entry.recurring || { enabled: false, frequency: "weekly" };
  entryRecurringToggle.checked = Boolean(recurring.enabled);
  entryRecurringFrequency.disabled = !recurring.enabled;
  entryRecurringFrequency.value = recurring.frequency || "weekly";

  const reminder = entry.reminder || { enabled: false, minutesBefore: 10 };
  entryReminderToggle.checked = Boolean(reminder.enabled);
  entryReminderMinutes.disabled = !reminder.enabled;
  entryReminderMinutes.value = String(reminder.minutesBefore || 10);

  entryNotesInput.value = entry.notes || "";
  currentTags = [...(entry.tags || [])];
  renderTagChips();

  ui.openModal(entryModal, entryTaskNameInput);
}

function collectFormValues() {
  commitTagFromInput();

  const estimatedMinutes = Number(entryEstimatedMinutesInput.value);

  return {
    taskName: entryTaskNameInput.value.trim(),
    description: entryDescriptionInput.value.trim(),
    category: entryCategorySelect.value,
    status: entryStatusSelect.value,
    priority: entryPrioritySelect.value,
    location: entryLocationInput.value.trim(),
    date: entryDateInput.value,
    startTime: entryStartTimeInput.value,
    endTime: entryEndTimeInput.value,
    estimatedMinutes: Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? Math.round(estimatedMinutes) : null,
    completionPercent: Number(entryCompletionPercentInput.value),
    tags: [...currentTags],
    recurring: {
      enabled: entryRecurringToggle.checked,
      frequency: entryRecurringFrequency.value,
      groupId: null
    },
    reminder: {
      enabled: entryReminderToggle.checked,
      minutesBefore: Number(entryReminderMinutes.value) || 10,
      firedAt: null
    },
    notes: entryNotesInput.value.trim()
  };
}

function nextRecurringDate(date, frequency) {
  if (frequency === "daily") {
    return addDays(date, 1);
  }

  if (frequency === "monthly") {
    const targetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const lastDayOfTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    targetMonth.setDate(Math.min(date.getDate(), lastDayOfTargetMonth));
    return targetMonth;
  }

  return addDays(date, 7);
}

function saveEntry() {
  const entryId = entryIdInput.value;
  const values = collectFormValues();

  if (!values.taskName) {
    ui.toast("Γράψε τι θέλεις να κάνεις.", "error");
    entryTaskNameInput.focus();
    return;
  }

  if (!values.date || !values.startTime || !values.endTime) {
    ui.toast("Συμπλήρωσε ημερομηνία και ώρες.", "error");
    return;
  }

  const durationSeconds = calculateDurationSeconds(values.date, values.startTime, values.endTime);

  if (durationSeconds <= 0) {
    ui.toast("Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.", "error");
    return;
  }

  const baseData = { ...values, durationSeconds };

  if (entryId) {
    state.updateEntry(entryId, { ...baseData, source: "edited" });
    state.setSelectedDate(parseDateInput(values.date));
    ui.closeModal(entryModal);
    ui.toast("Το task ενημερώθηκε.", "success");
    return;
  }

  if (baseData.recurring.enabled) {
    const groupId = crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}`;
    const occurrences = [];
    let cursorDate = parseDateInput(values.date);

    for (let index = 0; index < MAX_RECURRING_OCCURRENCES; index += 1) {
      const isFirst = index === 0;

      occurrences.push({
        ...baseData,
        date: formatDateForInput(cursorDate),
        status: isFirst ? baseData.status : "scheduled",
        completionPercent: isFirst ? baseData.completionPercent : 0,
        recurring: { ...baseData.recurring, groupId },
        source: "manual"
      });

      cursorDate = nextRecurringDate(cursorDate, baseData.recurring.frequency);
    }

    state.addEntries(occurrences);
    ui.toast(`Δημιουργήθηκαν ${occurrences.length} επαναλαμβανόμενα tasks.`, "success");
  } else {
    state.addEntry({ ...baseData, source: "manual" });
    ui.toast("Το task αποθηκεύτηκε.", "success");
  }

  state.setSelectedDate(parseDateInput(values.date));
  ui.closeModal(entryModal);
}

/* =========================
   Λίστα καταχωρήσεων ημέρας
========================= */

export function render() {
  refreshCategoryOptions();
  renderEntriesList();
  renderSummaryStrip();
}

function renderEntriesList() {
  entriesList.innerHTML = "";

  const selectedDateKey = state.getSelectedDateKey();

  const dayEntries = state
    .getEntriesForDate(selectedDateKey)
    .sort((firstEntry, secondEntry) => (firstEntry.startTime || "").localeCompare(secondEntry.startTime || ""));

  ui.toggleEmptyState(emptyState, dayEntries.length === 0);
  clearDayButton.disabled = dayEntries.length === 0;

  const fragment = document.createDocumentFragment();

  dayEntries.forEach((entry) => {
    fragment.append(createEntryElement(entry));
  });

  entriesList.append(fragment);
}

function createEntryElement(entry) {
  const article = document.createElement("article");
  article.className = "entry-item";

  const information = document.createElement("div");

  const badges = document.createElement("div");
  badges.className = "entry-badges";

  const categoryMeta = state.getCategoryMeta(entry.category);
  const categoryBadge = document.createElement("span");
  categoryBadge.className = "badge badge-category";
  categoryBadge.style.background = `${categoryMeta.color}1f`;
  categoryBadge.style.color = categoryMeta.color;
  categoryBadge.textContent = `${categoryMeta.icon} ${entry.category}`;

  const statusBadge = document.createElement("span");
  statusBadge.className = `badge badge-status badge-status-${entry.status}`;
  statusBadge.textContent = statusLabel(entry.status);

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge-priority badge-priority-${entry.priority || "medium"}`;
  priorityBadge.textContent = priorityLabel(entry.priority || "medium");

  badges.append(categoryBadge, statusBadge, priorityBadge);

  if (entry.recurring && entry.recurring.enabled) {
    const recurringBadge = document.createElement("span");
    recurringBadge.className = "badge badge-tag";
    recurringBadge.textContent = "🔁 επαναλαμβανόμενο";
    badges.append(recurringBadge);
  }

  const title = document.createElement("h3");
  title.className = "entry-title";
  title.textContent = entry.taskName;

  const meta = document.createElement("p");
  meta.className = "entry-meta";

  const metaParts = [`${entry.startTime} – ${entry.endTime}`];

  if (entry.location) {
    metaParts.push(`📍 ${entry.location}`);
  }

  meta.textContent = metaParts.join(" · ");

  information.append(badges, title, meta);

  if (entry.description) {
    const description = document.createElement("p");
    description.className = "entry-notes";
    description.textContent = entry.description;
    information.append(description);
  }

  if (entry.tags && entry.tags.length > 0) {
    const tagsRow = document.createElement("div");
    tagsRow.className = "entry-badges";
    tagsRow.style.marginTop = "8px";

    entry.tags.forEach((tag) => {
      const tagBadge = document.createElement("span");
      tagBadge.className = "badge badge-tag";
      tagBadge.textContent = `#${tag}`;
      tagsRow.append(tagBadge);
    });

    information.append(tagsRow);
  }

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
  duration.textContent = formatDuration(entry.durationSeconds);

  const actions = document.createElement("div");
  actions.className = "entry-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "entry-action-button edit";
  editButton.textContent = "Επεξεργασία";
  editButton.addEventListener("click", () => openEditEntryModal(entry.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "entry-action-button delete";
  deleteButton.textContent = "Διαγραφή";
  deleteButton.addEventListener("click", () => handleDeleteEntry(entry));

  actions.append(editButton, deleteButton);
  rightSection.append(duration, actions);

  article.append(information, rightSection);

  return article;
}

async function handleDeleteEntry(entry) {
  const confirmed = await ui.confirmDialog({
    title: "Διαγραφή task",
    message: `Να διαγραφεί το task "${entry.taskName}";`,
    confirmText: "Διαγραφή",
    danger: true
  });

  if (!confirmed) {
    return;
  }

  state.deleteEntry(entry.id);
  ui.toast("Το task διαγράφηκε.", "success");
}

async function handleClearDay() {
  const selectedDateKey = state.getSelectedDateKey();

  const confirmed = await ui.confirmDialog({
    title: "Διαγραφή ημέρας",
    message: "Να διαγραφούν όλες οι καταχωρήσεις αυτής της ημέρας;",
    confirmText: "Διαγραφή όλων",
    danger: true
  });

  if (!confirmed) {
    return;
  }

  state.deleteEntriesForDate(selectedDateKey);
  ui.toast("Οι καταχωρήσεις της ημέρας διαγράφηκαν.", "success");
}

function renderSummaryStrip() {
  const todayKey = formatDateForInput(new Date());
  const selectedDateKey = state.getSelectedDateKey();

  const todayEntries = state.getEntriesForDate(todayKey);
  const selectedEntries = state.getEntriesForDate(selectedDateKey);

  todayTotalElement.textContent = formatDuration(state.calculateEntriesTotal(todayEntries));
  selectedDayTotalElement.textContent = formatDuration(state.calculateEntriesTotal(selectedEntries));
  selectedDayCountElement.textContent = String(selectedEntries.length);
}
