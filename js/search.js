"use strict";

import * as state from "./state.js";
import { openEditEntryModal } from "./entries.js";
import * as router from "./router.js";
import { debounce, parseDateInput, formatShortDate } from "./utils.js";

let searchInput;
let resultsPanel;

export function init() {
  searchInput = document.getElementById("global-search-input");
  resultsPanel = document.getElementById("global-search-results");

  const handleInput = debounce(() => runSearch(searchInput.value), 150);

  searchInput.addEventListener("input", handleInput);
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) {
      runSearch(searchInput.value);
    }
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const query = searchInput.value.trim();

      if (query) {
        state.setHistoryFilters({ search: query });
        router.navigate("tasks");
        closeResults();
      }
    }

    if (event.key === "Escape") {
      closeResults();
      searchInput.blur();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".topbar-search")) {
      closeResults();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput && !isTypingContext(event.target)) {
      event.preventDefault();
      router.navigate(router.getCurrentRoute() || "dashboard");
      searchInput.focus();
    }

    if (event.key.toLowerCase() === "n" && !isTypingContext(event.target) && !document.body.classList.contains("modal-open")) {
      const toolbarButton = document.getElementById("toolbar-new-entry-button");
      const fabButton = document.getElementById("fab-new-entry-button");
      (fabButton.offsetParent ? fabButton : toolbarButton).click();
    }
  });
}

function isTypingContext(target) {
  const tag = (target.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function closeResults() {
  resultsPanel.hidden = true;
  resultsPanel.innerHTML = "";
}

function highlight(text, query) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());

  if (index === -1) {
    return document.createTextNode(text);
  }

  const fragment = document.createDocumentFragment();
  fragment.append(document.createTextNode(text.slice(0, index)));

  const mark = document.createElement("mark");
  mark.className = "search-highlight";
  mark.textContent = text.slice(index, index + query.length);
  fragment.append(mark);

  fragment.append(document.createTextNode(text.slice(index + query.length)));
  return fragment;
}

function runSearch(rawQuery) {
  const query = rawQuery.trim();

  if (!query) {
    closeResults();
    return;
  }

  const lowerQuery = query.toLowerCase();

  const matches = state
    .getEntries()
    .filter((entry) => {
      const haystack = [entry.taskName, entry.description, entry.notes, entry.location, ...(entry.tags || [])]
        .join(" ")
        .toLowerCase();

      return haystack.includes(lowerQuery);
    })
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 8);

  resultsPanel.innerHTML = "";

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state small-empty";
    empty.textContent = "Δεν βρέθηκαν αποτελέσματα.";
    resultsPanel.append(empty);
    resultsPanel.hidden = false;
    return;
  }

  matches.forEach((entry) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "notification-item";
    item.style.width = "100%";
    item.style.textAlign = "left";
    item.style.border = "0";
    item.style.cursor = "pointer";
    item.style.background = "transparent";

    const icon = document.createElement("span");
    icon.className = "notification-icon";
    icon.textContent = state.getCategoryMeta(entry.category).icon;

    const body = document.createElement("div");
    body.className = "notification-body";

    const title = document.createElement("strong");
    title.append(highlight(entry.taskName, query));

    const meta = document.createElement("span");
    meta.textContent = `${formatShortDate(parseDateInput(entry.date))} · ${entry.startTime}–${entry.endTime} · ${entry.category}`;

    body.append(title, meta);
    item.append(icon, body);

    item.addEventListener("click", () => {
      state.setSelectedDate(parseDateInput(entry.date));
      openEditEntryModal(entry.id);
      closeResults();
      searchInput.value = "";
    });

    resultsPanel.append(item);
  });

  resultsPanel.hidden = false;
}
