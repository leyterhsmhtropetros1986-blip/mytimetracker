"use strict";

import { getSupabaseClient } from "./supabase.js";
import * as auth from "./auth.js";
import * as ui from "./ui.js";

const SHELL_IDS = ["boot-loading", "auth-shell", "app-shell"];

let pendingVerificationEmail = "";

function showShell(activeId) {
  SHELL_IDS.forEach((shellId) => {
    const element = document.getElementById(shellId);

    if (element) {
      element.hidden = shellId !== activeId;
    }
  });
}

function setAuthView(viewName) {
  document.querySelectorAll(".auth-view").forEach((view) => {
    view.hidden = view.dataset.authView !== viewName;
  });

  const firstInput = document.querySelector(`.auth-view[data-auth-view="${viewName}"] input`);

  if (firstInput) {
    window.setTimeout(() => firstInput.focus(), 50);
  }
}

function showAuthMessage(elementId, message) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = message || "";
  element.hidden = !message;
}

function clearAuthMessages() {
  [
    "login-error",
    "register-error",
    "forgot-error",
    "forgot-success",
    "reset-error",
    "verify-code-error",
    "verify-code-success"
  ].forEach((id) => showAuthMessage(id, ""));
}

function wireViewSwitchLinks() {
  document.querySelectorAll("[data-auth-view-target]").forEach((button) => {
    button.addEventListener("click", () => {
      clearAuthMessages();
      setAuthView(button.dataset.authViewTarget);
    });
  });
}

function wireLoginForm() {
  const form = document.getElementById("auth-login-form");
  const submitButton = document.getElementById("login-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showAuthMessage("login-error", "");

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    ui.setButtonLoading(submitButton, true, "Σύνδεση…");
    const result = await auth.signIn({ email, password });
    ui.setButtonLoading(submitButton, false);

    if (!result.ok) {
      showAuthMessage("login-error", result.error);
      return;
    }

    /* Καθαρό reload αντί για δυναμικό "boot" εν κινήσει — αποφεύγει μερικώς
       αρχικοποιημένη κατάσταση της εφαρμογής μετά από login. */
    window.location.reload();
  });
}

function wireRegisterForm() {
  const form = document.getElementById("auth-register-form");
  const submitButton = document.getElementById("register-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showAuthMessage("register-error", "");

    const fullName = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    ui.setButtonLoading(submitButton, true, "Δημιουργία…");
    const result = await auth.signUp({ email, password, fullName });
    ui.setButtonLoading(submitButton, false);

    if (!result.ok) {
      showAuthMessage("register-error", result.error);
      return;
    }

    if (!result.session) {
      /* Το project απαιτεί επιβεβαίωση email πριν από το πρώτο login: δείξε
         την οθόνη εισαγωγής κωδικού αντί να επιστρέψεις στο login. */
      pendingVerificationEmail = email;
      const descriptionElement = document.getElementById("verify-code-description");

      if (descriptionElement) {
        descriptionElement.textContent = `Στείλαμε έναν κωδικό επιβεβαίωσης στο ${email}.`;
      }

      clearAuthMessages();
      setAuthView("verify-code");
      return;
    }

    window.location.reload();
  });
}

function wireVerifyCodeForm() {
  const form = document.getElementById("auth-verify-code-form");
  const submitButton = document.getElementById("verify-code-submit");
  const resendButton = document.getElementById("verify-code-resend-button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showAuthMessage("verify-code-error", "");

    const token = document.getElementById("verify-code-input").value.trim();

    ui.setButtonLoading(submitButton, true, "Επιβεβαίωση…");
    const result = await auth.verifySignupOtp({ email: pendingVerificationEmail, token });
    ui.setButtonLoading(submitButton, false);

    if (!result.ok) {
      showAuthMessage("verify-code-error", result.error);
      return;
    }

    window.location.reload();
  });

  resendButton.addEventListener("click", async () => {
    showAuthMessage("verify-code-error", "");
    showAuthMessage("verify-code-success", "");

    ui.setButtonLoading(resendButton, true, "Αποστολή…");
    const result = await auth.resendSignupOtp(pendingVerificationEmail);
    ui.setButtonLoading(resendButton, false);

    if (!result.ok) {
      showAuthMessage("verify-code-error", result.error);
      return;
    }

    showAuthMessage("verify-code-success", "Στάλθηκε νέος κωδικός.");
  });
}

function wireForgotForm() {
  const form = document.getElementById("auth-forgot-form");
  const submitButton = document.getElementById("forgot-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showAuthMessage("forgot-error", "");
    showAuthMessage("forgot-success", "");

    const email = document.getElementById("forgot-email").value.trim();

    ui.setButtonLoading(submitButton, true, "Αποστολή…");
    const result = await auth.requestPasswordReset(email);
    ui.setButtonLoading(submitButton, false);

    if (!result.ok) {
      showAuthMessage("forgot-error", result.error);
      return;
    }

    showAuthMessage("forgot-success", "Αν υπάρχει λογαριασμός με αυτό το email, στάλθηκε link επαναφοράς.");
  });
}

function wireResetForm() {
  const form = document.getElementById("auth-reset-form");
  const submitButton = document.getElementById("reset-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showAuthMessage("reset-error", "");

    const password = document.getElementById("reset-password").value;
    const confirmPassword = document.getElementById("reset-password-confirm").value;

    if (password !== confirmPassword) {
      showAuthMessage("reset-error", "Οι κωδικοί δεν ταιριάζουν.");
      return;
    }

    ui.setButtonLoading(submitButton, true, "Αποθήκευση…");
    const result = await auth.updatePassword(password);
    ui.setButtonLoading(submitButton, false);

    if (!result.ok) {
      showAuthMessage("reset-error", result.error);
      return;
    }

    /* Μετά την αλλαγή κωδικού αποσύνδεση + καθαρό reload, ώστε ο χρήστης να
       ξανασυνδεθεί ρητά με τον νέο κωδικό, χωρίς κατάλοιπο recovery-session. */
    await auth.signOut();
    window.location.href = window.location.pathname;
  });
}

function wireAuthForms() {
  wireViewSwitchLinks();
  wireLoginForm();
  wireRegisterForm();
  wireForgotForm();
  wireResetForm();
  wireVerifyCodeForm();
}

/**
 * Καλείται μία φορά, στην εκκίνηση. onAuthenticated(session) καλείται μόνο
 * όταν υπάρχει ενεργό session — αναλαμβάνει να "ανάψει" την υπόλοιπη εφαρμογή.
 *
 * Η αρχική απόφαση (auth-shell ή app-shell) βασίζεται σε ρητό getSession(),
 * όχι στο πρώτο callback του onAuthStateChange — το Supabase JS client δεν
 * εγγυάται σε κάθε έκδοση ότι θα καλέσει άμεσα το listener μόνο επειδή
 * εγγράφηκε, οπότε η αναμονή σε αυτό μπορεί να μείνει κρεμασμένη επ' αόριστον
 * όταν δεν υπάρχει καμία μετάβαση κατάστασης να πυροδοτήσει το event.
 */
export async function init(onAuthenticated) {
  wireAuthForms();

  let session = null;

  try {
    await getSupabaseClient();
    session = await auth.getSession();
  } catch (error) {
    console.error("Το Supabase SDK δεν φορτώθηκε:", error);
    showShell("auth-shell");
    setAuthView("login");
    showAuthMessage(
      "login-error",
      "Δεν ήταν δυνατή η σύνδεση με τον server ελέγχου ταυτότητας. Έλεγξε τη σύνδεσή σου στο διαδίκτυο και ξαναφόρτωσε τη σελίδα."
    );
    return;
  }

  if (session) {
    showShell("app-shell");
    onAuthenticated(session);
  } else {
    showShell("auth-shell");
    setAuthView("login");
  }

  /* Μόνο για ό,τι συμβαίνει ΜΕΤΑ την αρχική απόφαση — κυρίως το recovery
     deep-link (χρήστης πατάει το email link ενώ η εφαρμογή είναι ήδη
     ανοιχτή). Login/logout/register κάνουν πλήρες reload, οπότε δεν
     χρειάζεται να χειριστούμε SIGNED_IN/SIGNED_OUT εδώ ξανά. */
  auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      clearAuthMessages();
      showShell("auth-shell");
      setAuthView("reset-password");
    }
  });
}
