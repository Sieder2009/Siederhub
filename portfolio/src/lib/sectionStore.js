import { useEffect } from "react";
import { createStore } from "./store.js";
import { SECTIONS, sectionById } from "./sections.js";

// Which section is "playing" right now: the one crossing a thin band just
// above the middle of the viewport. Read by the 3D ball (where to fly), the
// header (night/day colours) and the tab title.
export const sectionStore = createStore(SECTIONS[0].id);

// The dive turns the page to day before the next section has arrived (the
// cream has already flooded the screen) — it may override the act, but only
// while it is the current section, so a jump elsewhere can never leave a
// stale override behind.
export const actOverride = createStore(null);
const OVERRIDABLE = "angriff";

const BAND = "-44% 0px -55% 0px";

function applyAct() {
  const section = sectionById(sectionStore.get());
  const override = section.id === OVERRIDABLE ? actOverride.get() : null;
  document.documentElement.dataset.act = override || section.act;
}

export function useSectionTracking() {
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return;
    const inBand = new Map();

    const apply = () => {
      // first section in document order that touches the band; while the
      // band sits in a gap (never, sections are contiguous) keep the last one
      const current = els.find((el) => inBand.get(el));
      if (current) sectionStore.set(current.id);
    };

    let io;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => inBand.set(e.target, e.isIntersecting));
          apply();
        },
        { rootMargin: BAND }
      );
      els.forEach((el) => io.observe(el));
    }

    const offSection = sectionStore.subscribe((id) => {
      document.title = sectionById(id).title;
      applyAct();
    });
    const offOverride = actOverride.subscribe(applyAct);
    applyAct(); // also right if the page loads scrolled, e.g. via #projekte

    return () => {
      io?.disconnect();
      offSection();
      offOverride();
    };
  }, []);
}
