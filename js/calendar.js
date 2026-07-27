"use strict";

import * as state from "./state.js";
import { openEditEntryModal } from "./entries.js";
import {
  formatDateForInput,
  formatCompactDuration,
  formatDuration,
  formatLongDate,
  isSameDay,
  startOfWeek,
  addDays
} from "./utils.js";

let calendarGrid;
let calendarMonthSelect;
let calendarYearSelect;
let previousMonthButton;
let nextMonthButton;
let todayButton;
let selectedDateTitle;
let entriesDateLabel;
let monthViewButton;
let weekViewButton;
let monthViewWrapper;
let weekViewWrapper;
let weekGrid;

let activeView = "month";

const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("el-GR", { month: "long" }).format(new Date(2000, index, 1))
);

export function init() {
  calendarGrid = document.getElementById("calendar-grid");
  calendarMonthSelect = document.getElementById("calendar-month-select");
  calendarYearSelect = document.getElementById("calendar-year-select");
  previousMonthButton = document.getElementById("previous-month-button");
  nextMonthButton = document.getElementById("next-month-button");
  todayButton = document.getElementById("today-button");
  selectedDateTitle = document.getElementById("selected-date-title");
  entriesDateLabel = document.getElementById("entries-date-label");
  monthViewButton = document.getElementById("calendar-view-month-button");
  weekViewButton = document.getElementById("calendar-view-week-button");
  monthViewWrapper = document.getElementById("calendar-month-view");
  weekViewWrapper = document.getElementById("calendar-week-view");
  weekGrid = document.getElementById("calendar-week-grid");

  populateMonthYearSelects();

  previousMonthButton.addEventListener("click", () => {
    const calendarDate = state.getCalendarDate();
    state.setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  });

  nextMonthButton.addEventListener("click", () => {
    const calendarDate = state.getCalendarDate();
    state.setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  });

  calendarMonthSelect.addEventListener("change", () => {
    const calendarDate = state.getCalendarDate();
    state.setCalendarDate(new Date(calendarDate.getFullYear(), Number(calendarMonthSelect.value), 1));
  });

  calendarYearSelect.addEventListener("change", () => {
    const calendarDate = state.getCalendarDate();
    state.setCalendarDate(new Date(Number(calendarYearSelect.value), calendarDate.getMonth(), 1));
  });

  todayButton.addEventListener("click", () => {
    state.setSelectedDate(new Date());
  });

  monthViewButton.addEventListener("click", () => setView("month"));
  weekViewButton.addEventListener("click", () => setView("week"));
}

function setView(view) {
  activeView = view;

  monthViewButton.classList.toggle("active", view === "month");
  weekViewButton.classList.toggle("active", view === "week");
  monthViewWrapper.hidden = view !== "month";
  weekViewWrapper.hidden = view !== "week";

  render();
}

function populateMonthYearSelects() {
  calendarMonthSelect.innerHTML = "";

  MONTH_NAMES.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = name;
    calendarMonthSelect.append(option);
  });

  const currentYear = new Date().getFullYear();
  calendarYearSelect.innerHTML = "";

  for (let year = currentYear - 6; year <= currentYear + 6; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    calendarYearSelect.append(option);
  }
}

export function render() {
  const calendarDate = state.getCalendarDate();
  calendarMonthSelect.value = String(calendarDate.getMonth());
  calendarYearSelect.value = String(calendarDate.getFullYear());

  if (activeView === "week") {
    renderWeek();
  } else {
    renderMonthGrid();
  }

  renderSelectedDateHeading();
}

function dayStatusSummary(dayEntries, date) {
  if (dayEntries.length === 0) {
    return { categories: [], icon: "", isOverdue: false };
  }

  const categoryNames = Array.from(new Set(dayEntries.map((entry) => entry.category))).slice(0, 4);

  const isPastDay = date < startOfDayLocal(new Date());
  const hasUnresolved = dayEntries.some((entry) => entry.status === "scheduled" || entry.status === "in_progress");
  const allDone = dayEntries.every((entry) => entry.status === "done");
  const isOverdue = isPastDay && hasUnresolved;

  let icon = "";

  if (isOverdue) {
    icon = "⚠️";
  } else if (allDone) {
    icon = "✅";
  } else if (dayEntries.some((entry) => entry.status === "in_progress")) {
    icon = "⏳";
  }

  return { categories: categoryNames, icon, isOverdue };
}

function startOfDayLocal(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function renderMonthGrid() {
  calendarGrid.innerHTML = "";

  const calendarDate = state.getCalendarDate();
  const selectedDate = state.getSelectedDate();

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const mondayBasedIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const firstCalendarDate = new Date(year, month, 1 - mondayBasedIndex);

  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 42; index += 1) {
    const currentDate = new Date(firstCalendarDate);
    currentDate.setDate(firstCalendarDate.getDate() + index);

    fragment.append(createCalendarDay(currentDate, month, selectedDate));
  }

  calendarGrid.append(fragment);
}

function createCalendarDay(date, visibleMonth, selectedDate) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "calendar-day";

  const dateKey = formatDateForInput(date);
  const dayEntries = state.getEntriesForDate(dateKey);
  const totalSeconds = state.calculateEntriesTotal(dayEntries);
  const summary = dayStatusSummary(dayEntries, date);

  if (date.getMonth() !== visibleMonth) {
    button.classList.add("other-month");
  }

  if (isSameDay(date, new Date())) {
    button.classList.add("today");
  }

  if (summary.isOverdue) {
    button.classList.add("overdue");
  }

  if (isSameDay(date, selectedDate)) {
    button.classList.add("selected");
    button.setAttribute("aria-current", "date");
  }

  const dayNumber = document.createElement("span");
  dayNumber.className = "calendar-day-number";
  dayNumber.textContent = String(date.getDate());

  button.append(dayNumber);

  if (summary.icon) {
    const statusIcon = document.createElement("span");
    statusIcon.className = "calendar-day-status-icon";
    statusIcon.textContent = summary.icon;
    button.append(statusIcon);
  }

  if (dayEntries.length > 0) {
    const totalElement = document.createElement("span");
    totalElement.className = "calendar-day-total";
    totalElement.textContent = formatCompactDuration(totalSeconds);
    button.append(totalElement);

    const categoriesRow = document.createElement("span");
    categoriesRow.className = "calendar-day-categories";

    summary.categories.forEach((categoryName) => {
      const dot = document.createElement("span");
      dot.className = "calendar-day-category-dot";
      dot.style.background = state.getCategoryMeta(categoryName).color;
      categoriesRow.append(dot);
    });

    button.append(categoriesRow);
  }

  button.setAttribute("aria-label", formatLongDate(date));

  button.addEventListener("click", () => {
    state.setSelectedDate(date);
  });

  return button;
}

function renderWeek() {
  weekGrid.innerHTML = "";

  const selectedDate = state.getSelectedDate();
  const weekStart = startOfWeek(state.getCalendarDate());

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(weekStart, index);
    weekGrid.append(createWeekColumn(date, selectedDate));
  }
}

function createWeekColumn(date, selectedDate) {
  const column = document.createElement("div");
  column.className = "calendar-week-column";

  if (isSameDay(date, new Date())) {
    column.classList.add("today");
  }

  const header = document.createElement("div");
  header.className = "calendar-week-column-header";

  const dayNumber = document.createElement("strong");
  dayNumber.textContent = String(date.getDate());

  const weekdayLabel = document.createElement("span");
  weekdayLabel.textContent = new Intl.DateTimeFormat("el-GR", { weekday: "short" }).format(date);

  header.append(dayNumber, weekdayLabel);
  header.addEventListener("click", () => state.setSelectedDate(date));
  column.append(header);

  const dateKey = formatDateForInput(date);

  const dayEntries = state
    .getEntriesForDate(dateKey)
    .sort((first, second) => (first.startTime || "").localeCompare(second.startTime || ""));

  dayEntries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "calendar-week-entry";
    item.style.borderLeftColor = state.getCategoryMeta(entry.category).color;

    const title = document.createElement("strong");
    title.textContent = entry.taskName;

    const time = document.createElement("span");
    time.textContent = `${entry.startTime}–${entry.endTime} · ${formatDuration(entry.durationSeconds)}`;

    item.append(title, time);

    item.addEventListener("click", () => {
      state.setSelectedDate(date);
      openEditEntryModal(entry.id);
    });

    column.append(item);
  });

  return column;
}

function renderSelectedDateHeading() {
  const formattedDate = formatLongDate(state.getSelectedDate());

  selectedDateTitle.textContent = formattedDate;
  entriesDateLabel.textContent = formattedDate;
}
