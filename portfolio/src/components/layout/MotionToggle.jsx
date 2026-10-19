import { useStore } from "../../lib/store.js";
import { motionStore, toggleMotion } from "../../lib/motionStore.js";
import { keepReadingPosition } from "../../lib/smoothScroll.js";
import { Pause, Play } from "../ui/icons.jsx";

// WCAG 2.2.2 (Pause, Stop, Hide): the ball moves for longer than five
// seconds, so there has to be a visible way to stop it. A toggle with a
// constant name and aria-pressed for its state; "paused" takes exactly the
// reduced-motion path (2D ball, no 3D chunk, CSS animations off). Pinned
// scenes turn into plain ones and back, so the reader is kept in place.
export default function MotionToggle() {
  const paused = useStore(motionStore) === "off";
  return (
    <button
      type="button"
      onClick={() => keepReadingPosition(toggleMotion)}
      aria-pressed={paused}
      aria-label="Animationen pausieren"
      title={paused ? "Animationen pausiert. Klicken zum Fortsetzen." : "Animationen pausieren"}
      className="ctl"
    >
      {paused ? <Play className="" /> : <Pause className="" />}
      <span className="hidden sm:inline">Animationen</span>
    </button>
  );
}
