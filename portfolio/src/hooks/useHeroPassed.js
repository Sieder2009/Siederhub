import { useEffect, useState } from "react";
import { ANCHOR_SELECTOR } from "../lib/ballBridge.js";

// true once the hero's ball spot has scrolled (mostly) out of view above —
// that's when the ball leaves the hero and docks in the corner.
export function useHeroPassed() {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    const anchor = document.querySelector(ANCHOR_SELECTOR);
    if (!anchor || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => setPassed(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)),
      { rootMargin: "-30% 0px 0px 0px" }
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, []);
  return passed;
}
