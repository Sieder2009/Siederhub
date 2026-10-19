import { useEffect, useRef } from "react";
import { useStore } from "../lib/store.js";
import { motionStore } from "../lib/motionStore.js";
import { ballSpotStore, ballStatus } from "../lib/ballBridge.js";
import { gsap, scrollToTarget } from "../lib/smoothScroll.js";
import { useHeroPassed } from "../hooks/useHeroPassed.js";
import { useScrollSpin } from "../hooks/useScrollSpin.js";
import VolleyballSVG from "./ball/VolleyballSVG.jsx";
import { ArrowUp } from "./ui/icons.jsx";

// Calls onArrive(x) once each time the 3D ball comes in to `spot`. x = viewport
// px from BallWorld's "ball:arrive", or null from the fallback timer.
function useBallArrival(spot, onArrive) {
  const cb = useRef(onArrive);
  cb.current = onArrive;
  useEffect(() => {
    let armed = false;
    let timer = 0;
    const fire = (x) => {
      if (!armed) return;
      armed = false;
      clearTimeout(timer);
      cb.current(x);
    };
    const onSpot = (s) => {
      clearTimeout(timer);
      armed = s === spot && ballStatus.get() === "ready" && motionStore.get() === "on";
      if (armed) timer = setTimeout(() => fire(null), 600); // no "ball:arrive" came: assume it is there
    };
    const onEvent = (e) => e.detail?.spot === spot && fire(e.detail.x ?? null);
    const off = ballSpotStore.subscribe(onSpot);
    window.addEventListener("ball:arrive", onEvent);
    return () => {
      off();
      clearTimeout(timer);
      window.removeEventListener("ball:arrive", onEvent);
    };
  }, [spot]);
}

// Once the hero is gone, the ball docks here and keeps turning with every
// scroll, and the dock doubles as "back to top". With 3D on, the WebGL ball
// flies in and floats over this button ([data-ball-dock] is its target) and
// the button gives way under it when it comes in; otherwise the 2D ball
// inside spins with the same scroll physics.
export default function BallDock() {
  const passed = useHeroPassed();
  const motion = useStore(motionStore);
  const status = useStore(ballStatus);
  const buttonRef = useRef(null);
  const spinRef = useRef(null);
  const catchRef = useRef(null);
  const ballAt = useStore(ballSpotStore);
  const show2D = status !== "ready";
  // the 3D ball is visiting a section spot: the dock is a plain "back to top" button meanwhile
  const away = !show2D && ballAt !== "dock";

  useScrollSpin(spinRef, passed && show2D && motion === "on");

  // the catch: the ball lands on the button and it gives a little, then
  // springs back (one of the three boxes allowed to move under the ball)
  useBallArrival("dock", () => {
    const button = buttonRef.current;
    if (!button || ballStatus.get() !== "ready" || motionStore.get() !== "on") return;
    catchRef.current?.kill();
    catchRef.current = gsap.fromTo(
      button,
      { scale: 0.94 },
      { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.45)", clearProps: "transform", onComplete: () => (catchRef.current = null) }
    );
  });

  // motion switched off mid-catch, or the dock goes away: straight to rest
  useEffect(() => {
    const settle = () => {
      catchRef.current?.progress(1).kill();
      catchRef.current = null;
    };
    const off = motionStore.subscribe((m) => m !== "on" && settle());
    return () => {
      off();
      settle();
    };
  }, []);

  const toTop = () => scrollToTarget(document.getElementById("top"));

  return (
    <button
      ref={buttonRef}
      type="button"
      data-ball-dock
      data-active={passed}
      onClick={toTop}
      aria-label="Zurück nach oben"
      title="Zurück nach oben"
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 grid size-14 place-items-center rounded-full border border-line bg-night-900 transition-[opacity,visibility,border-color] duration-(--dur-pass) ease-(--ease-toss) hover:border-court focus-visible:border-court day:border-ink-line day:bg-cream day:hover:border-court-deep day:focus-visible:border-court-deep sm:bottom-6 sm:right-6 ${
        passed ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <VolleyballSVG
        spinRef={spinRef}
        className={`size-10 transition-opacity duration-(--dur-pass) ease-(--ease-toss) ${show2D ? "opacity-100" : "opacity-0"}`}
      />
      <ArrowUp
        className={`absolute size-5 text-cream transition-opacity duration-(--dur-pass) ease-(--ease-toss) day:text-ink ${away ? "opacity-100" : "opacity-0"}`}
      />
    </button>
  );
}
