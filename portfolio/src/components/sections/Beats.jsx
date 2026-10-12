import { useEffect, useRef, useState } from "react";
import { useCinematic } from "../../hooks/useMedia.js";

// "Jeder Satz zählt." — the headline holds still (sticky) while four short
// beats scroll past beside it; the one in the middle of the screen takes the
// floor, the others step back (but stay readable: AA contrast even dimmed).
// The ball waits in the empty spot under the headline and keeps turning.
// Calm path (phones, motion off): a plain stacked section, all beats lit.
export default function Beats({ beats }) {
  const cine = useCinematic();
  const [active, setActive] = useState(0);
  const items = useRef([]);

  useEffect(() => {
    if (!cine || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.index));
        });
      },
      { rootMargin: "-46% 0px -46% 0px" }
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [cine]);

  return (
    <section id="warum" aria-labelledby="warum-title" className={`relative ${cine ? "beats-cine" : ""}`}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16 lg:px-12 lg:py-0">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-center lg:self-start">
          <p className="eyebrow inline-flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-amber" />
            02 — Warum
          </p>
          <h2
            id="warum-title"
            tabIndex={-1}
            data-anchor-focus
            className="mt-5 font-tall text-[clamp(4.25rem,10.5vw,10.5rem)] leading-[0.92] tracking-[0.01em] text-cream focus:outline-none"
          >
            Jeder Satz
            <br />
            zählt.
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-mist sm:text-lg">
            Jeder Commit auch. Was hinter den Projekten steckt — in vier Sätzen.
          </p>
          <div data-ball-spot="beats" aria-hidden="true" className="mt-10 hidden aspect-square w-[min(14rem,22svh)] lg:block" />
        </div>

        <ol className="lg:py-[26svh]">
          {beats.map((beat, i) => (
            <li
              key={beat.id}
              ref={(el) => (items.current[i] = el)}
              data-index={i}
              className={`beat flex flex-col justify-center border-t border-night-700 py-10 first:border-t-0 lg:min-h-[62svh] lg:border-t-0 lg:py-0 ${active === i ? "is-on" : ""}`}
            >
              <p className="font-mono text-sm font-medium text-amber" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-display text-[clamp(1.45rem,2.5vw,2.35rem)] font-bold uppercase leading-[1.06] tracking-[-0.01em] text-amber">
                {beat.title}
              </h3>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-cream sm:text-lg">{beat.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
