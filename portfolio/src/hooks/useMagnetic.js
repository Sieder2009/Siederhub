import { useEffect, useRef } from "react";
import { useStore } from "../lib/store.js";
import { motionStore } from "../lib/motionStore.js";
import { finePointer } from "../lib/capabilities.js";

// Nudges an element toward the cursor while hovered, like a soft magnet —
// mouse users with motion allowed only. Uses the `translate` property, so it
// layers on top of any transform the element already has.
export function useMagnetic(strength = 0.22) {
  const ref = useRef(null);
  const motion = useStore(motionStore);

  useEffect(() => {
    const el = ref.current;
    if (!el || motion !== "on" || !finePointer) return;
    let raf = 0;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      el.style.translate = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      leave();
    };
  }, [motion, strength]);

  return ref;
}
