"use strict";

import * as state from "./state.js";
import * as charts from "./charts.js";
import { renderCategoryDonut, renderWeekdayChart, focusRatio } from "./dashboard.js";
import {
  formatDateForInput,
  formatDuration,
  formatShortDate,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  parseDateInput
} from "./utils.js";

let rangeSelect;
let completionRateElement;
let avgDurationElement;
let focusScoreElement;
let topDayElement;
let heatmapContainer;

export function init() {
  rangeSelect = document.getElementById("stats-range-select");
  completionRateElement = document.getElementById("stats-completion-rate");
  avgDurationElement = document.getElementById("stats-avg-duration");
  focusScoreElement = document.getElementById("stats-focus-score");
  topDayElement = document.getElementById("stats-top-day");
  heatmapContainer = document.getElementById("stats-heatmap");

  rangeSelect.addEventListener("change", render);
}

function getRangeBounds(range, now) {
  if (range === "day") {
    const key = formatDateForInput(now);
    return { fromKey: key, toKey: key };
  }

  if (range === "week") {
    const start = startOfWeek(now);
    return { fromKey: formatDateForInput(start), toKey: formatDateForInput(addDays(start, 6)) };
  }

  if (range === "year") {
    return {
      fromKey: formatDateForInput(new Date(now.getFullYear(), 0, 1)),
      toKey: formatDateForInput(new Date(now.getFullYear(), 11, 31))
    };
  }

  return { fromKey: formatDateForInput(startOfMonth(now)), toKey: formatDateForInput(endOfMonth(now)) };
}

export function render() {
  const now = new Date();
  const range = rangeSelect.value || "month";
  const { fromKey, toKey } = getRangeBounds(range, now);

  const entries = state.getEntriesInRange(fromKey, toKey);
  const countable = entries.filter((entry) => entry.status !== "cancelled");
  const doneCount = countable.filter((entry) => entry.status === "done").length;

  completionRateElement.textContent =
    countable.length > 0 ? `${Math.round((doneCount / countable.length) * 100)}%` : "0%";

  avgDurationElement.textContent =
    entries.length > 0 ? formatDuration(state.calculateEntriesTotal(entries) / entries.length) : "00:00:00";

  focusScoreElement.textContent = `${Math.round(focusRatio(entries) * 100)}%`;

  topDayElement.textContent = computeTopDay(entries);

  renderCategoryDonut(entries, document.getElementById("stats-chart-category"));
  renderWeekdayChart(entries, document.getElementById("stats-chart-weekday"));

  renderHeatmap(now);
}

function computeTopDay(entries) {
  if (entries.length === 0) {
    return "—";
  }

  const totals = new Map();

  entries.forEach((entry) => {
    totals.set(entry.date, (totals.get(entry.date) || 0) + Number(entry.durationSeconds || 0));
  });

  let topDate = null;
  let topSeconds = -1;

  totals.forEach((seconds, date) => {
    if (seconds > topSeconds) {
      topSeconds = seconds;
      topDate = date;
    }
  });

  return topDate ? formatShortDate(parseDateInput(topDate)) : "—";
}

function renderHeatmap(now) {
  const totalDays = 371;
  const cells = [];

  for (let index = totalDays - 1; index >= 0; index -= 1) {
    const date = addDays(now, -index);
    const dateKey = formatDateForInput(date);
    const seconds = state.calculateEntriesTotal(state.getEntriesForDate(dateKey));

    cells.push({
      label: formatShortDate(date),
      value: Number((seconds / 3600).toFixed(2))
    });
  }

  charts.renderHeatmap(heatmapContainer, {
    cells,
    formatValue: (value) => `${value}ω`,
    emptyMessage: "Δεν υπάρχουν δεδομένα ακόμα."
  });
}
