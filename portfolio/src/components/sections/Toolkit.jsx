import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../lib/store.js";
import { focusOf, interestStore } from "../../lib/interestStore.js";
import { useCinematic, useMedia } from "../../hooks/useMedia.js";
import { gsap, ScrollTrigger } from "../../lib/smoothScroll.js";
import { projects } from "../../data/projects.js";
import { profile } from "../../data/profile.js";
import github from "../../data/github.json";
import { ArrowUpRight } from "../ui/icons.jsx";

// Builds that run on GitHub Actions: GymTracker's release workflow (see the
// Ironpeak summary in projects.js) and this repo's pages.yml, which deploys
// GYM STATS and builds the Block Blast web version.
const ACTIONS = ["ironpeak", "gymstats", "blockblast"];
// This portfolio: React + Three.js, JavaScript, Tailwind CSS, deployed by Actions.
const THIS_SITE = new Set(["react", "javascript", "html-css", "actions"]);
const short = (p) => p.title.split(" — ")[0];
const uses = (card, p) => (card.id === "actions" ? ACTIONS.includes(p.id) : p.tags.some((t) => card.tags.includes(t)));

// The sheet's columns: every project in projects.js order, then this site.
const COLUMNS = [
  ...projects.map((p) => ({ id: p.id, name: short(p), has: (card) => uses(card, p) })),
  { id: "site", name: "Diese Seite", has: (card) => THIS_SITE.has(card.id) },
];
const repoCount = Object.keys(github.repos || {}).length;

// From this width on the score sheet replaces the block list. It matches the
// cinematic gate (960px), so wherever the pen may write, the sheet is there.
const SHEET_QUERY = "(min-width: 60rem)";

// How far past its line (in screen heights) a row may be when the pen first
// notices it and still be written while you watch. A row further past than
// that was not scrolled to by hand (a page turn, a restored scroll position):
// it is simply on the sheet already, like a page filled in before you looked.
const LATE = 0.25;

// Has the visitor put a hand on the page yet (wheel, touch, key, pointer)?
// Until then every scroll is the browser's or the page's own (a restored
// position on reload, the arrival hash), so nothing is written while you
// watch: those rows are simply there.
let handOnPage = false;
if (typeof window !== "undefined") {
  const INPUTS = ["wheel", "touchstart", "keydown", "pointerdown"];
  const mark = () => {
    handOnPage = true;
    INPUTS.forEach((t) => window.removeEventListener(t, mark, true));
  };
  INPUTS.forEach((t) => window.addEventListener(t, mark, { capture: true, passive: true }));
}

// Three hand-drawn tick shapes. Which one, and its slight tilt, follow from
// the cell's place on the sheet: set once at render, never changed per frame.
const TICKS = ["M3 11 L8 16 L19 4", "M2 10 C5 12 7 15 8 17 C11 11 15 6 20 3", "M3 12 L7 16 C11 10 14 7 19 3"];

function Tick({ r, c }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 22 20"
      className="mx-auto block size-7 overflow-visible text-ember-deep"
      style={{ rotate: `${((r * 5 + c * 3) % 13) - 6}deg` }}
    >
      {/* the pen crosses the row left to right: 60 ms per column, ticked or not */}
      <path d={TICKS[(r + c) % 3]} pathLength="1" strokeWidth="2.25" className="pen-stroke" style={{ "--d": `${c * 60}ms`, "--dur-pen": "220ms" }} />
    </svg>
  );
}

// The tool's name, underlined in court blue when it is what this visitor has
// been clicking on (lib/interestStore.js, never leaves the browser).
function ToolName({ as: Tag, card, mine, className = "" }) {
  return (
    <Tag className={`font-display text-h3 ${mine ? "underline decoration-court-deep decoration-2 underline-offset-[6px]" : ""} ${className}`}>
      {card.title}
      {mine && <span className="sr-only"> (hast du oft angeklickt)</span>}
    </Tag>
  );
}

function RepoLine() {
  return (
    <>
      {repoCount > 0 && `${repoCount} öffentliche Repositories auf GitHub, diese Seite eingeschlossen. `}
      <a href={`https://github.com/${profile.githubUser}`} target="_blank" rel="noopener noreferrer" className="line-link ml-1 font-mono">
        github.com/{profile.githubUser}
        <span className="sr-only"> (öffnet in neuem Tab)</span>
        <ArrowUpRight className="" />
      </a>
    </>
  );
}

// "Werkzeug mit Beleg": the first scene of the day act, a score sheet. Rows
// are the tools, columns the projects (and this site), and a tick in the
// scorer's red pen marks every project a tool went into. Nothing is rated,
// only counted. While the choreography runs, each row is written the moment
// it comes up past 78% of the screen, once; ticks are never rubbed out, not
// even when motion is switched off and on again. Rows that are already well
// past the line when the page looks (a load at #kontakt, a reload mid-sheet,
// a page turn from the nav) stand filled in without a stroke.
// Calm path (and narrow screens): the sheet is filled in from the start;
// below 60rem it is a plain block list instead of a table.
export default function Toolkit({ cards }) {
  const rows = useMemo(() => cards.filter((c) => c.id !== "git"), [cards]);
  const cine = useCinematic();
  const sheetShown = useMedia(SHEET_QUERY);
  const focus = focusOf(useStore(interestStore));
  const tableRef = useRef(null);

  // the rows on the sheet so far, id -> "pen" (written while you watched) or
  // "still" (simply there). It only ever grows, and the first call for a row
  // decides how it got there.
  const [written, setWritten] = useState(() => new Map());
  const write = useCallback((id, how) => setWritten((prev) => (prev.has(id) ? prev : new Map(prev).set(id, how))), []);

  // off the cinematic path the whole sheet stands filled in (a stroke still
  // running when a resize ends the choreography snaps to its end), and it
  // stays that way if the choreography comes back later
  useEffect(() => {
    if (!cine) setWritten(new Map(rows.map((c) => [c.id, "still"])));
  }, [cine, rows]);

  // one trigger per unwritten row, only while the sheet is on screen (a
  // display:none row measures 0 and would fire at once)
  const pen = cine && sheetShown;
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!pen || !table) return;
    const ctx = gsap.context(() => {
      // LATE in px; read on refresh only, never inside a scroll callback
      let late = LATE * window.innerHeight;
      table.querySelectorAll("tbody > tr:not([data-drawn])").forEach((row) => {
        const id = row.dataset.row;
        ScrollTrigger.create({
          trigger: row,
          start: "top 78%",
          once: true,
          // crossed the line: the pen writes it, unless no hand moved the
          // page yet or one scroll step carried it far past (a jump), then
          // it is simply there
          onEnter: (self) => write(id, handOnPage && self.scroll() - self.start <= late ? "pen" : "still"),
          onRefresh: (self) => {
            late = LATE * window.innerHeight;
            // already past the line when measured (a load at #kontakt, a
            // restored scroll position, a relayout): there, no stroke
            if (self.scroll() >= self.start) write(id, "still");
          },
        });
      });
    }, table);
    return () => ctx.revert();
  }, [pen, write]);

  return (
    <section id="werkzeug" aria-labelledby="werkzeug-title" className="on-cream relative bg-cream text-ink">
      <div className="page pt-24 pb-[var(--space-section)]">
        <header className="grid grid-cols-12 items-end gap-x-[var(--gutter)] gap-y-6">
          <h2 id="werkzeug-title" tabIndex={-1} data-anchor-focus className="col-span-12 font-display text-h2 focus:outline-none lg:col-span-6">
            Werkzeug mit Beleg
          </h2>
          <p className="col-span-12 max-w-[22rem] text-body text-ink-soft lg:col-span-3 lg:col-start-8">Was ich wofür benutzt habe, Projekt für Projekt.</p>
          <div
            data-ball-spot="toolkit"
            aria-hidden="true"
            className="hidden aspect-square w-[min(8rem,14svh)] justify-self-end lg:col-span-2 lg:col-start-11 lg:block"
          />
        </header>

        <table
          ref={tableRef}
          className="mt-12 hidden w-full border-collapse text-left min-[60rem]:table"
          style={{ "--cols": COLUMNS.length }}
        >
          <caption className="sr-only">Welche Werkzeuge in welchen Projekten stecken</caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="w-[34%] pb-3">
                <span className="sr-only">Werkzeug</span>
              </th>
              {COLUMNS.map((col) => (
                <th key={col.id} scope="col" className="label px-2 pb-3 text-center align-bottom">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((card, r) => (
              <tr
                key={card.id}
                data-row={card.id}
                data-drawn={!cine || written.has(card.id) ? "true" : undefined}
                data-pen={!cine || written.get(card.id) === "still" ? "still" : undefined}
                className="border-b border-ink/15"
              >
                <th scope="row" className="py-5 pr-6 align-top font-normal">
                  <ToolName as="span" card={card} mine={!!focus && card.tags.includes(focus)} />
                  <p className="mt-1.5 max-w-[28rem] text-small text-ink-soft">{card.text}</p>
                </th>
                {COLUMNS.map((col, c) => (
                  <td key={col.id} className="px-2 py-5 text-center align-middle">
                    {col.has(card) ? (
                      <>
                        <Tick r={r} c={c} />
                        <span className="sr-only">ja</span>
                      </>
                    ) : (
                      <span className="sr-only">nein</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={COLUMNS.length + 1} className="label pt-5">
                <RepoLine />
              </td>
            </tr>
          </tfoot>
        </table>

        <ul className="mt-10 divide-y divide-ink/15 border-y border-ink/15 min-[60rem]:hidden">
          {rows.map((card) => (
            <li key={card.id} className="py-6">
              <ToolName as="h3" card={card} mine={!!focus && card.tags.includes(focus)} />
              <p className="mt-1.5 text-small text-ink-soft">{card.text}</p>
              <p className="label mt-3 text-court-deep">
                In:{" "}
                {COLUMNS.filter((col) => col.has(card))
                  .map((col) => col.name)
                  .join(", ")}
              </p>
            </li>
          ))}
        </ul>
        <p className="label mt-5 min-[60rem]:hidden">
          <RepoLine />
        </p>
      </div>
    </section>
  );
}
