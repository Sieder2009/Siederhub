import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../../lib/store.js";
import { ballSpotStore, ballStatus, sendBall } from "../../lib/ballBridge.js";
import { actOverride } from "../../lib/sectionStore.js";
import { useCinematic } from "../../hooks/useMedia.js";
import { gsap, ScrollTrigger } from "../../lib/smoothScroll.js";
import { BALL_SVG } from "../ball/volleyballSvgData.js";
import VolleyballSVG from "../ball/VolleyballSVG.jsx";

// "Angriff": the turn of the page. The ball is set in an arc across the
// screen, hangs at the top, and is spiked straight at you until it covers the
// screen. At CUT, in one frame, the ball goes, the stage underneath is cream
// and the act turns to day; a print of the ball's seams thuds onto the cream
// and fades as Werkzeug comes in. Every position is a pure function of scroll
// progress (one paused timeline seeked by one ScrollTrigger), so any jump
// lands on the same frame. Purely visual: hidden from screen readers.
// Calm path: a hard night-to-cream horizon with the ball resting on it.

// Scroll progress at which the spiked ball covers the screen.
const CUT = 0.84;
// The hitter's contact, inside the hang.
const HIT = 0.31;
// Scrolled back into the set: the next pass may hit again.
const REARM = 0.2;

// Phases on the 0 … 1 timeline (see the task table).
const SET = 0.28;
const HANG = 0.06;
const SPIKE = CUT - SET - HANG;

// x / y in viewport fractions, relative to the stage centre.
const X0 = -0.22;
const X1 = 0.16;
const Y0 = 0.3;
const Y1 = -0.26;
const Y_APEX = -0.27;
const Y_HIT = 0.04;

// The spot is 22svh wide; at the cut the ball must reach past every corner.
// The 3D ball follows a tight spot's size with a short lag (BallWorld damps
// its radius), and a power4.in growth outruns any lag at the very end. So
// the box overshoots: 2.5 diagonals wide at the cut, which keeps the lagging
// 3D ball over every corner in the cut frame at normal wheel and trackpad
// speeds (simulated at 960×700 to 1920×1080). A hard fling can still
// outrun it for a frame or two.
const SPOT_VH = 0.22;
const COVER = 2.5;
const PRINT = 1.1;

// Scrolling back up through the cut is the same switch in reverse: the 3D
// ball needs about 0.15 s to fade back in (BallWorld damps its opacity), so
// the cream, the print and the day header wait for it underneath. Below
// UNCOVER the box no longer covers the screen, and they go at once.
const UNCUT_WAIT = 0.18;
const UNCOVER = 0.78;

// Calm path with the 3D ball (a phone with motion on): the ball only comes
// to the line while this section is the current one. True from the moment
// it arrives (BallWorld's "ball:arrive", or 600 ms after it was sent here)
// until it is sent elsewhere, so the shadow never lies on the cream alone.
function useBallResting(spot, enabled) {
  const [resting, setResting] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = 0;
    const land = () => {
      clearTimeout(timer);
      setResting(ballSpotStore.get() === spot);
    };
    const onSpot = (s) => {
      clearTimeout(timer);
      if (s === spot) timer = setTimeout(land, 600); // no "ball:arrive" came: assume it is there
      else setResting(false);
    };
    const onArrive = (e) => e.detail?.spot === spot && land();
    setResting(ballSpotStore.get() === spot); // already here (e.g. motion switched back on)
    const off = ballSpotStore.subscribe(onSpot);
    window.addEventListener("ball:arrive", onArrive);
    return () => {
      off();
      clearTimeout(timer);
      window.removeEventListener("ball:arrive", onArrive);
    };
  }, [spot, enabled]);
  return enabled && resting;
}

export default function Dive() {
  const cine = useCinematic();
  const show2D = useStore(ballStatus) !== "ready";
  const resting = useBallResting("dive", !cine && !show2D);
  const runwayRef = useRef(null);
  const creamRef = useRef(null);
  const fadeRef = useRef(null);
  const imprintRef = useRef(null);
  const spotRef = useRef(null);

  useLayoutEffect(() => {
    const runway = runwayRef.current;
    const spot = spotRef.current;
    const cream = creamRef.current;
    const fade = fadeRef.current;
    const imprint = imprintRef.current;
    if (!cine || !runway || !spot || !cream || !fade || !imprint) return;

    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    let sEnd = 1;
    // sizes that only change with the viewport: measured on refresh, never per frame
    const measure = () => {
      const diag = Math.hypot(vw(), vh());
      sEnd = (COVER * diag) / (SPOT_VH * vh());
      gsap.set(imprint, { width: PRINT * diag });
    };

    let fired = false; // the hit of this pass was sent
    let cut = null; // last applied cut state (null: nothing applied yet)
    let live = false; // false while the trigger is being created
    let uncut = null; // the night waiting for the ball to fade back in

    const ctx = gsap.context(() => {
      measure();
      gsap.set(spot, { xPercent: -50, yPercent: -50, transformOrigin: "50% 50%" });
      gsap.set(imprint, { xPercent: -50, yPercent: -50, transformOrigin: "50% 50%" });

      // The flight, as a function of progress. fromTo everywhere, so a seek
      // in any direction renders the same frame; function values pick up the
      // new viewport after tl.invalidate().
      const late = { immediateRender: false };
      const tl = gsap.timeline({ paused: true });
      // set: constant sideways speed under a decelerating rise (a true parabola)
      tl.fromTo(spot, { x: () => X0 * vw() }, { x: () => X1 * vw(), duration: SET, ease: "none" }, 0)
        .fromTo(spot, { y: () => Y0 * vh() }, { y: () => Y1 * vh(), duration: SET, ease: "power2.out" }, 0)
        .fromTo(spot, { scale: 0.8 }, { scale: 0.6, duration: SET, ease: "power1.out" }, 0)
        // hang: the ball holds its place and floats up the last bit to its apex
        .fromTo(spot, { y: () => Y1 * vh() }, { y: () => Y_APEX * vh(), duration: HANG, ease: "sine.inOut", ...late }, SET)
        // spike: straight at the viewer, accelerating until it covers the screen
        .fromTo(spot, { x: () => X1 * vw() }, { x: 0, duration: SPIKE, ease: "power2.in", ...late }, SET + HANG)
        .fromTo(spot, { y: () => Y_APEX * vh() }, { y: () => Y_HIT * vh(), duration: SPIKE, ease: "power2.in", ...late }, SET + HANG)
        .fromTo(spot, { scale: 0.6 }, { scale: () => sEnd, duration: SPIKE, ease: "power4.in", ...late }, SET + HANG)
        // hold until the end of the runway
        .set({}, {}, 1);

      // The print thuds onto the cream: a slight overshoot in scale and a
      // short damped shake of the print alone.
      const impact = gsap
        .timeline({ paused: true })
        .fromTo(imprint, { scale: 1.04 }, { scale: 1, duration: 0.22, ease: "power2.out" }, 0)
        .to(imprint, { keyframes: { x: [8, -6, 4, -2, 0], easeEach: "sine.inOut" }, duration: 0.15 }, 0);

      // The 2D ball (no WebGL) gets the contact as a squash of its drawing.
      const squash = () => {
        const svg = spot.querySelector("svg");
        if (!svg) return;
        ctx.add(() =>
          gsap.fromTo(
            svg,
            { scaleX: 1.12, scaleY: 0.9, transformOrigin: "50% 50%" },
            { scaleX: 1, scaleY: 1, duration: 0.3, ease: "elastic.out(1, 0.4)", overwrite: true }
          )
        );
      };

      // what lies under the ball: the cream with the print, and the day header
      const showDay = (on) => {
        cream.style.opacity = on ? "1" : "0";
        imprint.style.visibility = on ? "visible" : "hidden";
        actOverride.set(on ? "day" : null);
      };
      const toNight = () => {
        uncut?.kill();
        uncut = null;
        impact.pause(0);
        showDay(false);
      };

      // night ↔ day under a ball that covers the screen. Forward it is one
      // frame; `thud` plays the print's impact, otherwise the print appears
      // at rest (refresh, jumps, scrolling back down). Back up, the ball is
      // given back at once and the night follows once it is there; `now`
      // skips that wait (refresh, or the box no longer covers the screen).
      const setCut = (isCut, thud, now) => {
        if (isCut === cut) return;
        cut = isCut;
        const v = isCut ? "0" : "1";
        spot.dataset.ballOpacity = v;
        spot.style.opacity = v;
        if (isCut) {
          if (uncut) {
            // back down before the night came: the print never left
            uncut.kill();
            uncut = null;
            return;
          }
          showDay(true);
          if (thud) impact.restart();
          else impact.progress(1);
        } else if (now || ballStatus.get() !== "ready") {
          toNight(); // (the 2D ball is back in the same frame: nothing to wait for)
        } else {
          uncut = gsap.delayedCall(UNCUT_WAIT, toNight);
        }
      };

      // Seek the flight after the viewport changed: invalidate re-reads the
      // function values, and two seeks force a render even if p is unchanged.
      const reseek = (p) => {
        tl.invalidate();
        tl.progress(p === 1 ? 0 : 1, true).progress(p, true);
      };

      // layout changed (creation, fonts, resize, motion toggle): land on the
      // current frame silently, with no hit and no thud
      const settle = (self) => {
        const p = self.progress;
        measure();
        reseek(p);
        fired = p >= HIT;
        setCut(p >= CUT, false, true);
        if (uncut) toNight();
      };

      const flight = ScrollTrigger.create({
        trigger: runway,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          tl.progress(p);
          if (p < REARM) fired = false;
          const quiet = !live || ScrollTrigger.isRefreshing;
          // contact: only while the ball is in play on the pinned stage
          if (!quiet && !fired && p >= HIT && p < CUT && self.direction === 1 && self.isActive) {
            fired = true;
            sendBall("spike");
            squash();
          }
          const isCut = p >= CUT;
          // the thud needs a real forward crossing; a jump past the runway lands at p = 1
          setCut(isCut, isCut && cut === false && !quiet && self.direction === 1 && self.isActive && p < 1, quiet || p < UNCOVER);
          if (uncut && p < UNCOVER) toNight();
        },
        onRefresh: settle,
        onLeave: () => actOverride.set("day"), // below the dive it is day for good
        onLeaveBack: () => {
          fired = false;
          actOverride.set(null);
        },
      });
      settle(flight);
      live = true;

      // The print stays in the cream as an afterimage while the stage scrolls
      // away, and is gone by the time Werkzeug fills the screen.
      ScrollTrigger.create({
        trigger: runway,
        start: "bottom bottom",
        end: "bottom 40%",
        scrub: true,
        animation: gsap.fromTo(fade, { opacity: 1 }, { opacity: 0, ease: "none" }),
      });
    }, runway);

    return () => {
      uncut?.kill();
      ctx.revert();
      actOverride.set(null);
      delete spot.dataset.ballOpacity;
      spot.style.removeProperty("opacity");
      cream.style.removeProperty("opacity");
      imprint.style.visibility = "hidden";
    };
  }, [cine]);

  if (!cine) {
    // The ball rests on the line; its shadow falls on the cream just below it.
    return (
      <div
        id="angriff"
        aria-hidden="true"
        className="relative h-[34svh] bg-[linear-gradient(to_bottom,transparent_60%,var(--color-cream)_60%)]"
      >
        <div className="absolute inset-x-0 top-[60%] -mt-px h-[3px] bg-chalk" />
        <div className="page relative h-full">
          {/* the drawing leaves ~1.5px under the ball's outline: sink the box into the line by 1px */}
          <div className="absolute bottom-[calc(40%-1px)] left-[calc(var(--gutter)+6%)] w-24">
            <div data-ball-spot="dive" className="aspect-square w-full">
              {show2D && <VolleyballSVG className="size-full" />}
            </div>
          </div>
          <div
            className="dive-shadow absolute top-[calc(60%+3px)] left-[calc(var(--gutter)+6%+1rem)] h-2 w-16 rounded-[50%] bg-ink/12"
            data-away={show2D || resting ? undefined : "true"}
          />
        </div>
      </div>
    );
  }

  return (
    <div id="angriff" ref={runwayRef} aria-hidden="true" className="relative h-[180svh]">
      <div className="sticky top-0 h-svh overflow-clip">
        <div className="absolute inset-x-0 top-[60%] h-[2px] bg-chalk/70" />
        <div ref={creamRef} className="absolute inset-0 bg-cream opacity-0" />
        <div ref={fadeRef} className="pointer-events-none absolute inset-0">
          <div ref={imprintRef} className="absolute left-1/2 top-[calc(50%+4svh)] aspect-square" style={{ visibility: "hidden" }}>
            <svg viewBox="0 0 200 200" className="size-full overflow-visible" focusable="false">
              <path
                d={BALL_SVG.seams}
                fill="none"
                stroke="var(--color-ink)"
                strokeOpacity="0.14"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
        <div ref={spotRef} data-ball-spot="dive" data-ball-tight="true" className="absolute left-1/2 top-1/2 aspect-square w-[22svh]">
          {show2D && <VolleyballSVG className="size-full" />}
        </div>
      </div>
    </div>
  );
}
