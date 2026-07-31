"use strict";

import { getSupabaseClient } from "./supabase.js";
import * as state from "./state.js";
import * as ui from "./ui.js";
import { debounce } from "./utils.js";

/*
 * Local-first cloud sync. localStorage (via state.js/storage.js) stays the
 * source of truth for instant UI reads/writes, exactly as before this file
 * existed. This module only ever runs *after* a mutation already landed
 * locally (state.onChange fires after persistState already wrote to
 * localStorage), and pushes a debounced snapshot to Supabase in the
 * background — the UI never waits on a network round trip.
 */

const SYNC_DEBOUNCE_MS = 2000;

const STATUS_LABELS = {
  saved: "Αποθηκεύτηκε",
  syncing: "Συγχρονισμός…",
  offline: "Εκτός σύνδεσης",
  error: "Σφάλμα συγχρονισμού"
};

let currentUserId = null;
let stopStateListener = null;

function setSyncStatus(status) {
  const element = document.getElementById("sync-status");

  if (!element) {
    return;
  }

  element.textContent = STATUS_LABELS[status] || "";
  element.dataset.status = status;
}

function getLocalSnapshot() {
  return JSON.parse(state.exportStateSnapshot());
}

async function fetchCloudRow(userId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("user_states")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function pushToCloud() {
  if (!currentUserId) {
    return;
  }

  if (!navigator.onLine) {
    setSyncStatus("offline");
    return;
  }

  setSyncStatus("syncing");

  const snapshot = getLocalSnapshot();

  try {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from("user_states")
      .upsert(
        { user_id: currentUserId, schema_version: snapshot.schemaVersion, state: snapshot },
        { onConflict: "user_id" }
      );

    if (error) {
      throw error;
    }

    setSyncStatus("saved");
  } catch (error) {
    console.error("Αποτυχία cloud sync:", error);
    setSyncStatus("error");
  }
}

const debouncedPush = debounce(pushToCloud, SYNC_DEBOUNCE_MS);

function hasMeaningfulLocalData(snapshot) {
  return (snapshot.entries || []).length > 0 || (snapshot.assistantTasks || []).length > 0;
}

function localHasEntriesNotInCloud(localSnapshot, cloudState) {
  const cloudIds = new Set((cloudState.entries || []).map((entry) => entry.id));
  return (localSnapshot.entries || []).some((entry) => !cloudIds.has(entry.id));
}

function pullFromCloud(cloudState) {
  const result = state.importStateSnapshot(JSON.stringify(cloudState));

  if (!result.ok) {
    console.error("Μη έγκυρη μορφή cloud state:", result.error);
    ui.toast("Δεν ήταν δυνατή η φόρτωση των δεδομένων του λογαριασμού σου.", "error");
  }
}

/**
 * Τρέχει μία φορά, στην πρώτη φόρτωση μετά το login. Αποφασίζει ανάμεσα σε
 * τοπικά δεδομένα / cloud δεδομένα χωρίς ποτέ να σβήσει σιωπηλά το ένα από
 * τα δύο — βλ. σχόλια ανά περίπτωση παρακάτω.
 */
async function reconcileOnFirstLoad(userId) {
  const localSnapshot = getLocalSnapshot();
  let cloudRow;

  try {
    cloudRow = await fetchCloudRow(userId);
  } catch (error) {
    console.error("Αποτυχία ανάκτησης cloud state:", error);
    setSyncStatus("offline");
    return;
  }

  if (!cloudRow) {
    /* Cloud άδειο. */
    if (hasMeaningfulLocalData(localSnapshot)) {
      const wantsImport = await ui.confirmDialog({
        title: "Εισαγωγή τοπικών δεδομένων",
        message:
          "Βρέθηκαν δεδομένα αποθηκευμένα σε αυτή τη συσκευή. Θέλεις να τα εισάγεις στον νέο σου λογαριασμό; " +
          "Αν επιλέξεις άκυρο, ο λογαριασμός θα ξεκινήσει άδειος — θα σε ξαναρωτήσουμε την επόμενη φορά.",
        confirmText: "Εισαγωγή",
        cancelText: "Άκυρο"
      });

      if (!wantsImport) {
        setSyncStatus("offline");
        return;
      }
    }

    await pushToCloud();
    return;
  }

  const cloudState = cloudRow.state || {};

  if (localHasEntriesNotInCloud(localSnapshot, cloudState)) {
    /* Ο λογαριασμός έχει ήδη δεδομένα, αλλά αυτή η συσκευή έχει και κάτι που
       δεν έχει ανέβει ακόμα — μην αποφασίσεις σιωπηλά, ρώτα. */
    const keepCloud = await ui.confirmDialog({
      title: "Διαφορετικά δεδομένα",
      message:
        "Ο λογαριασμός σου έχει ήδη αποθηκευμένα δεδομένα, αλλά αυτή η συσκευή έχει και μη-συγχρονισμένες αλλαγές. " +
        "Χρήση των αποθηκευμένων δεδομένων του λογαριασμού; Το άκυρο κρατάει τις αλλαγές αυτής της συσκευής και τις ανεβάζει.",
      confirmText: "Χρήση λογαριασμού",
      cancelText: "Κράτησε τη συσκευή"
    });

    if (keepCloud) {
      pullFromCloud(cloudState);
    } else {
      await pushToCloud();
    }

    return;
  }

  pullFromCloud(cloudState);
  setSyncStatus("saved");
}

export async function init(userId) {
  currentUserId = userId;

  await reconcileOnFirstLoad(userId);

  if (stopStateListener) {
    stopStateListener();
  }

  stopStateListener = state.onChange(debouncedPush);

  window.addEventListener("online", () => {
    debouncedPush();
  });

  window.addEventListener("offline", () => {
    setSyncStatus("offline");
  });
}
