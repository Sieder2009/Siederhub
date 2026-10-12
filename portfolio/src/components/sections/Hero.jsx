import { useEffect, useRef, useState } from "react";
import { useMagnetic } from "../../hooks/useMagnetic.js";
import { useStore } from "../../lib/store.js";
import { focusOf, interestStore, recordInterest } from "../../lib/interestStore.js";
import { setFilter } from "../../lib/filterStore.js";
import { projects, TAGS } from "../../data/projects.js";
import BallStage from "../hero/BallStage.jsx";
import ExternalLink from "../ui/ExternalLink.jsx";
import Pill from "../ui/Pill.jsx";
import { ArrowDown, ArrowUpRight, Code } from "../ui/icons.jsx";

const RISE = "motion-on:animate-rise";
const delay = (ms) => ({ animationDelay: `${ms}ms` });

// The stack as a row of shortcuts: each one jumps to the projects already
// filtered — and the one this visitor has been looking at lights up.
function StackLinks() {
  const focus = focusOf(useStore(interestStore));
  const tags = Object.entries(TAGS).filter(([id]) => projects.some((p) => p.tags.includes(id)));
  return (
    <ul aria-label="Mein Stack — springt zu den passenden Projekten" className="flex flex-wrap gap-x-2 gap-y-1">
      {tags.map(([id, label], i) => (
        <li key={id} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true" className="text-line">·</span>}
          <a
            href="#projekte"
            onClick={() => {
              setFilter(id);
              recordInterest([id], 1);
            }}
            className={`rounded-sm underline-offset-4 transition-colors hover:text-amber hover:underline focus-visible:text-amber ${id === focus ? "text-amber" : ""}`}
          >
            {label}
            {id === focus && <span className="sr-only"> (dein aktueller Schwerpunkt)</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function Hero({ profile }) {
  const github = profile.socials.find((s) => s.id === "github")?.url;
  const letters = [...profile.name.toUpperCase()];
  const markRef = useRef(null);
  const [settled, setSettled] = useState(false);
  const [jolt, setJolt] = useState(null);
  const githubRef = useMagnetic(0.18);
  const projectsRef = useMagnetic(0.18);

  // the rise-in plays once; after that the letters only move for the serve
  useEffect(() => {
    const id = setTimeout(() => setSettled(true), 1700);
    return () => clearTimeout(id);
  }, []);

  // The serve lands (3D scene or 2D fallback): a shock wave runs out from
  // the letter closest to the ball.
  useEffect(() => {
    let timer;
    const onLand = (e) => {
      const mark = markRef.current;
      if (!mark) return;
      const x = e.detail?.x ?? 0;
      const spans = [...mark.children];
      let impact = 0;
      let best = Infinity;
      spans.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - x);
        if (d < best) {
          best = d;
          impact = i;
        }
      });
      setJolt(null);
      requestAnimationFrame(() => setJolt(impact));
      clearTimeout(timer);
      timer = setTimeout(() => setJolt(null), 1100);
    };
    window.addEventListener("ball:land", onLand);
    return () => {
      window.removeEventListener("ball:land", onLand);
      clearTimeout(timer);
    };
  }, []);

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh flex-col overflow-hidden px-4 pb-6 pt-[4.75rem] sm:px-8 sm:pb-8 lg:px-12"
    >
      <h1 id="hero-title" tabIndex={-1} data-anchor-focus className="focus:outline-none">
        <span className="sr-only">
          {profile.name} — {profile.role}
        </span>
        <span aria-hidden="true" className="wordmark-box block">
          <span ref={markRef} className={`wordmark ${settled ? "is-set" : ""} ${jolt !== null ? "is-jolt" : ""}`}>
            {letters.map((ch, i) => (
              <span key={i} className="wm-letter" style={{ "--i": i, "--d": jolt === null ? 0 : Math.abs(i - jolt) }}>
                {ch}
              </span>
            ))}
          </span>
        </span>
        <span
          aria-hidden="true"
          style={delay(620)}
          className={`mt-[0.6em] block text-right font-display text-[clamp(0.9rem,2.45vw,2.5rem)] font-bold uppercase leading-none tracking-[0.015em] text-cream ${RISE}`}
        >
          {profile.role}
        </span>
      </h1>

      <div className="relative grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-12 lg:py-6">
        <div className="flex justify-center lg:justify-start lg:pl-[9%]">
          <BallStage className="aspect-square w-[min(68vw,21rem)] lg:w-auto lg:h-[clamp(12rem,40svh,27rem)]" />
        </div>
        <div style={delay(760)} className={RISE}>
          <p className="eyebrow inline-flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-amber" />
            01 — Aufschlag
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-mist sm:text-lg">
            Ich bin <strong className="font-semibold text-cream">{profile.name}</strong>. {profile.intro}
          </p>
        </div>
      </div>

      <div style={delay(900)} className={`grid items-end gap-6 sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto] ${RISE}`}>
        <a href="#warum" className="group hidden items-end gap-3 rounded-md sm:flex">
          <span aria-hidden="true" className="cue-line" />
          <span className="font-tall text-[1.7rem] leading-[0.88] tracking-[0.02em] text-cream transition-colors group-hover:text-amber group-focus-visible:text-amber">
            Scrollen
            <br />
            &amp; entdecken
          </span>
        </a>

        <div className="font-mono text-[0.72rem] font-medium uppercase leading-relaxed tracking-[0.16em] text-mist lg:justify-self-center">
          <StackLinks />
          {github && (
            <p className="mt-1">
              von{" "}
              <ExternalLink href={github} icon={false} className="text-cream underline decoration-amber/60 underline-offset-4 transition-colors hover:text-amber focus-visible:text-amber">
                {profile.githubUser}
              </ExternalLink>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:flex sm:justify-end lg:col-span-1">
          {github && (
            <Pill ref={githubRef} href={github} external icon={Code} hoverIcon={ArrowUpRight} label="GitHub" tone="ghost" className="sm:min-w-[11.5rem]" />
          )}
          <Pill ref={projectsRef} href="#projekte" icon={ArrowDown} label="Projekte" className="sm:min-w-[11.5rem]" />
        </div>
      </div>
    </section>
  );
}
