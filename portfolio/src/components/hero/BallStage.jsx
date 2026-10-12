import { useEffect, useRef, useState } from "react";
import { useStore } from "../../lib/store.js";
import { motionStore } from "../../lib/motionStore.js";
import { ballPlaceholder, ballStatus, sendBall } from "../../lib/ballBridge.js";
import { useScrollSpin } from "../../hooks/useScrollSpin.js";
import VolleyballSVG from "../ball/VolleyballSVG.jsx";
import { Replay } from "../ui/icons.jsx";

// How long the spot may stay empty once the 3D chunk is actually loading
// before the 2D ball steps in. Generous on purpose: a mid-range phone needs a
// few seconds to fetch, parse and compile three.js, and the 2D placeholder
// would cost those visitors the serve. Only genuinely slow loads get it.
const PLACEHOLDER_DELAY = 6000;

// The ball's home in the hero. The empty [data-ball-anchor] box is what the
// 3D scene measures every frame, so the WebGL ball always sits exactly here —
// on any screen size, and never under text.
export default function BallStage({ className = "aspect-square w-[min(66vw,19rem)]" }) {
  const motion = useStore(motionStore);
  const status = useStore(ballStatus);
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const [serveKey, setServeKey] = useState(0);
  const spinRef = useRef(null);

  useEffect(() => {
    if (status !== "loading") return;
    const id = setTimeout(() => setWaitedTooLong(true), PLACEHOLDER_DELAY);
    return () => clearTimeout(id);
  }, [status]);

  const show2D = status === "off" || status === "failed" || (status === "loading" && waitedTooLong);
  const animated2D = show2D && motion === "on";

  // Once the 2D ball has been on screen, a 3D ball arriving later fades in on
  // the spot instead of serving in next to it.
  useEffect(() => {
    if (show2D) ballPlaceholder.shown = true;
  }, [show2D]);

  useScrollSpin(spinRef, animated2D);

  const replay = () => {
    if (status === "ready") sendBall("serve");
    else setServeKey((k) => k + 1);
  };

  // the 2D serve has landed: same signal the 3D scene sends (Hero jolts the wordmark)
  const landed2D = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent("ball:land", { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
  };

  return (
    <div className={`relative ${className}`}>
      <div
        role="img"
        aria-label={motion === "on" ? "Volleyball, der sich beim Scrollen mitdreht" : "Volleyball"}
        className="absolute inset-0"
      >
        {/* spotlight + court-circle decoration */}
        <div aria-hidden="true" className="absolute -inset-[18%] rounded-full bg-[radial-gradient(closest-side,rgb(255_179_71/0.14),rgb(127_156_255/0.05)_55%,transparent)]" />
        <div aria-hidden="true" className="absolute inset-[1%] rounded-full border border-dashed border-night-700" />
        <div aria-hidden="true" className="absolute -inset-[9%] rounded-full border border-night-700/60" />

        <div data-ball-anchor data-ball-spot="hero" className="absolute inset-[8%]" />
        <div aria-hidden="true" className="ball-shadow absolute bottom-[1%] left-1/2 h-[7%] w-[60%] rounded-[50%]" />

        {show2D && (
          <div
            key={serveKey}
            onAnimationEnd={animated2D ? landed2D : undefined}
            className={`absolute inset-[8%] ${animated2D ? "motion-on:animate-serve-2d" : ""}`}
          >
            <VolleyballSVG spinRef={spinRef} className="size-full drop-shadow-[0_24px_40px_rgb(0_0_0/0.45)]" />
          </div>
        )}
      </div>

      {motion === "on" && (
        <button
          type="button"
          onClick={replay}
          className="group absolute -bottom-6 left-1/2 inline-flex h-10 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-night-900/85 px-4 text-xs font-semibold text-mist backdrop-blur transition duration-300 hover:border-amber hover:text-amber focus-visible:border-amber focus-visible:text-amber sm:-bottom-4"
        >
          <Replay className="size-3.5 transition-transform duration-500 group-hover:-rotate-[300deg] group-focus-visible:-rotate-[300deg]" />
          Aufschlag wiederholen
        </button>
      )}
    </div>
  );
}
