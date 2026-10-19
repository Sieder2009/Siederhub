import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { gsap } from "../../lib/smoothScroll.js";
import { motionStore } from "../../lib/motionStore.js";

// A court line (net tape, floor line) that only moves when the ball hits it:
// strike(clientX) sends a damped wave out from that point for TAPE.life
// seconds, then the line is straight again. One attribute write per frame.
export const TAPE = { amp: 8, decay: 0.42, reach: 900, k: 0.0157, w: 22, life: 1.2 };

// px offset (+ = down) at dx px from the impact, t seconds after it
export function tapeOffset(dx, t, o = TAPE) {
  if (t < 0 || t > o.life) return 0;
  const d = Math.abs(dx);
  return o.amp * Math.exp(-t / o.decay) * Math.exp(-d / o.reach) * Math.cos(o.k * d - o.w * t);
}

const STRAIGHT = "M0 12 L1000 12";
const SAMPLES = 48;

const Tape = forwardRef(function Tape({ className = "", style }, ref) {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const stopRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      // onFrame(sample) runs every frame; sample(clientX) → px offset there now
      strike(clientX, { amp = TAPE.amp, onFrame } = {}) {
        const svg = svgRef.current;
        const path = pathRef.current;
        if (!svg || !path || motionStore.get() !== "on") return;
        stopRef.current?.();
        const box = svg.getBoundingClientRect();
        if (box.width < 1) return;
        const o = { ...TAPE, amp };
        const t0 = gsap.ticker.time;
        const tick = () => {
          const t = gsap.ticker.time - t0;
          if (t > o.life || motionStore.get() !== "on") return stop();
          let d = "";
          for (let i = 0; i <= SAMPLES; i++) {
            const x = box.left + (i / SAMPLES) * box.width;
            d += `${i ? "L" : "M"}${((i / SAMPLES) * 1000).toFixed(1)} ${(12 + tapeOffset(x - clientX, t, o)).toFixed(2)}`;
          }
          path.setAttribute("d", d);
          onFrame?.((x) => tapeOffset(x - clientX, t, o));
        };
        const stop = () => {
          gsap.ticker.remove(tick);
          path.setAttribute("d", STRAIGHT);
          onFrame?.(() => 0);
          stopRef.current = null;
        };
        stopRef.current = stop;
        gsap.ticker.add(tick);
      },
    }),
    []
  );

  useEffect(() => () => stopRef.current?.(), []);

  return (
    <svg ref={svgRef} aria-hidden="true" focusable="false" viewBox="0 0 1000 24" preserveAspectRatio="none" className={`tape ${className}`} style={style}>
      <path ref={pathRef} d={STRAIGHT} vectorEffect="non-scaling-stroke" />
    </svg>
  );
});

export default Tape;
