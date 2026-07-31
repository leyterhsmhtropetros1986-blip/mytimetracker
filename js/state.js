"use strict";

import { loadState, persistState, normalizeState, normalizePreferences, DEFAULT_CATEGORIES } from "./storage.js";
import { createId, formatDateForInput, startOfDay } from "./utils.js";

export const DEFAULT_CATEGORY = "Άλλο";

export const STATUSES = [
  { value: "scheduled", label: "Προγραμματισμένο" },
  { value: "in_progress", label: "Σε εξέλιξη" },
  { value: "done", label: "Ολοκληρωμένο" },
  { value: "delayed", label: "Καθυστερημένο" },
  { value: "cancelled", label: "Ακυρωμένο" }
];

export const DEFAULT_STATUS = "done";

export const PRIORITIES = [
  { value: "critical", label: "Κρίσιμη", weight: 4 },
  { value: "high", label: "Υψηλή", weight: 3 },
  { value: "medium", label: "Μεσαία", weight: 2 },
  { value: "low", label: "Χαμηλή", weight: 1 }
];

export const DEFAULT_PRIORITY = "medium";

export function statusLabel(statusValue) {
  const found = STATUSES.find((status) => status.value === statusValue);
  return found ? found.label : statusValue;
}

export function priorityLabel(priorityValue) {
  const found = PRIORITIES.find((priority) => priority.value === priorityValue);
  return found ? found.label : priorityValue;
}

export function priorityWeight(priorityValue) {
  const found = PRIORITIES.find((priority) => priority.value === priorityValue);
  return found ? found.weight : 0;
}

/* =========================
   Εσωτερικό store
========================= */

let state = loadState();

const today = startOfDay(new Date());

let uiState = {
  selectedDate: today,
  calendarDate: new Date(today.getFullYear(), today.getMonth(), 1),
  historyFilters: {
    fromDate: "",
    toDate: "",
    fromTime: "",
    toTime: "",
    category: "",
    status: "",
    priority: "",
    tag: "",
    search: ""
  }
};

const listeners = new Set();

export function onChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emitChange() {
  listeners.forEach((callback) => callback());
}

function save() {
  persistState(state);
}

function defaultEntryFields() {
  return {
    description: "",
    category: DEFAULT_CATEGORY,
    status: DEFAULT_STATUS,
    priority: DEFAULT_PRIORITY,
    location: "",
    notes: "",
    tags: [],
    estimatedMinutes: null,
    completionPercent: 0,
    recurring: { enabled: false, frequency: "weekly", groupId: null },
    reminder: { enabled: false, minutesBefore: 10, firedAt: null },
    source: "manual"
  };
}

/* =========================
   Entries
========================= */

export function getEntries() {
  return state.entries;
}

export function getEntriesForDate(dateKey) {
  return state.entries.filter((entry) => entry.date === dateKey);
}

export function getEntriesInRange(fromKey, toKey) {
  return state.entries.filter((entry) => {
    if (fromKey && entry.date < fromKey) {
      return false;
    }

    if (toKey && entry.date > toKey) {
      return false;
    }

    return true;
  });
}

export function calculateEntriesTotal(items) {
  return items.reduce((total, item) => total + Number(item.durationSeconds || 0), 0);
}

export function addEntry(entryData) {
  const entry = {
    id: createId(),
    ...defaultEntryFields(),
    ...entryData,
    createdAt: new Date().toISOString(),
    updatedAt: null
  };

  state.entries.push(entry);
  save();
  emitChange();

  return entry;
}

export function addEntries(entriesData) {
  const created = entriesData.map((entryData) => ({
    id: createId(),
    ...defaultEntryFields(),
    ...entryData,
    createdAt: new Date().toISOString(),
    updatedAt: null
  }));

  state.entries.push(...created);

  save();
  emitChange();

  return created;
}

export function updateEntry(entryId, changes) {
  const index = state.entries.findIndex((entry) => entry.id === entryId);

  if (index === -1) {
    return null;
  }

  state.entries[index] = {
    ...state.entries[index],
    ...changes,
    updatedAt: new Date().toISOString()
  };

  save();
  emitChange();

  return state.entries[index];
}

export function deleteEntry(entryId) {
  const before = state.entries.length;
  state.entries = state.entries.filter((entry) => entry.id !== entryId);

  if (state.entries.length !== before) {
    save();
    emitChange();
  }
}

export function deleteEntriesForDate(dateKey) {
  const before = state.entries.length;
  state.entries = state.entries.filter((entry) => entry.date !== dateKey);

  if (state.entries.length !== before) {
    save();
    emitChange();
  }
}

export function findEntry(entryId) {
  return state.entries.find((entry) => entry.id === entryId) || null;
}

export function getAllTags() {
  const tags = new Set();

  state.entries.forEach((entry) => {
    (entry.tags || []).forEach((tag) => tags.add(tag));
  });

  return Array.from(tags).sort((first, second) => first.localeCompare(second, "el"));
}

/* =========================
   Κατηγορίες (προσαρμόσιμες: όνομα, χρώμα, εικονίδιο)
========================= */

export function getCategories() {
  return state.categories;
}

export function getCategoryNames() {
  return state.categories.map((category) => category.name);
}

const FALLBACK_CATEGORY_META = { id: null, name: "", color: "#64748b", icon: "🏷️" };

export function getCategoryMeta(categoryName) {
  const found = state.categories.find((category) => category.name === categoryName);
  return found || { ...FALLBACK_CATEGORY_META, name: categoryName || DEFAULT_CATEGORY };
}

export function addCategory({ name, color, icon }) {
  const trimmedName = (name || "").trim();

  if (!trimmedName) {
    return { ok: false, error: "Το όνομα κατηγορίας είναι υποχρεωτικό." };
  }

  if (state.categories.some((category) => category.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { ok: false, error: "Υπάρχει ήδη κατηγορία με αυτό το όνομα." };
  }

  const category = {
    id: createId(),
    name: trimmedName,
    color: color || "#64748b",
    icon: icon || "🏷️"
  };

  state.categories.push(category);
  save();
  emitChange();

  return { ok: true, category };
}

export function updateCategory(categoryId, changes) {
  const index = state.categories.findIndex((category) => category.id === categoryId);

  if (index === -1) {
    return { ok: false, error: "Η κατηγορία δεν βρέθηκε." };
  }

  const nextName = typeof changes.name === "string" ? changes.name.trim() : state.categories[index].name;

  if (!nextName) {
    return { ok: false, error: "Το όνομα κατηγορίας είναι υποχρεωτικό." };
  }

  const nameTaken = state.categories.some(
    (category, categoryIndex) =>
      categoryIndex !== index && category.name.toLowerCase() === nextName.toLowerCase()
  );

  if (nameTaken) {
    return { ok: false, error: "Υπάρχει ήδη κατηγορία με αυτό το όνομα." };
  }

  const previousName = state.categories[index].name;

  state.categories[index] = {
    ...state.categories[index],
    ...changes,
    name: nextName
  };

  if (previousName !== nextName) {
    state.entries.forEach((entry) => {
      if (entry.category === previousName) {
        entry.category = nextName;
      }
    });
  }

  save();
  emitChange();

  return { ok: true, category: state.categories[index] };
}

export function deleteCategory(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);

  if (!category) {
    return { ok: false, error: "Η κατηγορία δεν βρέθηκε." };
  }

  if (state.categories.length <= 1) {
    return { ok: false, error: "Πρέπει να υπάρχει τουλάχιστον μία κατηγορία." };
  }

  state.categories = state.categories.filter((item) => item.id !== categoryId);
  save();
  emitChange();

  return { ok: true };
}

export function resetCategoriesToDefault() {
  state.categories = DEFAULT_CATEGORIES.map((category) => ({ id: createId(), ...category }));
  save();
  emitChange();
}

/* =========================
   Assistant tasks
========================= */

export function getAssistantTasks() {
  return state.assistantTasks;
}

export function addAssistantTask(task) {
  const item = { id: createId(), category: DEFAULT_CATEGORY, priority: DEFAULT_PRIORITY, ...task };
  state.assistantTasks.push(item);
  save();
  emitChange();

  return item;
}

export function removeAssistantTask(taskId) {
  state.assistantTasks = state.assistantTasks.filter((task) => task.id !== taskId);
  save();
  emitChange();
}

export function clearAssistantTasks() {
  state.assistantTasks = [];
  save();
  emitChange();
}

/* =========================
   UI state (μη επίμονο)
========================= */

export function getSelectedDate() {
  return uiState.selectedDate;
}

export function setSelectedDate(date) {
  uiState.selectedDate = startOfDay(date);
  uiState.calendarDate = new Date(
    uiState.selectedDate.getFullYear(),
    uiState.selectedDate.getMonth(),
    1
  );

  emitChange();
}

export function getCalendarDate() {
  return uiState.calendarDate;
}

export function setCalendarDate(date) {
  uiState.calendarDate = new Date(date.getFullYear(), date.getMonth(), 1);
  emitChange();
}

export function getSelectedDateKey() {
  return formatDateForInput(uiState.selectedDate);
}

export function getHistoryFilters() {
  return uiState.historyFilters;
}

export function setHistoryFilters(partialFilters) {
  uiState.historyFilters = { ...uiState.historyFilters, ...partialFilters };
  emitChange();
}

export function areFiltersActive() {
  const filters = uiState.historyFilters;

  return Boolean(
    filters.fromDate ||
      filters.toDate ||
      filters.fromTime ||
      filters.toTime ||
      filters.category ||
      filters.status ||
      filters.priority ||
      filters.tag ||
      filters.search.trim()
  );
}

export function getFilteredEntries() {
  const filters = uiState.historyFilters;
  const searchTerm = filters.search.trim().toLowerCase();

  return state.entries
    .filter((entry) => {
      if (filters.fromDate && entry.date < filters.fromDate) {
        return false;
      }

      if (filters.toDate && entry.date > filters.toDate) {
        return false;
      }

      if (filters.fromTime && entry.startTime < filters.fromTime) {
        return false;
      }

      if (filters.toTime && entry.startTime > filters.toTime) {
        return false;
      }

      if (filters.category && entry.category !== filters.category) {
        return false;
      }

      if (filters.status && entry.status !== filters.status) {
        return false;
      }

      if (filters.priority && entry.priority !== filters.priority) {
        return false;
      }

      if (filters.tag && !(entry.tags || []).includes(filters.tag)) {
        return false;
      }

      if (searchTerm && !entry.taskName.toLowerCase().includes(searchTerm)) {
        return false;
      }

      return true;
    })
    .sort((first, second) => {
      if (first.date === second.date) {
        return (first.startTime || "").localeCompare(second.startTime || "");
      }

      return second.date.localeCompare(first.date);
    });
}

export function getExportEntries() {
  return areFiltersActive() ? getFilteredEntries() : state.entries;
}

/* =========================
   Προτιμήσεις
========================= */

export function getPreferences() {
  return state.preferences;
}

export function setPreferences(partialPreferences) {
  state.preferences = { ...state.preferences, ...partialPreferences };
  save();
  emitChange();
}

export function getWeeklyTargetMinutes() {
  return Object.values(state.preferences.weeklySchedule).reduce((total, minutes) => total + minutes, 0);
}

/* =========================
   Δεδομένα / εφεδρικό αντίγραφο (Ρυθμίσεις)
========================= */

export function exportStateSnapshot() {
  return JSON.stringify(state, null, 2);
}

export function importStateSnapshot(jsonText) {
  let parsed;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return { ok: false, error: "Μη έγκυρο αρχείο JSON." };
  }

  if (!parsed || !Array.isArray(parsed.entries)) {
    return { ok: false, error: "Το αρχείο δεν έχει την αναμενόμενη μορφή." };
  }

  state = normalizeState(parsed);

  save();
  emitChange();

  return { ok: true };
}

export function resetAllData() {
  state = {
    schemaVersion: state.schemaVersion,
    entries: [],
    assistantTasks: [],
    categories: DEFAULT_CATEGORIES.map((category) => ({ id: createId(), ...category })),
    preferences: normalizePreferences(null)
  };

  save();
  emitChange();
}
