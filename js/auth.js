"use strict";

import { getSupabaseClient } from "./supabase.js";

/**
 * Λεπτό wrapper πάνω από το Supabase Auth — ίδιος διαχωρισμός ρόλων με το
 * state.js/storage.js: εδώ μόνο κλήσεις προς το Supabase και μετάφραση
 * σφαλμάτων· η λογική του πότε δείχνουμε ποια οθόνη ζει στο auth-guard.js.
 */

export async function getSession() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Αποτυχία ανάκτησης session:", error);
      return null;
    }

    return data.session;
  } catch (error) {
    console.error("Το Supabase SDK δεν φορτώθηκε:", error);
    return null;
  }
}

/**
 * callback(event, session). "event" γίνεται "SDK_UNAVAILABLE" αν το CDN SDK
 * δεν φορτώσει καθόλου (π.χ. offline σε πρώτη επίσκεψη). Επιστρέφει function
 * για unsubscribe (no-op αν απέτυχε η φόρτωση).
 */
export async function onAuthStateChange(callback) {
  try {
    const supabase = await getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
    return () => data.subscription.unsubscribe();
  } catch (error) {
    console.error("Το Supabase SDK δεν φορτώθηκε:", error);
    callback("SDK_UNAVAILABLE", null);
    return () => {};
  }
}

export async function signUp({ email, password, fullName }) {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined
      }
    });

    if (error) {
      return { ok: false, error: mapAuthError(error) };
    }

    return { ok: true, user: data.user, session: data.session };
  } catch (error) {
    return { ok: false, error: OFFLINE_MESSAGE };
  }
}

export async function signIn({ email, password }) {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { ok: false, error: mapAuthError(error) };
    }

    return { ok: true, user: data.user, session: data.session };
  } catch (error) {
    return { ok: false, error: OFFLINE_MESSAGE };
  }
}

export async function signOut() {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { ok: false, error: mapAuthError(error) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: OFFLINE_MESSAGE };
  }
}

export async function requestPasswordReset(email) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) {
      return { ok: false, error: mapAuthError(error) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: OFFLINE_MESSAGE };
  }
}

export async function updatePassword(newPassword) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { ok: false, error: mapAuthError(error) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: OFFLINE_MESSAGE };
  }
}

const OFFLINE_MESSAGE = "Δεν ήταν δυνατή η σύνδεση με τον server. Έλεγξε τη σύνδεσή σου στο διαδίκτυο και δοκίμασε ξανά.";

function mapAuthError(error) {
  const message = (error && error.message) || "";

  if (message.includes("Invalid login credentials")) {
    return "Λάθος email ή κωδικός.";
  }

  if (message.includes("User already registered")) {
    return "Υπάρχει ήδη λογαριασμός με αυτό το email.";
  }

  if (message.includes("Password should be at least")) {
    return "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.";
  }

  if (message.includes("Email not confirmed")) {
    return "Επιβεβαίωσε πρώτα το email σου — έλεγξε τα εισερχόμενά σου.";
  }

  return message || "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
}
