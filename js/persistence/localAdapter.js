// Local-first persistence adapter: a thin promisified facade over the
// existing store.js primitives. store.js still owns the schema, the
// localStorage key, migration and the in-memory fallback — this adapter
// adds no logic, it only gives the app one async surface to talk to so a
// future cloudAdapter (same five methods) can be swapped in without
// touching any screen.

import {
  loadState,
  saveState,
  resetState,
  storageAvailable,
} from "../store.js";

let lastState = null;

export const localAdapter = {
  name: "local",

  isAvailable() {
    return storageAvailable();
  },

  async load() {
    lastState = loadState();
    return lastState;
  },

  async save(state) {
    lastState = state;
    return saveState(state);
  },

  async clear() {
    lastState = resetState();
    return lastState;
  },

  meta() {
    return {
      synced: false,
      lastSyncAt: null,
      deviceId: lastState ? lastState.deviceId || null : null,
    };
  },
};
