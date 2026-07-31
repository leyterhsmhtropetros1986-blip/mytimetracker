"use strict";

import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { MemoryLocalStorage } from "./helpers/memory-local-storage.mjs";

globalThis.localStorage = new MemoryLocalStorage();

const state = await import("../js/state.js");
const { DEFAULT_CATEGORIES } = await import("../js/storage.js");

/* state.js κρατάει το state σε module-level singleton (όπως και στην πραγματική εφαρμογή),
   οπότε resetAllData() χρησιμοποιείται εδώ ως το σημείο επαναφοράς πριν από κάθε test. */
beforeEach(() => {
  state.resetAllData();
});

test("resetAllData() always produces valid default preferences", () => {
  const preferences = state.getPreferences();

  assert.equal(typeof preferences.weeklySchedule.mon, "number");
  assert.equal(typeof preferences.weeklySchedule.sun, "number");
  assert.equal(typeof preferences.reminderNotificationsEnabled, "boolean");
});

test("getWeeklyTargetMinutes() does not throw after resetAllData()", () => {
  assert.doesNotThrow(() => state.getWeeklyTargetMinutes());
  assert.equal(state.getWeeklyTargetMinutes(), 480 * 5); // default Mon-Fri schedule
});

test("resetAllData() restores default categories", () => {
  const names = state.getCategories().map((category) => category.name);
  const defaultNames = DEFAULT_CATEGORIES.map((category) => category.name);

  defaultNames.forEach((name) => assert.ok(names.includes(name)));
});

test("importStateSnapshot() with a fully valid snapshot imports entries and preferences", () => {
  const snapshot = {
    schemaVersion: 2,
    entries: [
      { id: "e1", taskName: "VAT report", date: "2026-07-30", startTime: "09:00", endTime: "11:00", durationSeconds: 7200 }
    ],
    assistantTasks: [],
    categories: [],
    preferences: {
      weeklySchedule: { mon: 100, tue: 200, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
      reminderNotificationsEnabled: false
    }
  };

  const result = state.importStateSnapshot(JSON.stringify(snapshot));

  assert.equal(result.ok, true);
  assert.equal(state.getEntries().length, 1);
  assert.equal(state.getEntries()[0].taskName, "VAT report");
  assert.equal(state.getWeeklyTargetMinutes(), 300);
  assert.equal(state.getPreferences().reminderNotificationsEnabled, false);
});

test("importStateSnapshot() with malformed JSON text fails gracefully without throwing", () => {
  assert.doesNotThrow(() => {
    const result = state.importStateSnapshot("{not valid json");
    assert.equal(result.ok, false);
    assert.equal(typeof result.error, "string");
  });
});

test("importStateSnapshot() with JSON missing an entries array is rejected", () => {
  const result = state.importStateSnapshot(JSON.stringify({ foo: "bar" }));

  assert.equal(result.ok, false);
});

test("importStateSnapshot() with entries but no preferences key fills in normalized defaults", () => {
  const result = state.importStateSnapshot(JSON.stringify({ entries: [], assistantTasks: [], categories: [] }));

  assert.equal(result.ok, true);
  assert.equal(typeof state.getPreferences().weeklySchedule.mon, "number");
  assert.doesNotThrow(() => state.getWeeklyTargetMinutes());
  assert.equal(state.getWeeklyTargetMinutes(), 480 * 5);
});

test("importStateSnapshot() with no categories in the file still yields default categories", () => {
  const result = state.importStateSnapshot(JSON.stringify({ entries: [] }));

  assert.equal(result.ok, true);
  assert.ok(state.getCategories().length > 0);
});

test("importStateSnapshot() drops invalid entries but keeps valid ones in the same file", () => {
  const snapshot = {
    entries: [
      { taskName: "", date: "", startTime: "", endTime: "" },
      { id: "keep-me", taskName: "Kept entry", date: "2026-07-30", startTime: "09:00", endTime: "10:00", durationSeconds: 3600 }
    ]
  };

  const result = state.importStateSnapshot(JSON.stringify(snapshot));

  assert.equal(result.ok, true);
  assert.equal(state.getEntries().length, 1);
  assert.equal(state.getEntries()[0].id, "keep-me");
});

test("resetAllData() after an import clears entries/tasks and restores defaults", () => {
  state.importStateSnapshot(
    JSON.stringify({
      entries: [{ id: "e1", taskName: "X", date: "2026-07-30", startTime: "09:00", endTime: "10:00", durationSeconds: 3600 }]
    })
  );
  assert.equal(state.getEntries().length, 1);

  state.resetAllData();

  assert.equal(state.getEntries().length, 0);
  assert.equal(state.getAssistantTasks().length, 0);
  assert.doesNotThrow(() => state.getWeeklyTargetMinutes());
});
