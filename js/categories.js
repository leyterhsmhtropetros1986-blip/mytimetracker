"use strict";

import * as state from "./state.js";
import * as ui from "./ui.js";

const SWATCH_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#64748b",
  "#0d9488",
  "#db2777",
  "#7c3aed"
];

let categoryManagerList;
let newCategoryNameInput;
let newCategoryColorPicker;
let newCategoryIconInput;
let addCategoryButton;

let selectedNewColor = SWATCH_COLORS[0];
let editingCategoryId = null;

export function init() {
  categoryManagerList = document.getElementById("category-manager-list");
  newCategoryNameInput = document.getElementById("new-category-name");
  newCategoryColorPicker = document.getElementById("new-category-color-picker");
  newCategoryIconInput = document.getElementById("new-category-icon");
  addCategoryButton = document.getElementById("add-category-button");

  buildSwatchPicker(newCategoryColorPicker, selectedNewColor, (color) => {
    selectedNewColor = color;
  });

  addCategoryButton.addEventListener("click", handleAddCategory);

  newCategoryNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddCategory();
    }
  });
}

function buildSwatchPicker(container, selectedColor, onSelect) {
  container.innerHTML = "";

  SWATCH_COLORS.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch-option";
    swatch.style.background = color;
    swatch.setAttribute("aria-label", color);

    if (color === selectedColor) {
      swatch.classList.add("selected");
    }

    swatch.addEventListener("click", () => {
      container.querySelectorAll(".color-swatch-option").forEach((el) => el.classList.remove("selected"));
      swatch.classList.add("selected");
      onSelect(color);
    });

    container.append(swatch);
  });
}

function handleAddCategory() {
  const name = newCategoryNameInput.value.trim();
  const icon = newCategoryIconInput.value.trim() || "🏷️";

  const result = state.addCategory({ name, color: selectedNewColor, icon });

  if (!result.ok) {
    ui.toast(result.error, "error");
    return;
  }

  newCategoryNameInput.value = "";
  newCategoryIconInput.value = "";
  ui.toast(`Η κατηγορία "${name}" προστέθηκε.`, "success");
}

export function render() {
  categoryManagerList.innerHTML = "";

  state.getCategories().forEach((category) => {
    const usageCount = state.getEntries().filter((entry) => entry.category === category.name).length;

    if (editingCategoryId === category.id) {
      categoryManagerList.append(createEditRow(category));
    } else {
      categoryManagerList.append(createDisplayRow(category, usageCount));
    }
  });
}

function createDisplayRow(category, usageCount) {
  const row = document.createElement("div");
  row.className = "category-manager-row";

  const swatch = document.createElement("span");
  swatch.className = "category-manager-swatch";
  swatch.style.background = `${category.color}22`;
  swatch.textContent = category.icon;

  const name = document.createElement("span");
  name.className = "category-manager-name";
  name.textContent = category.name;

  const count = document.createElement("span");
  count.className = "category-manager-count";
  count.textContent = usageCount === 1 ? "1 task" : `${usageCount} tasks`;

  const actions = document.createElement("div");
  actions.className = "category-manager-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "entry-action-button edit";
  editButton.textContent = "Επεξεργασία";
  editButton.addEventListener("click", () => {
    editingCategoryId = category.id;
    render();
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "entry-action-button delete";
  deleteButton.textContent = "Διαγραφή";
  deleteButton.addEventListener("click", () => handleDeleteCategory(category, usageCount));

  actions.append(editButton, deleteButton);
  row.append(swatch, name, count, actions);

  return row;
}

function createEditRow(category) {
  const row = document.createElement("div");
  row.className = "category-manager-row";
  row.style.flexWrap = "wrap";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = category.name;
  nameInput.style.flex = "1";
  nameInput.style.minWidth = "120px";
  nameInput.style.minHeight = "38px";
  nameInput.style.padding = "6px 10px";
  nameInput.style.border = "1px solid var(--border-default)";
  nameInput.style.borderRadius = "var(--radius-sm)";
  nameInput.style.background = "var(--surface-card)";

  const iconInput = document.createElement("input");
  iconInput.type = "text";
  iconInput.value = category.icon;
  iconInput.maxLength = 4;
  iconInput.style.width = "50px";
  iconInput.style.textAlign = "center";
  iconInput.style.minHeight = "38px";
  iconInput.style.border = "1px solid var(--border-default)";
  iconInput.style.borderRadius = "var(--radius-sm)";
  iconInput.style.background = "var(--surface-card)";

  const colorPicker = document.createElement("div");
  colorPicker.className = "color-swatch-picker";

  let selectedColor = category.color;
  buildSwatchPicker(colorPicker, selectedColor, (color) => {
    selectedColor = color;
  });

  const actions = document.createElement("div");
  actions.className = "category-manager-actions";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "entry-action-button edit";
  saveButton.textContent = "Αποθήκευση";

  saveButton.addEventListener("click", () => {
    const result = state.updateCategory(category.id, {
      name: nameInput.value.trim(),
      icon: iconInput.value.trim() || "🏷️",
      color: selectedColor
    });

    if (!result.ok) {
      ui.toast(result.error, "error");
      return;
    }

    editingCategoryId = null;
    ui.toast("Η κατηγορία ενημερώθηκε.", "success");
  });

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "entry-action-button delete";
  cancelButton.textContent = "Ακύρωση";
  cancelButton.addEventListener("click", () => {
    editingCategoryId = null;
    render();
  });

  actions.append(saveButton, cancelButton);
  row.append(nameInput, iconInput, colorPicker, actions);

  return row;
}

async function handleDeleteCategory(category, usageCount) {
  const message =
    usageCount > 0
      ? `${usageCount} tasks χρησιμοποιούν την κατηγορία "${category.name}". Θα παραμείνουν με αυτό το όνομα χωρίς χρώμα/εικονίδιο. Συνέχεια;`
      : `Να διαγραφεί η κατηγορία "${category.name}";`;

  const confirmed = await ui.confirmDialog({
    title: "Διαγραφή κατηγορίας",
    message,
    confirmText: "Διαγραφή",
    danger: true
  });

  if (!confirmed) {
    return;
  }

  const result = state.deleteCategory(category.id);

  if (!result.ok) {
    ui.toast(result.error, "error");
    return;
  }

  ui.toast("Η κατηγορία διαγράφηκε.", "success");
}
