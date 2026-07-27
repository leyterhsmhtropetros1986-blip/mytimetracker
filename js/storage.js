"use strict";

import { createId } from "./utils.js";

export const STATE_STORAGE_KEY = "mytimetracker_state_v1";
export const SCHEMA_VERSION = 2;

const LEGACY_ENTRY_KEYS = [
  "mytimetracker_entries_v6",
  "mytimetracker_entries_v5",
  "mytimetracker_entries_v3"
];

const LEGACY_ASSISTANT_KEYS = [
  "mytimetracker_assistant_v2",
  "mytimetracker_assistant_v1"
];

const DEFAULT_CATEGORY_NAME = "Άλλο";

export const DEFAULT_CATEGORIES = [
  { name: "Εργασία", color: "#2563eb", icon: "💼" },
  { name: "Προσωπικά", color: "#db2777", icon: "🙂" },
  { name: "Project", color: "#7c3aed", icon: "🚀" },
  { name: "Γυμναστική", color: "#f97316", icon: "🏋️" },
  { name: "Διάβασμα", color: "#0d9488", icon: "📚" },
  { name: "Σπίτι", color: "#d97706", icon: "🏠" },
  { name: "Άλλο", color: "#64748b", icon: "✨" }
];

const VALID_STATUSES = new Set(["scheduled", "in_progress", "done", "cancelled", "delayed"]);
const VALID_PRIORITIES = new Set(["critical", "high", "medium", "low"]);
const VALID_FREQUENCIES = new Set(["daily", "weekly", "monthly"]);

const LEGACY_CATEGORY_MAP = {
  Task: DEFAULT_CATEGORY_NAME,
  Χρονόμετρο: DEFAULT_CATEGORY_NAME,
  "Ψηφιακός Βοηθός": DEFAULT_CATEGORY_NAME
};

/* Παλιό assistant priority ήταν αριθμητικό 1-3· το νέο σύστημα είναι ενιαίο (critical/high/medium/low). */
const LEGACY_NUMERIC_PRIORITY_MAP = { 3: "high", 2: "medium", 1: "low" };

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error(`Αποτυχία ανάγνωσης "${key}":`, error);
    return null;
  }
}

function normalizeCategoryName(rawCategory, knownNames) {
  if (typeof rawCategory === "string" && rawCategory.trim() && knownNames.has(rawCategory)) {
    return rawCategory;
  }

  if (typeof rawCategory === "string" && LEGACY_CATEGORY_MAP[rawCategory]) {
    return LEGACY_CATEGORY_MAP[rawCategory];
  }

  if (typeof rawCategory === "string" && rawCategory.trim()) {
    return rawCategory.trim();
  }

  return DEFAULT_CATEGORY_NAME;
}

function normalizeStatus(rawStatus) {
  if (typeof rawStatus === "string" && VALID_STATUSES.has(rawStatus)) {
    return rawStatus;
  }

  return "done";
}

function normalizePriority(rawPriority) {
  if (typeof rawPriority === "string" && VALID_PRIORITIES.has(rawPriority)) {
    return rawPriority;
  }

  if (LEGACY_NUMERIC_PRIORITY_MAP[Number(rawPriority)]) {
    return LEGACY_NUMERIC_PRIORITY_MAP[Number(rawPriority)];
  }

  return "medium";
}

function normalizeTags(rawTags) {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  return Array.from(
    new Set(
      rawTags
        .filter((tag) => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

function normalizeRecurring(rawRecurring) {
  const value = rawRecurring && typeof rawRecurring === "object" ? rawRecurring : {};

  return {
    enabled: Boolean(value.enabled),
    frequency: VALID_FREQUENCIES.has(value.frequency) ? value.frequency : "weekly",
    groupId: typeof value.groupId === "string" ? value.groupId : null
  };
}

function normalizeReminder(rawReminder) {
  const value = rawReminder && typeof rawReminder === "object" ? rawReminder : {};
  const minutesBefore = Number(value.minutesBefore);

  return {
    enabled: Boolean(value.enabled),
    minutesBefore: Number.isFinite(minutesBefore) && minutesBefore >= 0 ? minutesBefore : 10,
    firedAt: typeof value.firedAt === "string" ? value.firedAt : null
  };
}

function normalizeCompletionPercent(rawValue, status) {
  const value = Number(rawValue);

  if (Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  if (status === "done") {
    return 100;
  }

  if (status === "cancelled") {
    return 0;
  }

  return 0;
}

function normalizeEntry(rawEntry, knownCategoryNames) {
  if (!rawEntry || typeof rawEntry !== "object") {
    return null;
  }

  const taskName = typeof rawEntry.taskName === "string" ? rawEntry.taskName.trim() : "";
  const date = typeof rawEntry.date === "string" ? rawEntry.date : "";
  const startTime = typeof rawEntry.startTime === "string" ? rawEntry.startTime : "";
  const endTime = typeof rawEntry.endTime === "string" ? rawEntry.endTime : "";

  if (!taskName || !date || !startTime || !endTime) {
    return null;
  }

  const durationSeconds = Number.isFinite(Number(rawEntry.durationSeconds))
    ? Number(rawEntry.durationSeconds)
    : 0;

  const status = normalizeStatus(rawEntry.status);
  const estimatedMinutes = Number(rawEntry.estimatedMinutes);

  return {
    id: typeof rawEntry.id === "string" && rawEntry.id ? rawEntry.id : createId(),
    taskName,
    description: typeof rawEntry.description === "string" ? rawEntry.description : "",
    category: normalizeCategoryName(rawEntry.category, knownCategoryNames),
    status,
    priority: normalizePriority(rawEntry.priority),
    date,
    startTime,
    endTime,
    location: typeof rawEntry.location === "string" ? rawEntry.location : "",
    notes: typeof rawEntry.notes === "string" ? rawEntry.notes : "",
    tags: normalizeTags(rawEntry.tags),
    durationSeconds,
    estimatedMinutes: Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? Math.round(estimatedMinutes) : null,
    completionPercent: normalizeCompletionPercent(rawEntry.completionPercent, status),
    recurring: normalizeRecurring(rawEntry.recurring),
    reminder: normalizeReminder(rawEntry.reminder),
    source: typeof rawEntry.source === "string" ? rawEntry.source : "manual",
    createdAt: typeof rawEntry.createdAt === "string" ? rawEntry.createdAt : new Date().toISOString(),
    updatedAt: typeof rawEntry.updatedAt === "string" ? rawEntry.updatedAt : null
  };
}

function normalizeAssistantTask(rawTask) {
  if (!rawTask || typeof rawTask !== "object") {
    return null;
  }

  const taskName = typeof rawTask.taskName === "string" ? rawTask.taskName.trim() : "";

  if (!taskName) {
    return null;
  }

  const requestedMinutes = Number.isFinite(Number(rawTask.requestedMinutes))
    ? Math.max(1, Math.round(Number(rawTask.requestedMinutes)))
    : 60;

  return {
    id: typeof rawTask.id === "string" && rawTask.id ? rawTask.id : createId(),
    taskName,
    category: typeof rawTask.category === "string" && rawTask.category.trim() ? rawTask.category.trim() : DEFAULT_CATEGORY_NAME,
    requestedMinutes,
    priority: normalizePriority(rawTask.priority)
  };
}

function normalizeCategory(rawCategory) {
  if (!rawCategory || typeof rawCategory !== "object") {
    return null;
  }

  const name = typeof rawCategory.name === "string" ? rawCategory.name.trim() : "";

  if (!name) {
    return null;
  }

  const color = typeof rawCategory.color === "string" && /^#[0-9a-fA-F]{6}$/.test(rawCategory.color)
    ? rawCategory.color
    : "#64748b";

  return {
    id: typeof rawCategory.id === "string" && rawCategory.id ? rawCategory.id : createId(),
    name,
    color,
    icon: typeof rawCategory.icon === "string" && rawCategory.icon ? rawCategory.icon : "🏷️"
  };
}

function normalizeCategories(rawCategories) {
  const source = Array.isArray(rawCategories) ? rawCategories : [];
  const normalized = source.map(normalizeCategory).filter(Boolean);

  const seen = new Set();
  const deduped = [];

  normalized.forEach((category) => {
    if (!seen.has(category.name)) {
      seen.add(category.name);
      deduped.push(category);
    }
  });

  DEFAULT_CATEGORIES.forEach((defaultCategory) => {
    if (!seen.has(defaultCategory.name)) {
      seen.add(defaultCategory.name);
      deduped.push({ id: createId(), ...defaultCategory });
    }
  });

  return deduped;
}

const DEFAULT_PREFERENCES = {
  weeklyTargetMinutes: 40 * 60,
  reminderNotificationsEnabled: true
};

function normalizePreferences(rawPreferences) {
  const value = rawPreferences && typeof rawPreferences === "object" ? rawPreferences : {};
  const weeklyTargetMinutes = Number(value.weeklyTargetMinutes);

  return {
    weeklyTargetMinutes:
      Number.isFinite(weeklyTargetMinutes) && weeklyTargetMinutes > 0
        ? Math.round(weeklyTargetMinutes)
        : DEFAULT_PREFERENCES.weeklyTargetMinutes,
    reminderNotificationsEnabled:
      typeof value.reminderNotificationsEnabled === "boolean"
        ? value.reminderNotificationsEnabled
        : DEFAULT_PREFERENCES.reminderNotificationsEnabled
  };
}

function mergeById(lists) {
  const byId = new Map();

  lists.forEach((list) => {
    list.forEach((item) => {
      if (item && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    });
  });

  return Array.from(byId.values());
}

function migrateFromLegacyKeys() {
  const entryLists = LEGACY_ENTRY_KEYS.map((key) => {
    const raw = readJson(key);
    return Array.isArray(raw) ? raw.map((entry) => normalizeEntry(entry, new Set())).filter(Boolean) : [];
  });

  const assistantLists = LEGACY_ASSISTANT_KEYS.map((key) => {
    const raw = readJson(key);
    return Array.isArray(raw) ? raw.map(normalizeAssistantTask).filter(Boolean) : [];
  });

  const entries = mergeById(entryLists);
  const assistantTasks = mergeById(assistantLists);

  const foundLegacyData =
    entries.length > 0 ||
    assistantTasks.length > 0 ||
    LEGACY_ENTRY_KEYS.some((key) => localStorage.getItem(key) !== null) ||
    LEGACY_ASSISTANT_KEYS.some((key) => localStorage.getItem(key) !== null);

  return {
    state: {
      schemaVersion: SCHEMA_VERSION,
      entries,
      assistantTasks,
      categories: normalizeCategories([]),
      preferences: normalizePreferences(null)
    },
    migrated: foundLegacyData
  };
}

function createEmptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    entries: [],
    assistantTasks: [],
    categories: normalizeCategories([]),
    preferences: normalizePreferences(null)
  };
}

/**
 * Φορτώνει το ενοποιημένο state. Αν δεν υπάρχει ακόμα το νέο key,
 * κάνει migration από τα παλιά keys (χωρίς να τα διαγράφει) και το αποθηκεύει.
 * Παλιά records (schema v1, χωρίς τα νέα πεδία) περνάνε κανονικά από τα
 * normalize* helpers και παίρνουν ασφαλή defaults — δεν χρειάζεται ξεχωριστό
 * migration βήμα ούτε νέο storage key για το πέρασμα σε schema v2.
 */
export function loadState() {
  const existing = readJson(STATE_STORAGE_KEY);

  if (existing && Array.isArray(existing.entries)) {
    const categories = normalizeCategories(existing.categories);
    const knownCategoryNames = new Set(categories.map((category) => category.name));

    const normalizedState = {
      schemaVersion: SCHEMA_VERSION,
      entries: existing.entries.map((entry) => normalizeEntry(entry, knownCategoryNames)).filter(Boolean),
      assistantTasks: Array.isArray(existing.assistantTasks)
        ? existing.assistantTasks.map(normalizeAssistantTask).filter(Boolean)
        : [],
      categories,
      preferences: normalizePreferences(existing.preferences)
    };

    /* Αν το αποθηκευμένο schema ήταν παλιότερο (π.χ. v1 χωρίς categories/priority/tags),
       γράψε αμέσως την αναβαθμισμένη μορφή πίσω στο localStorage αντί να περιμένεις
       την επόμενη μεταβολή — αλλιώς το αρχείο μένει "μισο-αναβαθμισμένο" στον δίσκο. */
    if (existing.schemaVersion !== SCHEMA_VERSION) {
      persistState(normalizedState);
    }

    return normalizedState;
  }

  const { state, migrated } = migrateFromLegacyKeys();

  if (migrated) {
    persistState(state);
  }

  return state;
}

export function persistState(state) {
  try {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Αποτυχία αποθήκευσης state:", error);
    return false;
  }
}

export function createEntryDefaults() {
  return createEmptyState();
}
