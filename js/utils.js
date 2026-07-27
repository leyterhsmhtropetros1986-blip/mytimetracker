"use strict";

/* =========================
   Ημερομηνία / ώρα (τοπικά, χωρίς UTC shift)
========================= */

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

export function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateInput(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatTimeForInput(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function formatLongDate(date) {
  return new Intl.DateTimeFormat("el-GR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatShortDate(date) {
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function weekdayName(date) {
  return new Intl.DateTimeFormat("el-GR", { weekday: "long" }).format(date);
}

/** Δευτέρα της εβδομάδας που περιέχει το date (τοπικά). */
export function startOfWeek(date) {
  const day = date.getDay();
  const mondayBasedIndex = (day + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  monday.setDate(monday.getDate() - mondayBasedIndex);

  return monday;
}

/** Αριθμός εβδομάδας ISO-8601 (1-53). */
export function isoWeekNumber(date) {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = (target.getDay() + 6) % 7;

  target.setDate(target.getDate() - dayNumber + 3);

  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstThursdayDayNumber = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNumber + 3);

  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date, amount) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  value.setDate(value.getDate() + amount);
  return value;
}

export function calculateDurationSeconds(date, startTime, endTime) {
  const startDate = new Date(`${date}T${startTime}:00`);
  const endDate = new Date(`${date}T${endTime}:00`);

  return Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
}

export function addMinutesToTime(date, time, minutesToAdd) {
  const value = new Date(`${date}T${time}:00`);
  value.setMinutes(value.getMinutes() + minutesToAdd);
  return formatTimeForInput(value);
}

export function addSecondsToTime(date, time, secondsToAdd) {
  const value = new Date(`${date}T${time}:00`);
  value.setSeconds(value.getSeconds() + secondsToAdd);
  return formatTimeForInput(value);
}

/** Μετατρέπει "HH:MM" σε λεπτά από τα μεσάνυχτα. */
export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes)) % (24 * 60);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/* =========================
   Διάρκεια / μορφοποίηση
========================= */

export function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds || 0));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = Math.floor(safeSeconds % 60);

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function formatCompactDuration(totalSeconds) {
  return formatMinutes(Math.floor(totalSeconds / 60));
}

export function formatMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
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

export function formatHoursDecimal(totalSeconds, digits = 2) {
  return (Number(totalSeconds || 0) / 3600).toFixed(digits);
}

/* =========================
   Διάφορα
========================= */

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function debounce(fn, delayMs) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delayMs);
  };
}
