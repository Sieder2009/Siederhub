import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Flip } from "gsap/Flip";
import { useStore } from "../../lib/store.js";
import { filterStore, setFilter } from "../../lib/filterStore.js";
import { focusOf, interestStore, recordInterest, resetInterests } from "../../lib/interestStore.js";
import { ballSpotStore, ballStatus } from "../../lib/ballBridge.js";
import { motionStore } from "../../lib/motionStore.js";
import { useCinematic } from "../../hooks/useMedia.js";
import { gsap, ScrollTrigger, scrollToY } from "../../lib/smoothScroll.js";
import { rowTravel, runwayHeight, scrollForCard, travelAt } from "../../lib/rally.js";
import github from "../../data/github.json";
import ProjectFilter from "../projects/ProjectFilter.jsx";
import VolleyballSVG from "../ball/VolleyballSVG.jsx";
import { GitHub } from "../ui/icons.jsx";
import RallyCard from "./RallyCard.jsx";

gsap.registerPlugin(Flip);

const plural = (n) => (n === 1 ? "Projekt" : "Projekte");
const repoCount = Object.keys(github.repos || {}).length;
const shows = (project, filter) => filter === "all" || project.tags.includes(filter);
const ITEMS = "[data-rally-item]:not([hidden])";

// Pinned cards never get narrower than this; below it the text only grows.
const MIN_W = 300;
// How the pinned cards make room on a short stage, mildest first: detail and
// purpose clamp to two lines (compact 1), the stat drops to title size
// (compact 2), then the photos get flatter (ratio, 16:10 = 1.6).
const LEVELS = [
  { compact: null, ratio: 1.6 },
  { compact: "1", ratio: 1.6 },
  { compact: "2", ratio: 1.6 },
  { compact: "2", ratio: 1.8 },
  { compact: "2", ratio: 2 },
  { compact: "2", ratio: 2.2 },
  { compact: "2", ratio: 2.4 },
];

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

// "Ball im Spiel": the projects as one pinned row. The stage sticks while
// the row slides left in step with the scroll (one px down = one px left),
// ending on the GitHub mark, where the ball comes to sit and the mark gives
// under it. Filter and personal order (from what this visitor clicked) stay.
// Every card stays mounted; a filter only hides some. A filter change drops
// the leaving cards, lets the rest glide to their new places (Flip) and
// fades the new ones in, while the row keeps its offset, so the stage never
// unpins under the visitor's hand. Keyboard focus on a card that is off
// stage scrolls it into view. Calm path (phones, short screens, motion off):
// the same cards as a plain grid, nothing pinned.
export default function Rally({ projects, tags, githubUser }) {
  const cine = useCinematic();
  const filter = useStore(filterStore);
  const show2D = useStore(ballStatus) !== "ready";
  // personal order is decided once, on arrival: re-sorting while someone is
  // clicking around would be disorienting
  const [focusTag, setFocusTag] = useState(() => focusOf(interestStore.get()));
  const [announcement, setAnnouncement] = useState("");
  const sectionRef = useRef(null);
  const runwayRef = useRef(null);
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const headingRef = useRef(null);
  const markRef = useRef(null);
  const geo = useRef({ travel: 0, top: 0, x: 0 });
  const firstRender = useRef(true);
  const cineRef = useRef(cine);
  cineRef.current = cine;
  // the pinned row's trigger and its place(scroll), for re-anchoring after a filter change
  const triggerRef = useRef(null);
  const placeRef = useRef(null);
  // the filter change in flight (the leave tween, then the glide) and the
  // Flip state captured just before the new filter rendered
  const runningRef = useRef(null);
  const pendingFlip = useRef(null);
  const shownFilter = useRef(filter);
  const catchRef = useRef(null);
  // every event-driven tween of this section lives here, reverted on unmount
  const ctxRef = useRef(null);

  const options = useMemo(
    () => [
      { id: "all", label: "Alle", count: projects.length },
      ...Object.entries(tags).map(([id, label]) => ({ id, label, count: projects.filter((p) => p.tags.includes(id)).length })),
    ],
    [projects, tags]
  );

  const ordered = useMemo(() => {
    if (!focusTag) return projects;
    return [...projects.filter((p) => p.tags.includes(focusTag)), ...projects.filter((p) => !p.tags.includes(focusTag))];
  }, [projects, focusTag]);

  // screen readers hear the result count, also when the hero's stack links set the filter
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const n = filter === "all" ? projects.length : projects.filter((p) => p.tags.includes(filter)).length;
    setAnnouncement(`${n} ${plural(n)}${filter === "all" ? "" : ` mit ${tags[filter]}`} angezeigt`);
  }, [filter, projects, tags]);

  // Jump a filter change in flight to its end: a leave tween commits (which
  // starts its glide), the glide lands. A loop, because finishing the first
  // starts the second. quiet: outside a click (motion switched off, layout
  // torn down) a leave just switches the filter, with no glide and no
  // synchronous render.
  const drain = (quiet = false) => {
    for (let i = 0; i < 4 && runningRef.current; i++) {
      const anim = runningRef.current;
      if (quiet && anim.data?.leaving) {
        runningRef.current = null;
        anim.kill();
        gsap.set(anim.data.leaving, { clearProps: "opacity,visibility,transform" });
        setFilter(anim.data.next);
        continue;
      }
      anim.progress(1);
      if (runningRef.current === anim) runningRef.current = null;
    }
  };

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {}, sectionRef);
    ctxRef.current = ctx;
    // switching motion off mid-change lands it at once; a catch snaps back
    const off = motionStore.subscribe((value) => {
      if (value === "on") return;
      drain(true);
      catchRef.current?.progress(1).kill();
      catchRef.current = null;
    });
    return () => {
      off();
      runningRef.current = null;
      pendingFlip.current = null;
      catchRef.current = null;
      ctxRef.current = null;
      ctx.revert();
    };
  }, []);

  // ------------------------------------------------ pinned row (cinematic)
  useLayoutEffect(() => {
    const runway = runwayRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!cine || !runway || !stage || !track) return;

    const place = (scroll) => {
      const { travel, top } = geo.current;
      const x = travelAt(scroll, top, travel);
      geo.current.x = x;
      track.style.transform = `translate3d(${-x}px,0,0)`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${travel ? (x / travel).toFixed(4) : 0})`;
    };
    // Cards are sized by the screen's height as well as its width: the
    // widest card (at least MIN_W) whose photo plus text (which wraps less
    // the wider the card gets) still fits the stage, so a short laptop
    // screen still shows every link. Where no width fits, the cards compact
    // step by step (LEVELS) until one does. Cards the filter hides are
    // measured too, so the size holds through a filter change and the glide
    // only moves cards; the result is kept until the screen, the stage or
    // the fonts change. Only runs on refresh, never per frame.
    let sized = null;
    const sizeCards = () => {
      const free = track.parentElement.clientHeight - 12;
      const key = `${window.innerWidth}|${free}|${document.fonts?.status}`;
      const apply = ({ level, w }) => {
        if (level.compact) track.dataset.compact = level.compact;
        else delete track.dataset.compact;
        track.style.setProperty("--media-ratio", String(level.ratio));
        track.style.setProperty("--card-w", `${w}px`);
      };
      if (sized?.key === key) return apply(sized);
      const hidden = [...track.querySelectorAll(":scope > [hidden]")];
      hidden.forEach((li) => (li.hidden = false));
      const cards = track.querySelectorAll(".rally-card");
      const widest = Math.max(MIN_W, Math.round(Math.min(window.innerWidth * 0.34, 736)));
      let best = null;
      search: for (const level of LEVELS) {
        for (let w = widest; w >= MIN_W; w -= 16) {
          apply({ level, w });
          let tallest = 0;
          cards.forEach((el) => (tallest = Math.max(tallest, el.offsetHeight)));
          const over = tallest - free;
          if (!best || over < best.over) best = { level, w, over };
          if (over <= 0) break search;
        }
      }
      sized = { ...best, key };
      apply(sized);
      hidden.forEach((li) => (li.hidden = true));
    };
    const measure = () => {
      track.style.transform = "";
      sizeCards();
      const travel = rowTravel(track.scrollWidth, stage.clientWidth);
      geo.current.travel = travel;
      runway.style.height = `${runwayHeight(window.innerHeight, travel)}px`;
    };

    const ctx = gsap.context(() => {
      triggerRef.current = ScrollTrigger.create({
        trigger: runway,
        start: "top top",
        end: "bottom bottom",
        onRefreshInit: measure,
        onRefresh: (self) => {
          geo.current.top = self.start;
          place(self.scroll());
        },
        onUpdate: (self) => place(self.scroll()),
      });
    }, runway);
    placeRef.current = place;
    measure();
    ScrollTrigger.refresh();

    return () => {
      // a glide in flight would keep its transforms on the plain grid
      drain(true);
      ctx.revert();
      triggerRef.current = null;
      placeRef.current = null;
      runway.style.height = "";
      track.style.transform = "";
      track.style.removeProperty("--card-w");
      track.style.removeProperty("--media-ratio");
      delete track.dataset.compact;
      ScrollTrigger.refresh();
    };
  }, [cine]);

  // A filter change makes the row shorter or longer: re-measure. A change
  // made here (choose) left a Flip state: the row first goes back to the
  // offset it had, then the cards glide from where they were. A filter set
  // from outside (the hero's stack links) only re-measures.
  useLayoutEffect(() => {
    const changed = shownFilter.current !== filter;
    shownFilter.current = filter;
    const pending = pendingFlip.current;
    pendingFlip.current = null;
    if (cine && changed) ScrollTrigger.refresh();
    const track = trackRef.current;
    if (!pending || !track || !ctxRef.current || motionStore.get() !== "on") return;

    // normally scrollAhead already put the scroll here; this only catches a miss
    if (cine && pending.old != null && placeRef.current) {
      const { top, travel } = geo.current;
      const y = top + Math.min(pending.old, travel);
      if (Math.abs(y - window.scrollY) >= 1) scrollToY(y, { immediate: true });
      placeRef.current(y);
    }
    const targets = [...track.querySelectorAll(ITEMS)];
    ctxRef.current.add(() => {
      const glide = Flip.from(pending.state, {
        targets,
        duration: 0.45,
        ease: "power2.inOut",
        scale: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" }),
        onComplete: () => {
          if (runningRef.current === glide) runningRef.current = null;
        },
      });
      runningRef.current = glide;
    });
  }, [cine, filter]);

  // keyboard focus on a card that is off stage: bring it into view
  const onFocusIn = (e) => {
    if (!cine) return;
    const item = e.target.closest?.("[data-rally-item]");
    const stage = stageRef.current;
    if (!item || !stage) return;
    requestAnimationFrame(() => {
      const { travel, top } = geo.current;
      const y = scrollForCard({
        cardLeft: item.offsetLeft,
        cardWidth: item.offsetWidth,
        stageWidth: stage.clientWidth,
        offset: travelAt(window.scrollY, top, travel),
        travel,
        runwayTop: top,
      });
      if (y !== null) scrollToY(y, { immediate: true });
    });
  };

  // Flip measures in page coordinates, and the stage is sticky: a scroll
  // jump between its two measurements reads as the cards moving up. So when
  // the new row will be shorter than the current offset, the scroll goes to
  // its new place first (the same offset, clamped to the new travel, still
  // inside today's longer runway) while the row is held where the visitor
  // sees it. Both measurements then share one scroll position. The new
  // travel is read by showing the next set for one synchronous layout; card
  // widths hold through a filter change (sizeCards).
  const scrollAhead = (old, next) => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage || !placeRef.current) return;
    const cards = [...track.querySelectorAll(":scope > [data-id]")];
    const was = cards.map((li) => li.hidden);
    cards.forEach((li) => (li.hidden = !shows(projects.find((p) => p.id === li.dataset.id), next)));
    const travel = rowTravel(track.scrollWidth, stage.clientWidth);
    cards.forEach((li, i) => (li.hidden = was[i]));
    const y = geo.current.top + Math.min(old, travel);
    if (Math.abs(y - window.scrollY) < 1) return;
    scrollToY(y, { immediate: true });
    placeRef.current(geo.current.top + old);
  };

  // Toggle semantics (aria-pressed): pressing the active filter again
  // releases it. Leaving cards drop out (gravity, 30 ms apart); then the new
  // filter renders in one synchronous pass and the layout effect above
  // glides everything else. Focus stays on the pressed button throughout.
  const choose = (tag) => {
    drain();
    const current = filterStore.get();
    const next = tag === current && tag !== "all" ? "all" : tag;
    if (next !== "all") recordInterest([next], 1);
    if (next === current) return;
    const track = trackRef.current;
    if (motionStore.get() !== "on" || !track || !ctxRef.current) {
      setFilter(next);
      return;
    }
    const items = [...track.querySelectorAll(ITEMS)];
    const leaving = items
      .filter((li) => {
        const project = li.dataset.id && projects.find((p) => p.id === li.dataset.id);
        return project && !shows(project, next);
      })
      .map((li) => li.firstElementChild);

    let leave = null;
    const commit = () => {
      if (leave && runningRef.current === leave) runningRef.current = null;
      // the row's offset at this moment, if the visitor is inside the pinned run
      const old = cineRef.current && triggerRef.current?.isActive ? geo.current.x : null;
      if (old != null) scrollAhead(old, next);
      pendingFlip.current = { state: Flip.getState(items), old };
      flushSync(() => setFilter(next));
      if (leaving.length) gsap.set(leaving, { clearProps: "opacity,visibility,transform" });
    };
    if (!leaving.length) return commit();
    leave = ctxRef.current.add(() =>
      gsap.to(leaving, { autoAlpha: 0, y: 14, duration: 0.22, ease: "power2.in", stagger: 0.03, data: { leaving, next }, onComplete: commit })
    );
    runningRef.current = leave;
  };

  const reset = () => {
    resetInterests();
    setFocusTag(null);
    headingRef.current?.focus();
  };

  // The ball lands on the mark: it gives under the contact (down, a little
  // wider) and springs back. Only with the 3D ball, motion on and the pinned
  // row; the ball spot sits inside the mark, so the ball sinks with it.
  useBallArrival("github", () => {
    const mark = markRef.current;
    if (!mark || !cineRef.current || !ctxRef.current || motionStore.get() !== "on") return;
    catchRef.current?.kill();
    catchRef.current = ctxRef.current.add(() =>
      gsap
        .timeline({
          onComplete: () => {
            gsap.set(mark, { clearProps: "transform" });
            catchRef.current = null;
          },
        })
        .set(mark, { transformOrigin: "50% 100%" })
        .to(mark, { y: 6, scaleY: 0.96, scaleX: 1.02, duration: 0.1, ease: "power2.in" })
        .to(mark, { y: 0, scaleX: 1, scaleY: 1, duration: 0.8, ease: "elastic.out(1, 0.45)" })
    );
  });

  return (
    <section ref={sectionRef} id="projekte" aria-labelledby="projekte-title" className="relative">
      <div ref={runwayRef} className={cine ? "relative" : ""}>
        <div
          ref={stageRef}
          className={cine ? "rally-stage sticky top-0 flex h-svh flex-col overflow-x-clip pb-5 pt-[4.75rem]" : "py-[calc(var(--space-section)*0.8)]"}
        >
          <header className="page grid grid-cols-12 items-end gap-x-[var(--gutter)] gap-y-4">
            <h2
              id="projekte-title"
              ref={headingRef}
              tabIndex={-1}
              data-anchor-focus
              className="col-span-12 whitespace-nowrap font-display text-h2-stage text-cream focus:outline-none lg:col-span-5"
            >
              Ball im Spiel
            </h2>
            {/* starts one column early (col 6 stays empty next to the h2) so the
                strip keeps to one line down to about 1280 px */}
            <div className="col-span-12 lg:col-span-7 lg:col-start-6 lg:justify-self-end">
              <ProjectFilter options={options} value={filter} onChange={choose} />
              {focusTag && (
                <p className="label mt-3">
                  Sortiert nach deinen Klicks: <strong className="font-semibold text-cream">{tags[focusTag]}</strong> zuerst. Das speichert nur dein
                  Browser.{" "}
                  <button type="button" className="ctl ml-2" onClick={reset}>
                    Zurücksetzen
                  </button>
                </p>
              )}
            </div>
          </header>
          <p role="status" className="sr-only">
            {announcement}
          </p>

          <div className={cine ? "relative mt-6 min-h-0 flex-1" : "page mt-12"}>
            <ul
              ref={trackRef}
              onFocus={onFocusIn}
              className={
                cine
                  ? "rally-track group/track relative flex h-full w-max items-start gap-[clamp(1.5rem,2.6vw,3rem)] will-change-transform"
                  : "grid gap-14 md:grid-cols-2 md:gap-x-8"
              }
            >
              {ordered.map((project) => (
                <li
                  key={project.id}
                  data-rally-item
                  data-id={project.id}
                  data-wide={project.highlight || undefined}
                  hidden={!shows(project, filter)}
                  className={`rally-item ${project.highlight ? "md:col-span-2" : ""}`}
                >
                  <RallyCard
                    project={project}
                    forYou={!!focusTag && project.tags.includes(focusTag)}
                    onVisit={() => recordInterest(project.tags, 2)}
                  />
                </li>
              ))}

              <li data-rally-item className="rally-end flex items-center self-stretch md:col-span-2">
                <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:gap-10">
                  <a
                    ref={markRef}
                    href={`https://github.com/${githubUser}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative mt-[7rem] grid aspect-square w-[min(11.5rem,24svh)] shrink-0 place-items-center rounded-full bg-cream text-night-950 hover:outline-2 hover:outline-offset-4 hover:outline-court focus-visible:outline-offset-4 focus-visible:outline-court sm:mt-[6rem]"
                  >
                    <GitHub className="size-[62%]" />
                    <span className="sr-only">Alle Projekte auf GitHub (öffnet in neuem Tab)</span>
                    {/* the ball comes to sit right on top of the mark */}
                    <span data-ball-spot="github" aria-hidden="true" className="absolute bottom-[90%] left-1/2 aspect-square w-[44%] -translate-x-1/2">
                      {show2D && <VolleyballSVG className="size-full" />}
                    </span>
                  </a>
                  <div className="max-w-xs">
                    <p className="font-display text-[clamp(1.75rem,2.6vw,2.75rem)] font-light leading-tight text-cream" aria-hidden="true">
                      Der Rest liegt auf GitHub.
                    </p>
                    <p className="mt-4 font-mono text-small text-mist">
                      github.com/<span className="text-cream">{githubUser}</span>
                    </p>
                    {repoCount > 0 && (
                      <p className="mt-3 text-small text-mist">{repoCount} öffentliche Repositories, auch die ohne eigene Karte hier.</p>
                    )}
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {cine && (
            <div aria-hidden="true" className="page mt-4">
              <div className="h-px w-full bg-night-700">
                <div ref={barRef} className="h-px w-full origin-left scale-x-0 bg-chalk/70" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
