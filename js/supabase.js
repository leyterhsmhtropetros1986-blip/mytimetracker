"use strict";

/*
 * Project URL + publishable key — both are designed to be public and safe to
 * ship in browser code (that is the whole point of this key type). The
 * service_role/secret key must NEVER be added here or anywhere in js/.
 *
 * @supabase/supabase-js is loaded lazily from a CDN (no bundler/build step in
 * this project) instead of as a static top-level import: a static import
 * would make the SDK a hard dependency of the whole app.js module graph, and
 * if it can't be fetched (offline on a first-ever visit, or the browser's
 * HTTP cache for it has been evicted), the entire app would fail to boot —
 * even for a returning, already-authenticated user who just wants to see
 * their own already-synced local data offline. Loading it lazily lets
 * auth-guard.js degrade to a clear "can't reach the server" message instead
 * of a hard crash, and keeps the local-first PWA guarantee intact.
 */
const SUPABASE_URL = "https://rronajsgpisxkokssivb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_BEly379XI03DkFrWh9QvqA_ZcUT6gRK";

let clientPromise = null;

export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2")
      .then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        })
      )
      .catch((error) => {
        clientPromise = null; // allow retrying once connectivity returns
        throw error;
      });
  }

  return clientPromise;
}
