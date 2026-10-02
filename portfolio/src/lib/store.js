import { useSyncExternalStore } from "react";

// A tiny external store: shared state without a provider tree, readable from
// React (useStore) and from plain modules like the lazily loaded 3D scene.
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set(next) {
      const value = typeof next === "function" ? next(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
