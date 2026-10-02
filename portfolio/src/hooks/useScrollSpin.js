import { useEffect } from "react";
import { clamp, spinStep } from "../lib/ballPhysics.js";
import { getScrollVelocity, subscribeScroll } from "../lib/scrollVelocity.js";

const GAIN = 0.75; // degrees per second, per px/s of scroll speed
const MAX = 900; // deg/s — beyond this the panels would just strobe
const INERTIA = 2.6; // how fast the spin follows the scroll (1/s)

// Spins the 2D ball's panel group with the scroll speed — same inertia
// physics as the 3D ball, just in the screen plane. The loop only runs while
// the ball is actually turning, so a resting page costs nothing.
export function useScrollSpin(ref, enabled) {
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let running = false;
    let last = 0;
    let angle = 0;
    let omega = 0;

    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const target = clamp(getScrollVelocity(now) * GAIN, -MAX, MAX);
      const step = spinStep(omega, target, INERTIA, dt);
      omega = step.omega;
      angle = (angle + step.angle) % 360;
      ref.current?.setAttribute("transform", `rotate(${angle.toFixed(2)} 100 100)`);
      if (Math.abs(omega) > 0.5 || Math.abs(target) > 0.5) raf = requestAnimationFrame(frame);
      else running = false;
    };

    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const unsubscribe = subscribeScroll(wake);
    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
    };
  }, [ref, enabled]);
}
