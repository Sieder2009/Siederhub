import { useSyncExternalStore } from "react";
import { useStore } from "../lib/store.js";
import { motionStore } from "../lib/motionStore.js";

// Live media query, e.g. useMedia("(min-width: 960px)").
export function useMedia(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

// Big enough screen for the pinned, scroll-choreographed layout. Below it —
// phones, short landscape screens — every section is a plain vertical layout.
export const CINEMA_QUERY = "(min-width: 960px) and (min-height: 700px)";

// The full choreography: motion allowed AND a big enough screen. Everyone
// else gets the calm path (no pins, no scroll-driven transforms).
export function useCinematic() {
  const motion = useStore(motionStore);
  const big = useMedia(CINEMA_QUERY);
  return motion === "on" && big;
}
