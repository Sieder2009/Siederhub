import { useRef } from "react";
import { useStore } from "../lib/store.js";
import { motionStore } from "../lib/motionStore.js";
import { ballSpotStore, ballStatus } from "../lib/ballBridge.js";
import { useHeroPassed } from "../hooks/useHeroPassed.js";
import { useScrollSpin } from "../hooks/useScrollSpin.js";
import VolleyballSVG from "./ball/VolleyballSVG.jsx";
import { ArrowUp } from "./ui/icons.jsx";

// Once the hero is gone, the ball docks here and keeps turning with every
// scroll — and the dock doubles as "back to top". With 3D on, the WebGL ball
// flies in and floats over this button ([data-ball-dock] is its target);
// otherwise the 2D ball inside spins with the same scroll physics.
export default function BallDock() {
  const passed = useHeroPassed();
  const motion = useStore(motionStore);
  const status = useStore(ballStatus);
  const spinRef = useRef(null);
  const ballAt = useStore(ballSpotStore);
  const show2D = status !== "ready";
  // the 3D ball is visiting a section spot: the dock is a plain "back to top" button meanwhile
  const away = !show2D && ballAt !== "dock";

  useScrollSpin(spinRef, passed && show2D && motion === "on");

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: motion === "on" ? "smooth" : "auto" });
    // keyboard users continue from the top of the page, not from down here
    document.getElementById("hero-title")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      data-ball-dock
      data-active={passed}
      onClick={toTop}
      aria-label="Zurück nach oben"
      title="Zurück nach oben"
      className={`group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 grid size-14 place-items-center rounded-full border border-line bg-night-900/90 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.9)] backdrop-blur transition duration-500 day:border-ink/40 day:bg-cream/90 day:shadow-[0_16px_40px_-20px_rgb(11_18_38/0.5)] ease-[var(--ease-snap)] hover:-translate-y-1 hover:border-amber focus-visible:-translate-y-1 focus-visible:border-amber sm:bottom-6 sm:right-6 ${
        passed ? "visible scale-100 opacity-100" : "invisible scale-75 opacity-0"
      }`}
    >
      <VolleyballSVG spinRef={spinRef} className={`size-10 transition-opacity duration-300 ${show2D ? "opacity-100" : "opacity-0"}`} />
      <ArrowUp className={`absolute size-5 text-cream transition duration-300 day:text-ink ${away ? "opacity-100" : "translate-y-1 opacity-0"}`} />
      <span
        aria-hidden="true"
        className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-amber text-night-950 transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5"
      >
        <ArrowUp className="size-3" />
      </span>
    </button>
  );
}
