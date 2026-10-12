import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../lib/store.js";
import { filterStore, setFilter } from "../../lib/filterStore.js";
import { focusOf, interestStore, recordInterest, resetInterests } from "../../lib/interestStore.js";
import { ballStatus } from "../../lib/ballBridge.js";
import { useCinematic } from "../../hooks/useMedia.js";
import { ScrollTrigger, scrollToY } from "../../lib/smoothScroll.js";
import { rowTravel, runwayHeight, scrollForCard, travelAt } from "../../lib/rally.js";
import github from "../../data/github.json";
import ProjectFilter from "../projects/ProjectFilter.jsx";
import VolleyballSVG from "../ball/VolleyballSVG.jsx";
import { GitHub, Spark } from "../ui/icons.jsx";
import RallyCard from "./RallyCard.jsx";

const plural = (n) => (n === 1 ? "Projekt" : "Projekte");
const repoCount = Object.keys(github.repos || {}).length;

// "Ball im Spiel" — the projects as one pinned row. The stage sticks while
// the row slides left in step with the scroll (one px down = one px left),
// ending on the GitHub mark, where the ball comes to sit. Filter and
// personal order (from what this visitor clicked) stay — a filter change
// changes the row's length, so the runway is re-measured. Keyboard focus on
// a card that is off stage scrolls it into view. Calm path (phones, motion
// off): the same cards as a plain list, nothing pinned.
export default function Rally({ projects, tags, githubUser }) {
  const cine = useCinematic();
  const filter = useStore(filterStore);
  const show2D = useStore(ballStatus) !== "ready";
  // personal order is decided once, on arrival — re-sorting while someone is
  // clicking around would be disorienting
  const [focusTag, setFocusTag] = useState(() => focusOf(interestStore.get()));
  const [announcement, setAnnouncement] = useState("");
  const runwayRef = useRef(null);
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const headingRef = useRef(null);
  const geo = useRef({ travel: 0, top: 0 });
  const firstRender = useRef(true);

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

  const visible = filter === "all" ? ordered : ordered.filter((p) => p.tags.includes(filter));

  // screen readers hear the result count — also when the hero's stack links set the filter
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const n = filter === "all" ? projects.length : projects.filter((p) => p.tags.includes(filter)).length;
    setAnnouncement(`${n} ${plural(n)}${filter === "all" ? "" : ` mit ${tags[filter]}`} angezeigt`);
  }, [filter, projects, tags]);

  // ------------------------------------------------ pinned row (cinematic)
  useLayoutEffect(() => {
    const runway = runwayRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!cine || !runway || !stage || !track) return;

    const place = (scroll) => {
      const { travel, top } = geo.current;
      const x = travelAt(scroll, top, travel);
      track.style.transform = `translate3d(${-x}px,0,0)`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${travel ? (x / travel).toFixed(4) : 0})`;
    };
    // Cards are sized by the screen's height as well as its width: the
    // widest card whose 16:10 photo plus its text (which wraps less the wider
    // the card gets) still fits the stage — so a short laptop screen still
    // shows every button. Only runs on refresh (resize, filter), not per frame.
    const sizeCards = () => {
      const free = track.parentElement.clientHeight - 12;
      const widest = Math.round(Math.min(window.innerWidth * 0.34, 736));
      const texts = track.querySelectorAll(".card-text");
      let w = widest;
      for (; w > 260; w -= 16) {
        track.style.setProperty("--card-w", `${w}px`);
        let text = 0;
        texts.forEach((el) => (text = Math.max(text, el.offsetHeight)));
        if (w / 1.6 + text <= free) break;
      }
      track.style.setProperty("--card-w", `${Math.max(w, 260)}px`);
    };
    const measure = () => {
      track.style.transform = "";
      sizeCards();
      const travel = rowTravel(track.scrollWidth, stage.clientWidth);
      geo.current.travel = travel;
      runway.style.height = `${runwayHeight(window.innerHeight, travel)}px`;
    };

    const trigger = ScrollTrigger.create({
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
    measure();
    ScrollTrigger.refresh();

    return () => {
      trigger.kill();
      runway.style.height = "";
      track.style.transform = "";
      track.style.removeProperty("--card-w");
      ScrollTrigger.refresh();
    };
  }, [cine]);

  // a filter change makes the row shorter or longer
  useLayoutEffect(() => {
    if (cine) ScrollTrigger.refresh();
  }, [cine, filter, visible.length]);

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

  // toggle semantics (aria-pressed): pressing the active filter again releases it
  const choose = (tag) => {
    const next = tag === filter && tag !== "all" ? "all" : tag;
    setFilter(next);
    if (next !== "all") recordInterest([next], 1);
  };

  const reset = () => {
    resetInterests();
    setFocusTag(null);
    headingRef.current?.focus();
  };

  return (
    <section id="projekte" aria-labelledby="projekte-title" className="relative">
      <div ref={runwayRef} className={cine ? "relative" : ""}>
        <div
          ref={stageRef}
          className={cine ? "rally-stage sticky top-0 flex h-svh flex-col overflow-x-clip pb-6 pt-[4.75rem]" : "py-24 sm:py-28"}
        >
          <header
            className={`mx-auto grid w-full gap-6 px-4 sm:px-8 lg:px-12 ${
              cine ? "max-w-[96rem] grid-cols-[auto_minmax(0,1fr)] items-end gap-x-16" : "max-w-6xl"
            }`}
          >
            <div className="border-l-4 border-amber pl-5 sm:pl-6">
              <p className="eyebrow">03 — Projekte</p>
              <h2
                id="projekte-title"
                ref={headingRef}
                tabIndex={-1}
                data-anchor-focus
                className="mt-3 font-tall text-[clamp(3.4rem,min(6.6vw,11svh),7.25rem)] leading-[0.86] tracking-[0.01em] text-cream focus:outline-none"
              >
                Ball im
                <br />
                Spiel
              </h2>
            </div>
            <div className="max-w-2xl">
              <p className="text-base leading-relaxed text-cream sm:text-lg">
                Keine Mockups, sondern echte Projekte: eine App für vier Plattformen, eine 3D-Welt, ein Spiel im Browser. Alles davon kannst du direkt
                öffnen — und den Code dazu lesen.
              </p>
              <div className="mt-5">
                <ProjectFilter compact options={options} value={filter} onChange={choose} />
              </div>
              {focusTag && (
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mist">
                  <Spark className="size-3.5 text-amber" />
                  <span>
                    <strong className="font-semibold text-cream">Für dich sortiert:</strong> {tags[focusTag]} zuerst — nach deinen Klicks, gespeichert nur in
                    deinem Browser.
                  </span>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-line px-2.5 py-0.5 font-semibold text-cream transition hover:border-amber hover:text-amber focus-visible:border-amber focus-visible:text-amber"
                  >
                    Zurücksetzen
                  </button>
                </p>
              )}
            </div>
          </header>
          <p role="status" className="sr-only">
            {announcement}
          </p>

          <div className={cine ? "relative mt-6 min-h-0 flex-1" : "mx-auto mt-12 max-w-6xl px-4 sm:px-8 lg:px-12"}>
            <ul
              ref={trackRef}
              onFocus={onFocusIn}
              className={
                cine
                  ? "rally-track relative flex h-full w-max items-start gap-[clamp(1.5rem,2.6vw,3rem)] px-[max(3rem,calc((100vw-96rem)/2+3rem))] will-change-transform"
                  : "grid gap-14 md:grid-cols-2 md:gap-x-8"
              }
            >
              {visible.map((project, i) => (
                <li key={project.id} data-rally-item className="rally-item">
                  <RallyCard
                    project={project}
                    index={projects.indexOf(project)}
                    forYou={!!focusTag && project.tags.includes(focusTag)}
                    onVisit={() => recordInterest(project.tags, 2)}
                  />
                </li>
              ))}

              <li data-rally-item className="rally-end flex items-center self-stretch md:col-span-2">
                <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:gap-10">
                  <a
                    href={`https://github.com/${githubUser}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/gh relative mt-[7rem] grid aspect-square w-[min(11.5rem,24svh)] shrink-0 place-items-center rounded-full bg-cream text-night-950 transition-transform duration-500 ease-[var(--ease-snap)] hover:-rotate-6 hover:scale-105 focus-visible:-rotate-6 focus-visible:scale-105 sm:mt-[6rem]"
                  >
                    <GitHub className="size-[62%]" />
                    <span className="sr-only">Alle Projekte auf GitHub (öffnet in neuem Tab)</span>
                    {/* the ball comes to sit right on top of the mark */}
                    <span data-ball-spot="github" aria-hidden="true" className="absolute bottom-[90%] left-1/2 aspect-square w-[44%] -translate-x-1/2">
                      {show2D && <VolleyballSVG className="size-full" />}
                    </span>
                  </a>
                  <div className="max-w-xs">
                    <p className="font-tall text-[clamp(3rem,4.6vw,5.25rem)] leading-[0.88] tracking-[0.01em] text-cream" aria-hidden="true">
                      Noch nicht
                      <br />
                      <span className="text-amber">genug?</span>
                    </p>
                    <p className="mt-4 font-mono text-sm text-mist">
                      github.com/<span className="text-cream">{githubUser}</span>
                    </p>
                    {repoCount > 0 && (
                      <p className="mt-3 text-sm leading-relaxed text-mist">
                        Dort liegen alle {repoCount} öffentlichen Repositories — auch die, die hier keine Karte haben.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {cine && (
            <div aria-hidden="true" className="mx-auto mt-5 h-px w-full max-w-[96rem] px-12">
              <div className="h-px w-full bg-night-700">
                <div ref={barRef} className="h-px w-full origin-left scale-x-0 bg-amber" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
