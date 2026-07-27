"use strict";

import * as state from "./state.js";
import * as ui from "./ui.js";
import { formatDateForInput, formatDuration, formatTimeForInput, addSecondsToTime } from "./utils.js";

let timerTaskNameInput;
let timerCategorySelect;
let timerDisplay;
let quickTimerBar;
let quickTimerDot;
let startButton;
let pauseButton;
let stopButton;

let timerInterval = null;
let timerStartedTimestamp = null;
let timerSessionStartedAt = null;
let elapsedSeconds = 0;
let isTimerRunning = false;

export function init() {
  timerTaskNameInput = document.getElementById("timer-task-name");
  timerCategorySelect = document.getElementById("timer-category");
  timerDisplay = document.getElementById("timer-display");
  quickTimerBar = document.getElementById("quick-timer-bar");
  quickTimerDot = document.getElementById("quick-timer-dot");
  startButton = document.getElementById("start-button");
  pauseButton = document.getElementById("pause-button");
  stopButton = document.getElementById("stop-button");

  refreshCategoryOptions();

  startButton.addEventListener("click", startTimer);
  pauseButton.addEventListener("click", pauseTimer);
  stopButton.addEventListener("click", stopTimer);

  renderTimer();
  updateTimerButtons();
}

export function refreshCategoryOptions() {
  const previousValue = timerCategorySelect.value;
  timerCategorySelect.innerHTML = "";

  state.getCategories().forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = `${category.icon} ${category.name}`;
    timerCategorySelect.append(option);
  });

  timerCategorySelect.value = previousValue || state.DEFAULT_CATEGORY;
}

function startTimer() {
  const taskName = timerTaskNameInput.value.trim();

  if (!taskName) {
    ui.toast("Γράψε πρώτα τι κάνεις.", "error");
    timerTaskNameInput.focus();
    return;
  }

  if (isTimerRunning) {
    return;
  }

  if (!timerSessionStartedAt) {
    timerSessionStartedAt = new Date();
  }

  isTimerRunning = true;
  timerStartedTimestamp = Date.now() - elapsedSeconds * 1000;

  timerInterval = window.setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - timerStartedTimestamp) / 1000);
    renderTimer();
    updateTimerButtons();
  }, 1000);

  updateTimerButtons();
}

function pauseTimer() {
  if (!isTimerRunning) {
    return;
  }

  isTimerRunning = false;
  window.clearInterval(timerInterval);
  timerInterval = null;

  updateTimerButtons();
}

function stopTimer() {
  const taskName = timerTaskNameInput.value.trim();

  if (!taskName || elapsedSeconds <= 0) {
    return;
  }

  window.clearInterval(timerInterval);
  timerInterval = null;
  isTimerRunning = false;

  const dateKey = formatDateForInput(state.getSelectedDate());

  const startTime = timerSessionStartedAt
    ? formatTimeForInput(timerSessionStartedAt)
    : formatTimeForInput(new Date());

  const endTime = addSecondsToTime(dateKey, startTime, elapsedSeconds);

  state.addEntry({
    taskName,
    category: timerCategorySelect.value,
    status: "done",
    completionPercent: 100,
    date: dateKey,
    startTime,
    endTime,
    durationSeconds: elapsedSeconds,
    source: "timer"
  });

  ui.toast("Το χρονόμετρο αποθηκεύτηκε στο ημερολόγιο.", "success");

  resetTimer();
}

function resetTimer() {
  window.clearInterval(timerInterval);

  timerInterval = null;
  timerStartedTimestamp = null;
  timerSessionStartedAt = null;
  elapsedSeconds = 0;
  isTimerRunning = false;

  timerTaskNameInput.value = "";

  renderTimer();
  updateTimerButtons();
}

function renderTimer() {
  timerDisplay.textContent = formatDuration(elapsedSeconds);
}

function updateTimerButtons() {
  startButton.disabled = isTimerRunning;
  pauseButton.disabled = !isTimerRunning;
  stopButton.disabled = elapsedSeconds <= 0;
  quickTimerBar.classList.toggle("is-running", isTimerRunning);
}
