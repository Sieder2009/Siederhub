import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCinematic, useMedia } from "../../hooks/useMedia.js";
import { gsap, ScrollTrigger } from "../../lib/smoothScroll.js";

// The tally after "zählt." (viewBox 110 × 100): four slightly wobbly
// downstrokes, then the slash that closes the set.
const TALLY = [
  "M14 8 C15 38 13 66 15 94",
  "M36 10 C35 40 37 68 35 92",
  "M58 7 C59 36 57 64 59 95",
  "M80 9 C79 39 81 67 80 93",
  "M2 80 C34 64 68 40 106 18",
];
const SET = 4;

// The sticky two-column layout (Tailwind `lg`). Only there does the headline
// stay on screen while the beats pass, so only there is the tally counted live.
const STICKY_QUERY = "(min-width: 64rem)";

// settle: this change is not a stroke being written (see .tally[data-settle]
// in beats.css), so the strokes take their new state without drawing.
function Tally({ count, slash, settle }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 110 100"
      data-settle={settle ? "" : undefined}
      className="tally ml-[0.22em] inline-block h-[0.7em] w-[0.77em] overflow-visible align-baseline text-chalk"
    >
      {TALLY.map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength="1"
          strokeWidth="6"
          className="pen-stroke"
          data-drawn={(i < SET ? i < count : slash) ? "true" : undefined}
          style={{ "--dur-pen": i === SET ? "400ms" : "320ms" }}
        />
      ))}
    </svg>
  );
}

// "Jeder Satz zählt." The headline holds still (sticky) while four short
// beats scroll past beside it. A chalk tally after "zählt." counts the beats
// you have read: one stroke as each beat crosses the reading line, and the
// slash through all four as the section lets go of the headline. Strokes are
// committed, not scrubbed; scrolling back above a line wipes its stroke again.
// Only reading writes: arming the tally, a refresh, or a jump that crosses
// more than one line (reload mid-section, page turn) sets it without a hand.
// The ball waits in the empty spot under the headline.
// Calm path (phones, short screens, motion off): the tally is complete, no
// triggers, every beat at full strength.
export default function Beats({ beats }) {
  const cine = useCinematic();
  const sticky = useMedia(STICKY_QUERY);
  const live = cine && sticky;
  const [tally, setTally] = useState({ count: 0, slash: false, settle: true });
  const listRef = useRef(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!live || !list) return;
    let dead = false;
    let last = null; // the state last committed by this setup
    let queued = false;
    let quiet = false; // the queued batch includes a refresh
    const steps = [];
    let close = null;

    // Derived from the triggers, not counted up and down, so a fling, an
    // anchor jump past the section, a load below it (e.g. #werkzeug) and
    // every refresh come out right. progress > 0 = scrolled past its start.
    const apply = (instant) => {
      if (dead) return;
      const count = steps.reduce((n, st) => n + (st.progress > 0 ? 1 : 0), 0);
      const slash = !!close && close.progress > 0;
      if (last && count === last.count && slash === last.slash) return;
      const moved = last ? Math.abs(count - last.count) + (slash !== last.slash ? 1 : 0) : Infinity;
      last = { count, slash };
      setTally({ count, slash, settle: instant || moved > 1 });
    };
    // One ScrollTrigger.update fires the callbacks of every line it crossed
    // one after another: judge them together, once they have all run.
    const queue = (instant) => {
      quiet ||= instant;
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        const q = quiet;
        queued = quiet = false;
        apply(q);
      });
    };
    const read = () => queue(false);

    const ctx = gsap.context(() => {
      const on = { onEnter: read, onLeaveBack: read, onRefresh: () => queue(true) };
      Array.from(list.children)
        .slice(0, SET)
        .forEach((li) => steps.push(ScrollTrigger.create({ trigger: li, start: "top 60%", ...on })));
      // The set closes the moment the list's end reaches the bottom of the
      // screen: the last frame the headline is still held, so the slash is
      // drawn where you can see it, before the section moves on.
      close = ScrollTrigger.create({ trigger: list, start: "bottom bottom", ...on });
    }, list);
    // Arming always lands without a hand, even if nothing changed: the
    // render that switched to live may already have started a transition
    // from a stale state, and only data-settle cancels it.
    apply(true);
    return () => {
      dead = true;
      ctx.revert();
    };
  }, [live]);

  // Hand the strokes back to the pen once the settled state has been painted.
  useEffect(() => {
    if (!tally.settle) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setTally((t) => (t.settle ? { ...t, settle: false } : t)));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [tally]);

  return (
    <section id="warum" aria-labelledby="warum-title" className="relative">
      <div className="page grid grid-cols-12 gap-x-[var(--gutter)] gap-y-10 py-24 lg:py-0">
        <div className="col-span-12 lg:sticky lg:top-0 lg:col-span-6 lg:flex lg:h-svh lg:flex-col lg:justify-center lg:self-start">
          <h2 id="warum-title" tabIndex={-1} data-anchor-focus className="font-display text-h2 text-cream focus:outline-none">
            Jeder Satz
            <br />
            <span className="whitespace-nowrap">
              zählt.
              <Tally count={live ? tally.count : SET} slash={live ? tally.slash : true} settle={live && tally.settle} />
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-lead text-mist">Jeder Commit auch.</p>
          <div data-ball-spot="beats" aria-hidden="true" className="mt-10 hidden aspect-square w-[min(14rem,22svh)] lg:block" />
        </div>

        <ol ref={listRef} className="col-span-12 lg:col-span-5 lg:col-start-8 lg:py-[18svh]">
          {beats.map((beat) => (
            <li
              key={beat.id}
              className="flex flex-col justify-center border-t border-night-700 py-10 first:border-t-0 lg:min-h-[46svh] lg:border-t-0 lg:py-0"
            >
              <h3 className="font-display text-h3 text-cream">{beat.title}</h3>
              <p className="mt-4 max-w-lg text-body text-mist">{beat.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
