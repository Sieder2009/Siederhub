import { useEffect, useRef, useState } from "react";
import { useStore } from "../../lib/store.js";
import { motionStore } from "../../lib/motionStore.js";
import { gsap } from "../../lib/smoothScroll.js";
import { focusOf, interestStore, recordInterest } from "../../lib/interestStore.js";
import { setFilter } from "../../lib/filterStore.js";
import { projects, TAGS } from "../../data/projects.js";
import BallStage from "../hero/BallStage.jsx";
import Tape, { TAPE } from "../ui/Tape.jsx";
import { ArrowDown, ArrowUpRight } from "../ui/icons.jsx";

// Font gate: the wordmark, its tape and the role line stay hidden (not
// animated, just hidden) until Unbounded is there, so the fallback font never
// flashes. After FONT_WAIT they show with whatever has arrived.
const WORDMARK_FONT = '900 1em "Unbounded Variable"';
const FONT_WAIT = 900;
const fontsReadyNow = () => typeof document === "undefined" || !document.fonts || document.fonts.check(WORDMARK_FONT, "SIEDER");

// The serve lands: the letters ride the net tape's wave. The impact letter
// takes the kick at RIDE times the tape's offset; the extra fades out with
// distance (KICK wordmark widths), so the neighbours follow and the far
// letters just sit on the tape and barely move. The tape's amplitude scales
// with the wordmark (DIP px per px of letter box), so the impact letter dips
// ~8% of its height on any screen.
const RIDE = 2.5;
const KICK = 0.22;
const DIP = 0.032;
const MIN_AMP = 1.5;

// The stack as a line of shortcuts: each one jumps to the projects already
// filtered. The one this visitor keeps clicking gets a court-blue underline.
function StackLinks() {
  const focus = focusOf(useStore(interestStore));
  const tags = Object.entries(TAGS).filter(([id]) => projects.some((p) => p.tags.includes(id)));
  return (
    <ul role="list" aria-label="Meine Techniken, jede zeigt die passenden Projekte" className="inline">
      {tags.map(([id, label], i) => (
        <li key={id} className="inline">
          {i > 0 && <span aria-hidden="true">, </span>}
          <a
            href="#projekte"
            className={`line-link ${id === focus ? "decoration-court decoration-2" : ""}`}
            data-quiet
            onClick={() => {
              setFilter(id);
              recordInterest([id], 1);
            }}
          >
            {label}
            {id === focus && <span className="sr-only"> (hast du oft angeklickt)</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function Hero({ profile }) {
  const github = profile.socials.find((s) => s.id === "github")?.url;
  const letters = [...profile.name.toUpperCase()];
  const rootRef = useRef(null);
  const markRef = useRef(null);
  const tapeRef = useRef(null);
  const [fontsReady, setFontsReady] = useState(fontsReadyNow);

  useEffect(() => {
    if (fontsReady) return;
    let live = true;
    let timer = 0;
    const late = new Promise((resolve) => {
      timer = setTimeout(resolve, FONT_WAIT);
    });
    Promise.race([document.fonts.load(WORDMARK_FONT, "SIEDER"), late])
      .catch(() => {})
      .then(() => live && setFontsReady(true));
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [fontsReady]);

  // The serve lands (3D scene or 2D fallback): the net tape takes the hit at
  // the ball's x, a damped wave runs out along it, and every letter rides the
  // tape right under its centre. The letter nearest the impact also squashes
  // onto the line and springs back. This is the only time the letters move.
  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    const els = [...mark.children];
    const setY = els.map((el) => gsap.quickSetter(el, "y", "px"));
    const ctx = gsap.context(() => {}, rootRef);
    let settle = null;

    const clear = () => {
      settle?.kill();
      settle = null;
      gsap.killTweensOf(els);
      gsap.set(els, { clearProps: "transform" });
    };

    const onLand = (e) => {
      const x = e.detail?.x;
      if (motionStore.get() !== "on" || typeof x !== "number" || !tapeRef.current) return;
      // a repeat landing restarts from rest; measure only after the clear
      clear();
      const cx = els.map((el) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      let impact = 0;
      cx.forEach((c, i) => {
        if (Math.abs(c - x) < Math.abs(cx[impact] - x)) impact = i;
      });
      const box = mark.getBoundingClientRect();
      const amp = Math.min(TAPE.amp, Math.max(MIN_AMP, box.height * DIP));
      const ride = cx.map((c) => 1 + (RIDE - 1) * Math.exp(-Math.abs(c - cx[impact]) / (KICK * box.width)));

      ctx.add(() => {
        gsap
          .timeline()
          .to(els[impact], { scaleX: 1.04, scaleY: 0.9, duration: 0.08, ease: "power2.out" })
          .to(els[impact], { scaleX: 1, scaleY: 1, duration: 0.7, ease: "elastic.out(1, 0.4)" });
        // the wave is over and the squash has settled: no inline transforms left
        settle = gsap.delayedCall(TAPE.life + 0.05, () => gsap.set(els, { clearProps: "transform" }));
      });

      tapeRef.current.strike(x, {
        amp,
        onFrame: (sample) => {
          if (motionStore.get() !== "on") return;
          els.forEach((el, i) => setY[i](sample(cx[i]) * ride[i]));
        },
      });
    };

    window.addEventListener("ball:land", onLand);
    const offMotion = motionStore.subscribe((value) => value === "off" && clear());
    return () => {
      window.removeEventListener("ball:land", onLand);
      offMotion();
      clear();
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="top"
      ref={rootRef}
      aria-labelledby="hero-title"
      data-wait={fontsReady ? undefined : ""}
      className="page relative isolate flex min-h-svh flex-col pb-8 pt-[4.75rem]"
    >
      <h1 id="hero-title" tabIndex={-1} data-anchor-focus className="hero-title focus:outline-none">
        <span className="sr-only">
          {profile.name}, {profile.role}
        </span>
        <span aria-hidden="true" className="wordmark-box block">
          <span ref={markRef} className="wordmark">
            {letters.map((ch, i) => (
              <span key={i} className="wm-letter">
                {ch}
              </span>
            ))}
          </span>
        </span>
        <Tape ref={tapeRef} className="hero-tape text-chalk" style={{ "--tape-w": "3px" }} />
        <span
          aria-hidden="true"
          className="hero-role mt-3 block text-right font-display text-[clamp(1rem,2.2vw,2.25rem)] font-light leading-none text-cream"
        >
          {profile.role}
        </span>
      </h1>

      {/* Ball and text stand on one floor line (the stage's bottom edge); the
          replay control hangs below it, in this row's bottom padding. */}
      <div className="grid flex-1 grid-cols-12 content-end items-end gap-x-[var(--gutter)] pt-8 md:pb-14">
        <BallStage className="col-span-12 md:col-span-6 md:row-start-1" />

        <div className="col-span-12 mt-[4.5rem] md:col-span-6 md:col-start-7 md:row-start-1 md:mt-0 md:pb-4 lg:col-span-5 lg:col-start-8">
          <p className="max-w-[34rem] text-lead text-mist">
            Ich bin <strong className="font-semibold text-cream">{profile.name}</strong>. {profile.intro}
          </p>
          <a href="#projekte" className="serve mt-8" data-glyph="down">
            Projekte ansehen
            <ArrowDown className="" />
          </a>
          <div className="mt-6 text-small text-mist">
            <StackLinks />
            {github && (
              <>
                <span aria-hidden="true"> · </span>
                <a href={github} target="_blank" rel="noopener noreferrer" className="line-link font-mono" data-quiet>
                  github.com/{profile.githubUser}
                  <span className="sr-only"> (öffnet in neuem Tab)</span>
                  <ArrowUpRight className="" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
