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

// The replay control waits for the first landing, so it never sits next to
// an empty spot. If no serve ever lands (slow load), it shows after this.
const REPLAY_FALLBACK = 8000;

// The ball's home in the hero. The empty [data-ball-anchor] box is what the
// 3D scene measures every frame, so the WebGL ball always sits exactly here,
// on any screen size and never under text. The stage's bottom edge is the
// floor line; the 3D scene writes --ball-shadow onto [data-ball-stage], and
// the ground shadow on the line reads it.
export default function BallStage({ className = "" }) {
  const motion = useStore(motionStore);
  const status = useStore(ballStatus);
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const [serveKey, setServeKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
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

  // First landing, the 2D ball, or the fallback timer: the replay control
  // appears (no animation) and stays revealed for the rest of the visit.
  useEffect(() => {
    if (revealed) return;
    const reveal = () => setRevealed(true);
    if (show2D) {
      reveal();
      return;
    }
    const id = setTimeout(reveal, REPLAY_FALLBACK);
    window.addEventListener("ball:land", reveal);
    return () => {
      clearTimeout(id);
      window.removeEventListener("ball:land", reveal);
    };
  }, [revealed, show2D]);

  useScrollSpin(spinRef, animated2D);

  const replay = () => {
    if (status === "ready") sendBall("serve");
    else setServeKey((k) => k + 1);
  };

  // The 2D ball touches the floor: the fall animation ends on that exact
  // frame (the squash plays on after it). Same signal the 3D scene sends.
  const landed2D = (e) => {
    if (e.animationName !== "hero-serve-fall") return;
    const r = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent("ball:land", { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
  };

  return (
    <div data-ball-stage className={`hero-stage relative ${className}`}>
      <div aria-hidden="true" className="hero-floor" />
      <div className="hero-ball relative">
        <div aria-hidden="true" key={animated2D ? serveKey : "rest"} className={`ball-shadow ${animated2D ? "hero-shadow-2d" : ""}`} />
        <div
          role="img"
          aria-label={motion === "on" ? "Volleyball, der sich beim Scrollen mitdreht" : "Volleyball"}
          className="absolute inset-x-0 top-0 aspect-square"
        >
          <div data-ball-anchor data-ball-spot="hero" className="absolute inset-[8%]" />
          {show2D && (
            <div
              key={serveKey}
              onAnimationEnd={animated2D ? landed2D : undefined}
              className={`hero-ball-2d ${animated2D ? "hero-serve-2d" : ""}`}
            >
              <div className="size-full">
                <VolleyballSVG spinRef={spinRef} className="size-full" />
              </div>
            </div>
          )}
        </div>

        {motion === "on" && (
          <button type="button" onClick={replay} className="ctl hero-replay" style={revealed ? undefined : { visibility: "hidden" }}>
            <Replay className="" />
            Aufschlag wiederholen
          </button>
        )}
      </div>
    </div>
  );
}
