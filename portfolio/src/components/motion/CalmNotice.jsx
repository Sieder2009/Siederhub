import { useState } from "react";
import { useStore } from "../../lib/store.js";
import { motionStore, setMotion } from "../../lib/motionStore.js";
import { readString, writeString } from "../../lib/storage.js";

const DISMISSED = "sieder.calm-notice";
const osReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Reduced motion is a first-class path, not an afterthought: visitors whose
// system asks for less motion get the calm page (no canvas, no pinned
// scenes) — and one short line saying why, with a way to turn the show on.
// Only shown when the OS made that choice (not after the visitor paused the
// animations here themselves), and only until it is dismissed.
export default function CalmNotice() {
  const motion = useStore(motionStore);
  const [hidden, setHidden] = useState(() => readString(DISMISSED) === "1");
  if (!osReduced || motion !== "off" || hidden || readString("sieder.motion") === "off") return null;

  const dismiss = () => {
    writeString(DISMISSED, "1");
    setHidden(true);
  };

  return (
    <aside
      aria-label="Hinweis zu Animationen"
      className="fixed bottom-4 left-4 z-40 max-w-[min(26rem,calc(100vw-6.5rem))] rounded-2xl border border-line bg-night-900/95 p-4 text-sm leading-relaxed text-mist shadow-[0_18px_40px_-20px_rgb(0_0_0/0.9)] backdrop-blur day:border-ink/30 day:bg-cream/95 day:text-ink-soft"
    >
      <p>
        <strong className="font-semibold text-cream day:text-ink">Ruhige Ansicht:</strong> Dein Gerät ist auf „Bewegung reduzieren“ gestellt, deshalb
        bleibt die Seite ohne 3D und Scroll-Effekte.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMotion("on")}
          className="rounded-full bg-amber px-3.5 py-1.5 text-xs font-semibold text-night-950 transition hover:bg-[#ffc56b] focus-visible:bg-[#ffc56b] day:bg-ink day:text-cream"
        >
          Animationen trotzdem zeigen
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-cream transition hover:border-amber hover:text-amber focus-visible:border-amber focus-visible:text-amber day:border-ink/40 day:text-ink"
        >
          Verstanden
        </button>
      </div>
    </aside>
  );
}
