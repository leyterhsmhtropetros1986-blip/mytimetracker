"use strict";

import * as state from "./state.js";
import * as charts from "./charts.js";
import {
  formatDateForInput,
  formatDuration,
  formatHoursDecimal,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  parseDateInput
} from "./utils.js";

const WEEKDAY_LABELS = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];
const IDEAL_BLOCK_MINUTES = 60;

let elements = {};

export function init() {
  elements = {
    todayHours: document.getElementById("kpi-today-hours"),
    todayTrend: document.getElementById("kpi-today-hours-trend"),
    weekHours: document.getElementById("kpi-week-hours"),
    weekTrend: document.getElementById("kpi-week-hours-trend"),
    monthHours: document.getElementById("kpi-month-hours"),
    remainingTarget: document.getElementById("kpi-remaining-target"),
    remainingTargetSub: document.getElementById("kpi-remaining-target-sub"),
    completedTasks: document.getElementById("kpi-completed-tasks"),
    pendingTasks: document.getElementById("kpi-pending-tasks"),
    topCategory: document.getElementById("kpi-top-category"),
    productivityScore: document.getElementById("kpi-productivity-score"),
    productivityTrend: document.getElementById("kpi-productivity-trend"),
    avgDuration: document.getElementById("kpi-avg-duration"),
    streak: document.getElementById("kpi-streak"),
    focusScore: document.getElementById("kpi-focus-score"),
    recentList: document.getElementById("dashboard-recent-activity"),
    recentEmpty: document.getElementById("dashboard-recent-empty")
  };
}

function completionRatio(entries) {
  const countable = entries.filter((entry) => entry.status !== "cancelled");
  const total = state.calculateEntriesTotal(countable);

  if (total === 0) {
    return 0;
  }

  const done = state.calculateEntriesTotal(countable.filter((entry) => entry.status === "done"));
  return done / total;
}

export function focusRatio(entries) {
  if (entries.length === 0) {
    return 0;
  }

  const avgMinutes = state.calculateEntriesTotal(entries) / 60 / entries.length;
  return Math.min(1, avgMinutes / IDEAL_BLOCK_MINUTES);
}

function computeStreak() {
  let streak = 0;
  let cursor = new Date();

  const todayKey = formatDateForInput(cursor);
  const hasToday = state.getEntriesForDate(todayKey).length > 0;

  if (!hasToday) {
    cursor = addDays(cursor, -1);
  }

  for (let i = 0; i < 365; i += 1) {
    const dateKey = formatDateForInput(cursor);

    if (state.getEntriesForDate(dateKey).length === 0) {
      break;
    }

    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function mostProductiveCategory(entries) {
  if (entries.length === 0) {
    return null;
  }

  const totals = new Map();

  entries.forEach((entry) => {
    totals.set(entry.category, (totals.get(entry.category) || 0) + Number(entry.durationSeconds || 0));
  });

  let topCategory = null;
  let topSeconds = -1;

  totals.forEach((seconds, category) => {
    if (seconds > topSeconds) {
      topSeconds = seconds;
      topCategory = category;
    }
  });

  return topCategory;
}

export function render() {
  const now = new Date();
  const todayKey = formatDateForInput(now);

  const weekStart = startOfWeek(now);
  const weekStartKey = formatDateForInput(weekStart);
  const weekEndKey = formatDateForInput(addDays(weekStart, 6));

  const monthStartKey = formatDateForInput(startOfMonth(now));
  const monthEndKey = formatDateForInput(endOfMonth(now));

  const todayEntries = state.getEntriesForDate(todayKey);
  const weekEntries = state.getEntriesInRange(weekStartKey, weekEndKey);
  const monthEntries = state.getEntriesInRange(monthStartKey, monthEndKey);

  elements.todayHours.textContent = formatDuration(state.calculateEntriesTotal(todayEntries));
  elements.weekHours.textContent = formatDuration(state.calculateEntriesTotal(weekEntries));
  elements.monthHours.textContent = formatDuration(state.calculateEntriesTotal(monthEntries));

  const preferences = state.getPreferences();
  const weekSeconds = state.calculateEntriesTotal(weekEntries);
  const remainingSeconds = preferences.weeklyTargetMinutes * 60 - weekSeconds;

  if (remainingSeconds > 0) {
    elements.remainingTarget.textContent = formatDuration(remainingSeconds);
    elements.remainingTargetSub.textContent = `από στόχο ${preferences.weeklyTargetMinutes / 60}ω/εβδομάδα`;
  } else {
    elements.remainingTarget.textContent = `+${formatDuration(-remainingSeconds)}`;
    elements.remainingTargetSub.textContent = "πάνω από τον στόχο 🎉";
  }

  const completed = monthEntries.filter((entry) => entry.status === "done");
  const pending = monthEntries.filter((entry) => entry.status === "scheduled" || entry.status === "in_progress" || entry.status === "delayed");

  elements.completedTasks.textContent = String(completed.length);
  elements.pendingTasks.textContent = String(pending.length);

  const topCategory = mostProductiveCategory(monthEntries);
  elements.topCategory.textContent = topCategory || "—";

  elements.productivityScore.textContent = `${Math.round(completionRatio(monthEntries) * 100)}%`;

  elements.avgDuration.textContent =
    monthEntries.length > 0
      ? formatDuration(state.calculateEntriesTotal(monthEntries) / monthEntries.length)
      : "00:00:00";

  elements.streak.textContent = `${computeStreak()} ημέρες`;
  elements.focusScore.textContent = `${Math.round(focusRatio(monthEntries) * 100)}%`;

  renderRecentActivity();
  renderTrends(now);
  renderCharts(now, monthEntries);
}

function renderRecentActivity() {
  const recent = [...state.getEntries()]
    .sort((first, second) => {
      const firstTime = first.updatedAt || first.createdAt || "";
      const secondTime = second.updatedAt || second.createdAt || "";
      return secondTime.localeCompare(firstTime);
    })
    .slice(0, 6);

  elements.recentList.innerHTML = "";
  elements.recentEmpty.hidden = recent.length > 0;

  recent.forEach((entry) => {
    const categoryMeta = state.getCategoryMeta(entry.category);

    const item = document.createElement("article");
    item.className = "recent-activity-item";

    const icon = document.createElement("span");
    icon.className = "recent-activity-icon";
    icon.style.background = `${categoryMeta.color}22`;
    icon.textContent = categoryMeta.icon;

    const info = document.createElement("div");

    const title = document.createElement("p");
    title.className = "recent-activity-title";
    title.textContent = entry.taskName;

    const meta = document.createElement("p");
    meta.className = "recent-activity-meta";
    meta.textContent = `${entry.date} · ${entry.startTime}–${entry.endTime} · ${entry.category}`;

    info.append(title, meta);

    const duration = document.createElement("span");
    duration.className = "recent-activity-duration";
    duration.textContent = formatDuration(entry.durationSeconds);

    item.append(icon, info, duration);
    elements.recentList.append(item);
  });
}

function renderTrends(now) {
  const last7Days = Array.from({ length: 7 }, (_, index) => addDays(now, index - 6));
  const todayHoursSeries = last7Days.map((date) => {
    const seconds = state.calculateEntriesTotal(state.getEntriesForDate(formatDateForInput(date)));
    return Number(formatHoursDecimal(seconds));
  });

  charts.renderSparkline(elements.todayTrend, todayHoursSeries.slice(-5));
  charts.renderSparkline(elements.weekTrend, todayHoursSeries);
}

function renderCharts(now, monthEntries) {
  renderWeeklyHoursChart(now);
  renderCategoryDonut(monthEntries, document.getElementById("dashboard-chart-category"));
  renderMonthlyTrendChart(now);
  renderWeekdayChart(monthEntries, document.getElementById("dashboard-chart-weekday"));
  renderProductivityTrendChart(now);
}

function renderWeeklyHoursChart(now) {
  const container = document.getElementById("dashboard-chart-weekly-hours");
  const days = Array.from({ length: 7 }, (_, index) => addDays(now, index - 6));

  const labels = days.map((date) => new Intl.DateTimeFormat("el-GR", { weekday: "short" }).format(date));
  const values = days.map((date) => Number(formatHoursDecimal(state.calculateEntriesTotal(state.getEntriesForDate(formatDateForInput(date))))));

  charts.renderBarChart(container, {
    labels,
    values,
    formatValue: (value) => `${value.toFixed(1)}ω`,
    emptyMessage: "Δεν υπάρχουν ώρες τις τελευταίες 7 ημέρες."
  });
}

export function renderCategoryDonut(entries, container) {
  const totals = new Map();

  entries.forEach((entry) => {
    totals.set(entry.category, (totals.get(entry.category) || 0) + Number(entry.durationSeconds || 0));
  });

  const segments = Array.from(totals.entries())
    .map(([category, seconds]) => {
      const meta = state.getCategoryMeta(category);
      return { label: category, value: Number(formatHoursDecimal(seconds)), color: meta.color };
    })
    .sort((first, second) => second.value - first.value);

  charts.renderDonutChart(container, {
    segments,
    formatValue: (value) => `${value}ω`,
    emptyMessage: "Δεν υπάρχουν καταχωρήσεις αυτόν τον μήνα."
  });
}

function renderMonthlyTrendChart(now) {
  const container = document.getElementById("dashboard-chart-monthly-trend");
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return date;
  });

  const labels = months.map((date) => new Intl.DateTimeFormat("el-GR", { month: "short" }).format(date));

  const values = months.map((date) => {
    const from = formatDateForInput(startOfMonth(date));
    const to = formatDateForInput(endOfMonth(date));
    return Number(formatHoursDecimal(state.calculateEntriesTotal(state.getEntriesInRange(from, to))));
  });

  charts.renderLineChart(container, {
    labels,
    values,
    formatValue: (value) => `${value.toFixed(1)}ω`,
    emptyMessage: "Δεν υπάρχουν αρκετά δεδομένα ακόμα."
  });
}

export function renderWeekdayChart(entries, container) {
  const totals = new Array(7).fill(0);

  entries.forEach((entry) => {
    const date = parseDateInput(entry.date);
    const mondayBasedIndex = (date.getDay() + 6) % 7;
    totals[mondayBasedIndex] += Number(entry.durationSeconds || 0);
  });

  charts.renderBarChart(container, {
    labels: WEEKDAY_LABELS,
    values: totals.map((seconds) => Number(formatHoursDecimal(seconds))),
    formatValue: (value) => `${value.toFixed(1)}ω`,
    emptyMessage: "Δεν υπάρχουν δεδομένα ακόμα."
  });
}

function renderProductivityTrendChart(now) {
  const container = document.getElementById("dashboard-chart-productivity-trend");
  const days = Array.from({ length: 14 }, (_, index) => addDays(now, index - 13));

  const labels = days.map((date) => String(date.getDate()));
  const values = days.map((date) => {
    const entries = state.getEntriesForDate(formatDateForInput(date));
    return Math.round(completionRatio(entries) * 100);
  });

  charts.renderLineChart(container, {
    labels,
    values,
    formatValue: (value) => `${value}%`,
    emptyMessage: "Δεν υπάρχουν δεδομένα ακόμα."
  });
}
