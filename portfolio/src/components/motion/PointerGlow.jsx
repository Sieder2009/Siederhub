import { useEffect, useRef } from "react";
import { useStore } from "../../lib/store.js";
import { motionStore } from "../../lib/motionStore.js";
import { finePointer } from "../../lib/capabilities.js";

// A faint warm light that trails the mouse across the night act — like a
// hall light catching the court. Mouse users with motion on only; it never
// takes pointer events and fades out on the cream day act (styles: .pointer-glow).
export default function PointerGlow() {
  const motion = useStore(motionStore);
  const ref = useRef(null);
  const on = motion === "on" && finePointer;

  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let tx = x;
    let ty = y;
    let raf = 0;
    const frame = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      el.style.transform = `translate3d(${(x - 260).toFixed(1)}px, ${(y - 260).toFixed(1)}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(frame) : 0;
    };
    const move = (e) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      el.classList.add("is-on");
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const leave = () => el.classList.remove("is-on");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [on]);

  if (!on) return null;
  return <div ref={ref} aria-hidden="true" className="pointer-glow" />;
}
