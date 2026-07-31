"use strict";

import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { MemoryLocalStorage } from "./helpers/memory-local-storage.mjs";

globalThis.localStorage = new MemoryLocalStorage();

const { loadState, normalizeState, STATE_STORAGE_KEY, SCHEMA_VERSION, DEFAULT_CATEGORIES } = await import(
  "../js/storage.js"
);

beforeEach(() => {
  globalThis.localStorage.clear();
});

test("loadState() with empty localStorage returns a fully-formed default state", () => {
  const state = loadState();

  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(state.entries, []);
  assert.deepEqual(state.assistantTasks, []);
  assert.ok(state.categories.length >= DEFAULT_CATEGORIES.length);
  assert.equal(typeof state.preferences.weeklySchedule.mon, "number");
  assert.equal(typeof state.preferences.reminderNotificationsEnabled, "boolean");
});

test("loadState() migrates legacy per-array keys, merges by id, and keeps the legacy keys intact", () => {
  const legacyEntry = {
    id: "legacy-1",
    taskName: "Παλιό task",
    date: "2026-01-01",
    startTime: "09:00",
    endTime: "10:00",
    durationSeconds: 3600
  };

  globalThis.localStorage.setItem("mytimetracker_entries_v6", JSON.stringify([legacyEntry]));

  const state = loadState();

  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].id, "legacy-1");
  assert.ok(globalThis.localStorage.getItem("mytimetracker_entries_v6") !== null, "legacy key must not be deleted");
  assert.ok(globalThis.localStorage.getItem(STATE_STORAGE_KEY) !== null, "migration result must be persisted");
});

test("loadState() upgrades a stale schemaVersion in-place and persists the normalized shape", () => {
  globalThis.localStorage.setItem(
    STATE_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      entries: [
        { id: "e1", taskName: "Χ", date: "2026-01-01", startTime: "09:00", endTime: "10:00", durationSeconds: 60 }
      ]
      // no categories, no preferences on this old "v1" record
    })
  );

  const state = loadState();

  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.ok(state.categories.length > 0);
  assert.equal(typeof state.preferences.weeklySchedule.mon, "number");

  const persisted = JSON.parse(globalThis.localStorage.getItem(STATE_STORAGE_KEY));
  assert.equal(persisted.schemaVersion, SCHEMA_VERSION);
});

test("normalizeState() drops invalid entries but keeps valid ones", () => {
  const result = normalizeState({
    entries: [
      { taskName: "", date: "", startTime: "", endTime: "" }, // invalid -> must be dropped
      { taskName: "Valid", date: "2026-01-01", startTime: "09:00", endTime: "10:00", durationSeconds: 3600 }
    ]
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].taskName, "Valid");
});

test("normalizeState() fills default categories and preferences when missing entirely", () => {
  const result = normalizeState({ entries: [] });

  assert.ok(result.categories.length > 0);
  assert.equal(typeof result.preferences.weeklySchedule.mon, "number");
  assert.equal(typeof result.preferences.reminderNotificationsEnabled, "boolean");
});

test("normalizeState() tolerates completely malformed/non-object input without throwing", () => {
  const result = normalizeState(null);

  assert.deepEqual(result.entries, []);
  assert.deepEqual(result.assistantTasks, []);
  assert.ok(result.categories.length > 0);
});
