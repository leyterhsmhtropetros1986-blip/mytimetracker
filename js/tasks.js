"use strict";

import * as state from "./state.js";
import { STATUSES, PRIORITIES, statusLabel, priorityLabel } from "./state.js";
import * as ui from "./ui.js";
import { openEditEntryModal } from "./entries.js";
import { formatShortDate, formatDuration, parseDateInput, weekdayName, debounce } from "./utils.js";

let fromDateInput;
let toDateInput;
let categorySelect;
let statusSelect;
let prioritySelect;
let tagSelect;
let searchInput;
let resetButton;

let resultsCountElement;
let tasksList;
let tasksEmptyState;

export function init() {
  fromDateInput = document.getElementById("tasks-from-date");
  toDateInput = document.getElementById("tasks-to-date");
  categorySelect = document.getElementById("tasks-category");
  statusSelect = document.getElementById("tasks-status");
  prioritySelect = document.getElementById("tasks-priority");
  tagSelect = document.getElementById("tasks-tag");
  searchInput = document.getElementById("tasks-search");
  resetButton = document.getElementById("tasks-reset-button");

  resultsCountElement = document.getElementById("tasks-results-count");
  tasksList = document.getElementById("tasks-list");
  tasksEmptyState = document.getElementById("tasks-empty-state");

  populateOptions(statusSelect, STATUSES, "Όλα τα status");
  populateOptions(prioritySelect, PRIORITIES, "Όλες οι προτεραιότητες");

  fromDateInput.addEventListener("change", () => state.setHistoryFilters({ fromDate: fromDateInput.value }));
  toDateInput.addEventListener("change", () => state.setHistoryFilters({ toDate: toDateInput.value }));
  categorySelect.addEventListener("change", () => state.setHistoryFilters({ category: categorySelect.value }));
  statusSelect.addEventListener("change", () => state.setHistoryFilters({ status: statusSelect.value }));
  prioritySelect.addEventListener("change", () => state.setHistoryFilters({ priority: prioritySelect.value }));
  tagSelect.addEventListener("change", () => state.setHistoryFilters({ tag: tagSelect.value }));
  searchInput.addEventListener(
    "input",
    debounce(() => state.setHistoryFilters({ search: searchInput.value }), 150)
  );

  resetButton.addEventListener("click", () => {
    state.setHistoryFilters({ fromDate: "", toDate: "", category: "", status: "", priority: "", tag: "", search: "" });
  });
}

function populateOptions(selectElement, options, allLabel) {
  const previousValue = selectElement.value;
  selectElement.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  selectElement.append(allOption);

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    selectElement.append(optionElement);
  });

  selectElement.value = previousValue;
}

function refreshDynamicOptions() {
  const categoryOptions = state.getCategories().map((category) => ({
    value: category.name,
    label: `${category.icon} ${category.name}`
  }));

  populateOptions(categorySelect, categoryOptions, "Όλες οι κατηγορίες");

  const tagOptions = state.getAllTags().map((tag) => ({ value: tag, label: `#${tag}` }));
  populateOptions(tagSelect, tagOptions, "Όλες οι ετικέτες");
}

export function render() {
  refreshDynamicOptions();

  const filters = state.getHistoryFilters();

  fromDateInput.value = filters.fromDate;
  toDateInput.value = filters.toDate;
  categorySelect.value = filters.category;
  statusSelect.value = filters.status;
  prioritySelect.value = filters.priority;
  tagSelect.value = filters.tag;

  if (document.activeElement !== searchInput) {
    searchInput.value = filters.search;
  }

  const results = state.getFilteredEntries();

  resultsCountElement.textContent = results.length === 1 ? "1 task" : `${results.length} tasks`;

  ui.toggleEmptyState(tasksEmptyState, results.length === 0);

  tasksList.innerHTML = "";

  const fragment = document.createDocumentFragment();

  results.forEach((entry) => {
    fragment.append(createTaskRow(entry));
  });

  tasksList.append(fragment);
}

function createTaskRow(entry) {
  const row = document.createElement("article");
  row.className = "history-row";

  const dateCell = document.createElement("div");
  dateCell.className = "history-cell history-cell-date";

  const dateStrong = document.createElement("strong");
  dateStrong.textContent = formatShortDate(parseDateInput(entry.date));

  const dateSmall = document.createElement("span");
  dateSmall.textContent = weekdayName(parseDateInput(entry.date));

  dateCell.append(dateStrong, dateSmall);

  const taskCell = document.createElement("div");
  taskCell.className = "history-cell history-cell-task";

  const taskStrong = document.createElement("strong");
  taskStrong.textContent = entry.taskName;

  const taskSmall = document.createElement("span");
  taskSmall.textContent = `${entry.startTime} – ${entry.endTime}`;

  taskCell.append(taskStrong, taskSmall);

  const badgesCell = document.createElement("div");
  badgesCell.className = "history-cell history-cell-badges";

  const categoryMeta = state.getCategoryMeta(entry.category);
  const categoryBadge = document.createElement("span");
  categoryBadge.className = "badge badge-category";
  categoryBadge.textContent = `${categoryMeta.icon} ${entry.category}`;

  const statusBadge = document.createElement("span");
  statusBadge.className = `badge badge-status badge-status-${entry.status}`;
  statusBadge.textContent = statusLabel(entry.status);

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge-priority badge-priority-${entry.priority || "medium"}`;
  priorityBadge.textContent = priorityLabel(entry.priority || "medium");

  badgesCell.append(categoryBadge, statusBadge, priorityBadge);

  const durationCell = document.createElement("div");
  durationCell.className = "history-cell history-cell-duration";
  durationCell.textContent = formatDuration(entry.durationSeconds);

  const actionsCell = document.createElement("div");
  actionsCell.className = "history-cell history-cell-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "entry-action-button edit";
  editButton.textContent = "Επεξεργασία";

  editButton.addEventListener("click", () => {
    state.setSelectedDate(parseDateInput(entry.date));
    openEditEntryModal(entry.id);
  });

  actionsCell.append(editButton);

  row.append(dateCell, taskCell, badgesCell, durationCell, actionsCell);

  return row;
}
