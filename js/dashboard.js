"use strict";

import * as state from "./state.js";
import { statusLabel } from "./state.js";
import * as charts from "./charts.js";
import { navigate } from "./router.js";
import {
  formatDateForInput,
  formatDuration,
  formatHoursDecimal,
  formatMinutes,
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
    completedTasks: document.getElementById("kpi-completed-tasks"),
    pendingTasks: document.getElementById("kpi-pending-tasks"),
    topCategory: document.getElementById("kpi-top-category"),
    productivityScore: document.getElementById("kpi-productivity-score"),
    avgDuration: document.getElementById("kpi-avg-duration"),
    streak: document.getElementById("kpi-streak"),
    focusScore: document.getElementById("kpi-focus-score"),
    recentList: document.getElementById("dashboard-recent-activity"),
    recentEmpty: document.getElementById("dashboard-recent-empty"),
    todayTasksList: document.getElementById("dashboard-today-tasks"),
    todayTasksEmpty: document.getElementById("dashboard-today-tasks-empty"),
    aiInsightBody: document.getElementById("dashboard-ai-insight-body")
  };

  document.getElementById("dashboard-today-empty-cta").addEventListener("click", openNewEntry);
  document.getElementById("dashboard-recent-empty-cta").addEventListener("click", openNewEntry);
}

/** Ανοίγει τη φόρμα νέας καταχώρησης μέσω του κουμπιού που είναι ορατό στο τρέχον layout (FAB σε κινητό, topbar σε desktop). */
function openNewEntry() {
  const toolbarButton = document.getElementById("toolbar-new-entry-button");
  const fabButton = document.getElementById("fab-new-entry-button");
  (fabButton.offsetParent ? fabButton : toolbarButton).click();
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

  const weeklyTargetMinutes = state.getWeeklyTargetMinutes();
  const weekSeconds = state.calculateEntriesTotal(weekEntries);
  const remainingSeconds = weeklyTargetMinutes * 60 - weekSeconds;

  if (remainingSeconds > 0) {
    elements.remainingTarget.textContent = formatDuration(remainingSeconds);
  } else {
    elements.remainingTarget.textContent = `+${formatDuration(-remainingSeconds)}`;
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

  renderTodayTasks(todayEntries);
  renderRecentActivity();
  renderTrends(now);
  renderCharts(now, monthEntries);
  renderAiInsight();
}

function renderTodayTasks(todayEntries) {
  const sorted = [...todayEntries].sort((first, second) => (first.startTime || "").localeCompare(second.startTime || ""));

  elements.todayTasksList.innerHTML = "";
  elements.todayTasksEmpty.hidden = sorted.length > 0;

  sorted.forEach((entry) => {
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
    meta.textContent = `${entry.startTime}–${entry.endTime} · ${entry.category} · ${statusLabel(entry.status)}`;

    info.append(title, meta);

    const duration = document.createElement("span");
    duration.className = "recent-activity-duration";
    duration.textContent = formatDuration(entry.durationSeconds);

    item.append(icon, info, duration);
    elements.todayTasksList.append(item);
  });
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

  const categoryContainer = document.getElementById("dashboard-chart-category");
  const hasCategoryData = monthEntries.some((entry) => Number(entry.durationSeconds) > 0);

  if (hasCategoryData) {
    renderCategoryDonut(monthEntries, categoryContainer);
  } else {
    renderChartEmptyState(categoryContainer, "🍩", "Δεν υπάρχουν καταχωρήσεις αυτόν τον μήνα.");
  }
}

function renderWeeklyHoursChart(now) {
  const container = document.getElementById("dashboard-chart-weekly-hours");
  const days = Array.from({ length: 7 }, (_, index) => addDays(now, index - 6));

  const labels = days.map((date) => new Intl.DateTimeFormat("el-GR", { weekday: "short" }).format(date));
  const values = days.map((date) => Number(formatHoursDecimal(state.calculateEntriesTotal(state.getEntriesForDate(formatDateForInput(date))))));

  if (values.every((value) => !value)) {
    renderChartEmptyState(container, "📊", "Δεν υπάρχουν ώρες τις τελευταίες 7 ημέρες.");
    return;
  }

  charts.renderBarChart(container, {
    labels,
    values,
    formatValue: (value) => `${value.toFixed(1)}ω`,
    emptyMessage: "Δεν υπάρχουν ώρες τις τελευταίες 7 ημέρες."
  });
}

/** Πλούσιο empty state για τα δύο κεντρικά γραφήματα του Dashboard (εικονίδιο + μήνυμα + CTA). */
function renderChartEmptyState(container, icon, message) {
  container.innerHTML = "";

  const empty = document.createElement("div");
  empty.className = "empty-state small-empty";

  const iconEl = document.createElement("span");
  iconEl.className = "empty-state-icon";
  iconEl.setAttribute("aria-hidden", "true");
  iconEl.textContent = icon;

  const cta = document.createElement("button");
  cta.type = "button";
  cta.className = "button button-primary button-sm dashboard-empty-cta";
  cta.textContent = "+ Νέα καταχώρηση";
  cta.addEventListener("click", openNewEntry);

  empty.append(iconEl, message, cta);
  container.append(empty);
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

/** Μικρή, τοπική "εικόνα" από τον AI Βοηθό βασισμένη σε πραγματικά δεδομένα (tasks στον προγραμματιστή του). */
function renderAiInsight() {
  const container = elements.aiInsightBody;
  container.innerHTML = "";

  const assistantTasks = state.getAssistantTasks();

  const row = document.createElement("div");
  row.className = "dashboard-ai-insight-row";

  const icon = document.createElement("span");
  icon.className = "dashboard-ai-insight-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "✨";

  const text = document.createElement("p");
  text.className = "dashboard-ai-insight-text";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-light button-sm";
  button.addEventListener("click", () => navigate("assistant"));

  if (assistantTasks.length > 0) {
    const totalMinutes = assistantTasks.reduce((sum, task) => sum + Number(task.requestedMinutes || 0), 0);
    const strongCount = document.createElement("strong");
    strongCount.textContent = String(assistantTasks.length);

    text.append(
      "Έχεις ",
      strongCount,
      ` task${assistantTasks.length === 1 ? "" : "s"} (${formatMinutes(totalMinutes)}) στον προγραμματιστή του AI Βοηθού που περιμένουν πρόγραμμα.`
    );
    button.textContent = "Άνοιγμα AI Βοηθού";
  } else {
    text.textContent = "Ο AI Βοηθός μπορεί να σου προτείνει πρόγραμμα ημέρας με βάση τον διαθέσιμο χρόνο σου.";
    button.textContent = "Δοκίμασε τον AI Βοηθό";
  }

  row.append(icon, text, button);
  container.append(row);
}
