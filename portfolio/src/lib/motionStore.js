import { createStore } from "./store.js";
import { readString, writeString } from "./storage.js";

// "on" | "off". One switch for every moving thing on the page — the 3D scene,
// the 2D fallback spin and all CSS animations (see [data-motion] in
// styles/index.css). WCAG 2.2.2 needs a way to pause motion that runs longer
// than five seconds; the header toggle drives this store.
//
// The inline script in index.html already resolved "stored choice, else OS
// prefers-reduced-motion" onto <html data-motion> before first paint — this
// store starts from that, so both always agree. Keep the key in sync there.
const KEY = "sieder.motion";

const initial = typeof document !== "undefined" && document.documentElement.dataset.motion === "off" ? "off" : "on";

export const motionStore = createStore(initial);

motionStore.subscribe((value) => {
  document.documentElement.dataset.motion = value;
});

export function setMotion(value, { remember = true } = {}) {
  motionStore.set(value);
  if (remember) writeString(KEY, value);
}

export function toggleMotion() {
  setMotion(motionStore.get() === "on" ? "off" : "on");
}

// Follow live OS changes — unless the visitor made an explicit choice here.
if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", (e) => {
    if (readString(KEY) == null) setMotion(e.matches ? "off" : "on", { remember: false });
  });
}
