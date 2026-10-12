import { useEffect } from "react";

const SIZE = 64;
const STEPS = 48; // the ring only redraws when it actually grows a step

// The browser tab keeps up with you: the favicon's volleyball gets a ring
// that fills as you scroll down the page (the tab title follows the current
// section — lib/sectionStore.js). Drawn on a small canvas from the very same
// favicon.svg; if anything about that fails, the plain icon simply stays.
export default function LiveFavicon() {
  useEffect(() => {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return;
    const original = link.getAttribute("href");
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    let ready = false;
    let step = -1;
    let raf = 0;

    const draw = () => {
      raf = 0;
      if (!ready) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const next = Math.round(p * STEPS);
      if (next === step) return;
      step = next;
      const day = document.documentElement.dataset.act === "day";
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 9, 9, SIZE - 18, SIZE - 18);
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.strokeStyle = day ? "rgba(11,18,38,0.22)" : "rgba(242,239,232,0.22)";
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
      if (step > 0) {
        ctx.strokeStyle = day ? "#a8360b" : "#ffb347";
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 4, -Math.PI / 2, -Math.PI / 2 + (step / STEPS) * Math.PI * 2);
        ctx.stroke();
      }
      try {
        link.setAttribute("href", canvas.toDataURL("image/png"));
        link.setAttribute("type", "image/png");
      } catch {
        /* canvas unreadable — keep the plain icon */
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    img.onload = () => {
      ready = true;
      schedule();
    };
    img.src = original;
    window.addEventListener("scroll", schedule, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      link.setAttribute("href", original);
      link.setAttribute("type", "image/svg+xml");
    };
  }, []);

  return null;
}
