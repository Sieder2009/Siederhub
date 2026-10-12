import { useLayoutEffect, useRef } from "react";
import { useStore } from "../../lib/store.js";
import { focusOf, interestStore } from "../../lib/interestStore.js";
import { useCinematic } from "../../hooks/useMedia.js";
import { gsap } from "../../lib/smoothScroll.js";

const evidenceLine = (card) => {
  if (!card.evidence.length) return null;
  if (!card.tags.length) return card.evidence.join(" · ");
  const n = card.evidence.length;
  return `${n} ${n === 1 ? "Projekt" : "Projekte"}: ${card.evidence.join(", ")}`;
};

// "Werkzeug mit Beleg" — first scene of the day act. No percentage bars:
// every card names the projects the tool really went into. While the stage
// is pinned the cards are dealt out of a deck below the bottom right corner
// into their places, one after another, in step with the scroll. The card
// matching what this visitor has been clicking gets marked.
// Calm path: the same cards, simply laid out.
export default function Toolkit({ cards }) {
  const cine = useCinematic();
  const focus = focusOf(useStore(interestStore));
  const runwayRef = useRef(null);
  const stageRef = useRef(null);
  const gridRef = useRef(null);

  useLayoutEffect(() => {
    const runway = runwayRef.current;
    const stage = stageRef.current;
    if (!cine || !runway || !stage) return;
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray(".tool-card", gridRef.current);
      // the deck: just below the stage's bottom right corner
      const deck = () => ({ x: stage.clientWidth * 0.86, y: stage.clientHeight * 1.18 });
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out", duration: 1 },
        scrollTrigger: { trigger: runway, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
      });
      items.forEach((el, i) => {
        timeline.fromTo(
          el,
          {
            x: () => deck().x - (el.offsetLeft + el.offsetWidth / 2),
            y: () => deck().y - (el.offsetTop + el.offsetHeight / 2),
            rotation: 14 - i * 2,
          },
          { x: 0, y: 0, rotation: 0 },
          i * 0.42
        );
      });
      timeline.to({}, { duration: 0.7 }); // the full hand rests a moment before the page moves on
    }, stage);
    return () => ctx.revert();
  }, [cine]);

  return (
    <section id="werkzeug" aria-labelledby="werkzeug-title" className="relative bg-cream text-ink">
      <div ref={runwayRef} className={cine ? "relative h-[250svh]" : ""}>
        <div
          ref={stageRef}
          className={cine ? "sticky top-0 flex h-svh flex-col overflow-clip px-12 pb-8 pt-[5.25rem]" : "mx-auto max-w-6xl px-4 py-24 sm:px-8"}
        >
          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div>
              <p className="eyebrow on-day inline-flex items-center gap-3">
                <span aria-hidden="true" className="h-px w-8 bg-ember-deep" />
                05 — Werkzeug
              </p>
              <h2
                id="werkzeug-title"
                tabIndex={-1}
                data-anchor-focus
                className="mt-4 font-display text-[clamp(2.3rem,min(5.2vw,9svh),5.25rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.025em] focus:outline-none"
              >
                Werkzeug
                <br />
                <span className="text-ink-soft">mit Beleg</span>
              </h2>
            </div>
            <p className="max-w-sm text-base leading-relaxed text-ink-soft lg:mb-2">
              Keine Prozent-Balken: Jede Karte zeigt, in welchen Projekten das Werkzeug wirklich steckt.
            </p>
            <div data-ball-spot="toolkit" aria-hidden="true" className="hidden aspect-square w-[min(9rem,16svh)] shrink-0 lg:block" />
          </header>

          <ul
            ref={gridRef}
            className={`mt-8 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 ${cine ? "[@media(max-height:860px)]:mt-6 [@media(max-height:860px)]:gap-3.5" : ""}`}
          >
            {cards.map((card, i) => {
              const mine = !!focus && card.tags.includes(focus);
              const line = evidenceLine(card);
              return (
                <li
                  key={card.id}
                  className={`tool-card relative flex flex-col rounded-2xl border bg-[#f9f7f2] p-5 shadow-[0_22px_44px_-30px_rgb(11_18_38/0.5)] lg:p-6 [@media(max-height:860px)]:lg:p-4 ${
                    mine ? "border-2 border-court-deep" : "border-ink/70"
                  }`}
                >
                  <span aria-hidden="true" className="font-tall text-[clamp(2.1rem,min(3.8vw,6.5svh),4.25rem)] leading-[0.9] text-ember-deep">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {mine && (
                    <span className="absolute right-4 top-4 rounded-full bg-court-deep px-2.5 py-1 text-xs font-semibold text-cream">Dein Schwerpunkt</span>
                  )}
                  <h3 className="mt-auto pt-2 font-display text-[clamp(1rem,1.45vw,1.3rem)] font-bold uppercase leading-tight tracking-[-0.01em]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{card.text}</p>
                  {line && <p className="mt-3 font-mono text-[0.7rem] font-medium uppercase leading-relaxed tracking-[0.08em] text-court-deep">{line}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
