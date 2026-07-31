"use strict";

/* Ελάχιστο in-memory υποκατάστατο του browser localStorage, ώστε το storage.js/state.js
   να τρέχουν αναλλοίωτα κάτω από τον Node test runner (ο Node δεν έχει localStorage). */
export class MemoryLocalStorage {
  #store = new Map();

  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }

  setItem(key, value) {
    this.#store.set(key, String(value));
  }

  removeItem(key) {
    this.#store.delete(key);
  }

  clear() {
    this.#store.clear();
  }
}
