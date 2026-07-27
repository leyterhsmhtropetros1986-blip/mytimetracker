"use strict";

import * as state from "./state.js";
import { statusLabel } from "./state.js";
import { openEditEntryModal } from "./entries.js";
import * as ui from "./ui.js";
import { formatDuration, formatLongDate, addDays } from "./utils.js";

let dateTitle;
let timelineList;
let emptyState;

export function init() {
  dateTitle = document.getElementById("timeline-date-title");
  timelineList = document.getElementById("timeline-list");
  emptyState = document.getElementById("timeline-empty-state");

  document.getElementById("timeline-prev-day").addEventListener("click", () => {
    state.setSelectedDate(addDays(state.getSelectedDate(), -1));
  });

  document.getElementById("timeline-next-day").addEventListener("click", () => {
    state.setSelectedDate(addDays(state.getSelectedDate(), 1));
  });

  document.getElementById("timeline-today-button").addEventListener("click", () => {
    state.setSelectedDate(new Date());
  });
}

export function render() {
  dateTitle.textContent = formatLongDate(state.getSelectedDate());

  const dateKey = state.getSelectedDateKey();

  const dayEntries = state
    .getEntriesForDate(dateKey)
    .sort((first, second) => (first.startTime || "").localeCompare(second.startTime || ""));

  timelineList.innerHTML = "";
  ui.toggleEmptyState(emptyState, dayEntries.length === 0);

  dayEntries.forEach((entry, index) => {
    timelineList.append(createRow(entry, index === dayEntries.length - 1));
  });
}

function createRow(entry, isLast) {
  const row = document.createElement("div");
  row.className = "timeline-row";

  const time = document.createElement("div");
  time.className = "timeline-row-time";
  time.textContent = entry.startTime;

  const rail = document.createElement("div");
  rail.className = "timeline-row-rail";

  const dot = document.createElement("span");
  dot.className = "timeline-row-dot";
  dot.style.background = state.getCategoryMeta(entry.category).color;

  const line = document.createElement("span");
  line.className = "timeline-row-line";

  rail.append(dot, line);

  if (isLast) {
    line.style.visibility = "hidden";
  }

  const card = document.createElement("article");
  card.className = "timeline-item";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Επεξεργασία ${entry.taskName}`);

  const header = document.createElement("div");
  header.className = "timeline-item-header";

  const icon = document.createElement("span");
  icon.className = "timeline-item-icon";
  icon.textContent = state.getCategoryMeta(entry.category).icon;

  const title = document.createElement("span");
  title.className = "timeline-item-title";
  title.textContent = entry.taskName;

  header.append(icon, title);

  const meta = document.createElement("div");
  meta.className = "timeline-item-meta";

  const categoryBadge = document.createElement("span");
  categoryBadge.className = "badge badge-category";
  categoryBadge.textContent = entry.category;

  const statusBadge = document.createElement("span");
  statusBadge.className = `badge badge-status badge-status-${entry.status}`;
  statusBadge.textContent = statusLabel(entry.status);

  const timeRange = document.createElement("span");
  timeRange.textContent = `${entry.startTime} – ${entry.endTime}`;

  const duration = document.createElement("span");
  duration.className = "timeline-item-duration";
  duration.textContent = formatDuration(entry.durationSeconds);

  meta.append(categoryBadge, statusBadge, timeRange, duration);
  card.append(header, meta);

  const activate = () => openEditEntryModal(entry.id);
  card.addEventListener("click", activate);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });

  row.append(time, rail, card);

  return row;
}
