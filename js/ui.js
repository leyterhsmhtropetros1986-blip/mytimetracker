"use strict";

/* =========================
   Toast μηνύματα
========================= */

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById("toast-container");
  }

  return toastContainer;
}

export function toast(message, type = "info", durationMs = 3800) {
  const container = getToastContainer();

  if (!container) {
    return;
  }

  const item = document.createElement("div");
  item.className = `toast toast-${type}`;
  item.setAttribute("role", "status");
  item.textContent = message;

  container.append(item);

  window.requestAnimationFrame(() => {
    item.classList.add("toast-visible");
  });

  window.setTimeout(() => {
    item.classList.remove("toast-visible");
    window.setTimeout(() => item.remove(), 250);
  }, durationMs);
}

/* =========================
   Γενικό modal open/close
========================= */

const openModals = [];
let lastFocusedBeforeModal = null;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function openModal(modalElement, focusElement) {
  if (openModals.length === 0) {
    lastFocusedBeforeModal = document.activeElement;
  }

  modalElement.hidden = false;
  document.body.classList.add("modal-open");

  if (!openModals.includes(modalElement)) {
    openModals.push(modalElement);
  }

  window.setTimeout(() => {
    (focusElement || modalElement.querySelector(FOCUSABLE_SELECTOR)).focus();
  }, 50);
}

export function closeModal(modalElement) {
  modalElement.hidden = true;

  const index = openModals.indexOf(modalElement);

  if (index !== -1) {
    openModals.splice(index, 1);
  }

  if (openModals.length === 0) {
    document.body.classList.remove("modal-open");

    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }

    lastFocusedBeforeModal = null;
  }
}

/** Κρατάει το Tab μέσα στο πάνω-πάνω ανοιχτό modal (WAI-ARIA dialog pattern). */
function trapFocus(event) {
  const modalElement = openModals[openModals.length - 1];

  const focusable = Array.from(modalElement.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null
  );

  if (focusable.length === 0) {
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!modalElement.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openModals.length > 0) {
    closeModal(openModals[openModals.length - 1]);
    return;
  }

  if (event.key === "Tab" && openModals.length > 0) {
    trapFocus(event);
  }
});

/** Συνδέει backdrop-click και [data-close-modal] κουμπιά ενός modal με το κλείσιμό του. */
export function wireModalDismissal(modalElement) {
  modalElement.addEventListener("click", (event) => {
    if (event.target.dataset.closeModal === "true") {
      closeModal(modalElement);
    }
  });
}

/* =========================
   Confirm modal (αντί για window.confirm)
========================= */

let confirmModalElement = null;
let confirmTitleElement = null;
let confirmMessageElement = null;
let confirmAcceptButton = null;
let confirmCancelButton = null;
let confirmResolver = null;

function ensureConfirmModal() {
  if (confirmModalElement) {
    return;
  }

  confirmModalElement = document.getElementById("confirm-modal");
  confirmTitleElement = document.getElementById("confirm-modal-title");
  confirmMessageElement = document.getElementById("confirm-modal-message");
  confirmAcceptButton = document.getElementById("confirm-modal-accept");
  confirmCancelButton = document.getElementById("confirm-modal-cancel");

  wireModalDismissal(confirmModalElement);

  confirmAcceptButton.addEventListener("click", () => {
    closeModal(confirmModalElement);

    if (confirmResolver) {
      confirmResolver(true);
      confirmResolver = null;
    }
  });

  confirmCancelButton.addEventListener("click", () => {
    closeModal(confirmModalElement);

    if (confirmResolver) {
      confirmResolver(false);
      confirmResolver = null;
    }
  });
}

/**
 * Εμφανίζει modal επιβεβαίωσης και επιστρέφει Promise<boolean>.
 */
export function confirmDialog({
  title = "Επιβεβαίωση",
  message,
  confirmText = "Επιβεβαίωση",
  cancelText = "Ακύρωση",
  danger = false
} = {}) {
  ensureConfirmModal();

  confirmTitleElement.textContent = title;
  confirmMessageElement.textContent = message;
  confirmAcceptButton.textContent = confirmText;
  confirmCancelButton.textContent = cancelText;

  confirmAcceptButton.className = danger ? "button button-danger" : "button button-primary";

  return new Promise((resolve) => {
    confirmResolver = resolve;
    openModal(confirmModalElement, confirmAcceptButton);
  });
}

/* =========================
   Popovers (notifications, avatar menu, …)
========================= */

const openPopovers = new Set();

export function registerPopover(triggerButton, panelElement) {
  triggerButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const wasOpen = !panelElement.hidden;

    closePopovers();

    if (!wasOpen) {
      panelElement.hidden = false;
      triggerButton.setAttribute("aria-expanded", "true");
      openPopovers.add({ trigger: triggerButton, panel: panelElement });
    }
  });

  panelElement.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
      closePopovers();
    }
  });
}

export function closePopovers() {
  openPopovers.forEach(({ trigger, panel }) => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  });

  openPopovers.clear();
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".popover-anchor")) {
    closePopovers();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePopovers();
  }
});

/* =========================
   Loading κατάσταση κουμπιών
========================= */

export function setButtonLoading(button, isLoading, loadingLabel) {
  if (isLoading) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = loadingLabel || "Επεξεργασία…";
    button.disabled = true;
    button.classList.add("is-loading");
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
    button.classList.remove("is-loading");
  }
}

/* =========================
   Empty state toggler
========================= */

export function toggleEmptyState(emptyElement, isEmpty) {
  emptyElement.hidden = !isEmpty;
}

/* =========================
   Κέλυφος εφαρμογής: sidebar collapse + mobile drawer
========================= */

const SIDEBAR_COLLAPSED_KEY = "mytimetracker_sidebar_collapsed";

export function initShell() {
  const appShell = document.getElementById("app-shell");
  const collapseButton = document.getElementById("sidebar-collapse-button");
  const mobileToggleButton = document.getElementById("sidebar-toggle-mobile");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");

  let collapsed = false;

  try {
    collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch (error) {
    collapsed = false;
  }

  appShell.classList.toggle("sidebar-collapsed", collapsed);

  collapseButton.addEventListener("click", () => {
    collapsed = !collapsed;
    appShell.classList.toggle("sidebar-collapsed", collapsed);

    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch (error) {
      /* localStorage μη διαθέσιμο — αγνόησέ το */
    }
  });

  mobileToggleButton.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("sidebar-open");
    mobileToggleButton.setAttribute("aria-expanded", String(isOpen));
  });

  sidebarBackdrop.addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
    mobileToggleButton.setAttribute("aria-expanded", "false");
  });

  registerPopover(document.getElementById("avatar-button"), document.getElementById("avatar-menu"));
}
