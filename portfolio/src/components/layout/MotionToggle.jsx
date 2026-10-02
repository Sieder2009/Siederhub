import { useStore } from "../../lib/store.js";
import { motionStore, toggleMotion } from "../../lib/motionStore.js";
import { Pause, Play } from "../ui/icons.jsx";

// WCAG 2.2.2 (Pause, Stop, Hide): the ball and the particles move for longer
// than five seconds, so there has to be a visible way to stop them. A toggle
// with a constant name and aria-pressed for its state; "paused" takes exactly
// the reduced-motion path (2D ball, no 3D chunk, CSS animations off).
export default function MotionToggle() {
  const paused = useStore(motionStore) === "off";
  return (
    <button
      type="button"
      onClick={toggleMotion}
      aria-pressed={paused}
      aria-label="Animationen pausieren"
      title={paused ? "Animationen sind pausiert — klicken zum Fortsetzen" : "Animationen pausieren"}
      className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-line px-3 text-sm font-medium text-cream transition-colors duration-200 hover:border-amber hover:text-amber aria-pressed:border-amber aria-pressed:bg-amber aria-pressed:text-night-950"
    >
      {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
      <span className="hidden sm:inline">Animationen</span>
    </button>
  );
}
