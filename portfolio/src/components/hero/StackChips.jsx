import { useStore } from "../../lib/store.js";
import { focusOf, interestStore, recordInterest } from "../../lib/interestStore.js";
import { setFilter } from "../../lib/filterStore.js";
import { projects, TAGS } from "../../data/projects.js";

// The stack, straight from the project data. Each chip jumps to the project
// list pre-filtered — and the chip matching what this visitor has been
// looking at lights up (personalised, live, no layout shift).
export default function StackChips() {
  const focus = focusOf(useStore(interestStore));
  const chips = Object.entries(TAGS).map(([id, label]) => ({
    id,
    label,
    count: projects.filter((p) => p.tags.includes(id)).length,
  }));

  return (
    <div>
      <p id="stack-label" className="font-mono text-xs text-haze">
        Mein Stack — ein Klick filtert die Projekte
      </p>
      <ul aria-labelledby="stack-label" className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isFocus = chip.id === focus;
          return (
            <li key={chip.id}>
              <a
                href="#projekte"
                onClick={() => {
                  setFilter(chip.id);
                  recordInterest([chip.id], 1);
                }}
                className={`relative inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber hover:text-cream focus-visible:-translate-y-0.5 focus-visible:border-amber ${
                  isFocus ? "border-amber/70 bg-amber/10 text-cream" : "border-night-700 bg-night-900/60 text-mist"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full transition duration-500 ${isFocus ? "scale-100 bg-amber shadow-[0_0_10px_rgb(255_179_71)]" : "scale-75 bg-night-700"}`}
                />
                {chip.label}
                <span className="font-mono text-xs text-haze">
                  {chip.count}
                  <span className="sr-only"> {chip.count === 1 ? "Projekt" : "Projekte"}</span>
                </span>
                {isFocus && <span className="sr-only">(dein aktueller Schwerpunkt)</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
