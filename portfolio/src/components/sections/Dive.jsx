import { useLayoutEffect, useRef } from "react";
import { useStore } from "../../lib/store.js";
import { ballStatus } from "../../lib/ballBridge.js";
import { actOverride } from "../../lib/sectionStore.js";
import { clamp01, smoothstep } from "../../lib/ballPhysics.js";
import { useCinematic } from "../../hooks/useMedia.js";
import { ScrollTrigger } from "../../lib/smoothScroll.js";
import VolleyballSVG from "../ball/VolleyballSVG.jsx";

// "Angriff" — the turn of the page. The ball is spiked straight at you: its
// spot box grows until the ball fills the screen, cream floods out from the
// middle, and the ball dissolves into it — the second act (day) begins.
// Purely visual, so the whole stage is hidden from screen readers.
// Calm path: a short gradient from night to cream with the ball in it.
export default function Dive() {
  const cine = useCinematic();
  const show2D = useStore(ballStatus) !== "ready";
  const runwayRef = useRef(null);
  const spotRef = useRef(null);
  const floodRef = useRef(null);
  const wordRef = useRef(null);
  const hintRef = useRef(null);

  useLayoutEffect(() => {
    const runway = runwayRef.current;
    const spot = spotRef.current;
    if (!cine || !runway || !spot) return;

    const apply = (p) => {
      const vh = window.innerHeight;
      const grow = Math.pow(clamp01(p / 0.82), 3); // eases in: the ball accelerates at you
      const size = vh * 0.22 + grow * vh * 2.15;
      spot.style.width = `${size.toFixed(1)}px`;
      spot.style.height = `${size.toFixed(1)}px`;
      const fade = 1 - smoothstep(0.78, 0.95, p);
      spot.dataset.ballOpacity = fade.toFixed(3);
      spot.style.opacity = fade.toFixed(3); // the 2D ball fades the same way
      if (floodRef.current) floodRef.current.style.clipPath = `circle(${(smoothstep(0.5, 0.88, p) * 78).toFixed(2)}vmax at 50% 50%)`;
      if (wordRef.current) {
        wordRef.current.style.transform = `translate(-50%, -50%) scale(${(1 + grow * 1.1).toFixed(3)})`;
        wordRef.current.style.opacity = (1 - smoothstep(0.3, 0.68, p)).toFixed(3);
      }
      if (hintRef.current) hintRef.current.style.opacity = (1 - smoothstep(0.04, 0.2, p)).toFixed(3);
      // the screen is cream from here on — the header can switch already
      actOverride.set(p > 0.8 ? "day" : null);
    };

    const trigger = ScrollTrigger.create({
      trigger: runway,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
      onLeave: () => actOverride.set("day"), // below the dive it is day for good
      onLeaveBack: () => actOverride.set(null),
    });
    apply(trigger.progress);

    return () => {
      trigger.kill();
      actOverride.set(null);
      spot.removeAttribute("style");
      delete spot.dataset.ballOpacity;
    };
  }, [cine]);

  if (!cine) {
    return (
      <div id="angriff" aria-hidden="true" className="relative grid h-[42svh] place-items-center bg-gradient-to-b from-transparent via-night-900 to-cream">
        <div data-ball-spot="dive" className="aspect-square w-24" />
      </div>
    );
  }

  return (
    <div id="angriff" ref={runwayRef} aria-hidden="true" className="relative h-[230svh]">
      <div className="sticky top-0 h-svh overflow-clip">
        <p className="eyebrow absolute left-12 top-24 flex items-center gap-3">
          <span className="h-px w-8 bg-amber" />
          04 — Angriff
        </p>
        <span
          ref={wordRef}
          className="absolute left-1/2 top-1/2 whitespace-nowrap font-tall text-[34vw] leading-none tracking-[0.01em] text-transparent [-webkit-text-stroke:1.5px_rgb(242_239_232/0.28)]"
        >
          Angriff
        </span>
        <div ref={floodRef} className="absolute inset-0 bg-cream" style={{ clipPath: "circle(0vmax at 50% 50%)" }} />
        <div
          ref={spotRef}
          data-ball-spot="dive"
          data-ball-tight="true"
          className="absolute left-1/2 top-1/2 aspect-square w-[22svh] -translate-x-1/2 -translate-y-1/2"
        >
          {show2D && <VolleyballSVG className="size-full" />}
        </div>
        <p ref={hintRef} className="absolute inset-x-0 bottom-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-mist">
          Weiter scrollen — der Ball kommt
        </p>
      </div>
    </div>
  );
}
