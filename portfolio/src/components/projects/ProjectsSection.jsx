import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../lib/store.js";
import { filterStore, setFilter } from "../../lib/filterStore.js";
import { focusOf, interestStore, recordInterest, resetInterests } from "../../lib/interestStore.js";
import { useInView } from "../../hooks/useInView.js";
import ExternalLink from "../ui/ExternalLink.jsx";
import { Spark } from "../ui/icons.jsx";
import ProjectCard from "./ProjectCard.jsx";
import ProjectFilter from "./ProjectFilter.jsx";

const plural = (n) => (n === 1 ? "Projekt" : "Projekte");

export default function ProjectsSection({ projects, tags, githubUser }) {
  const filter = useStore(filterStore);
  // Personalised order is decided once, on arrival — re-sorting cards while
  // someone is clicking around would be disorienting. Highlights in the hero
  // update live; this list waits for the next visit (or a reset).
  const [focusTag, setFocusTag] = useState(() => focusOf(interestStore.get()));
  const [announcement, setAnnouncement] = useState("");
  const [gridRef, inView] = useInView();
  const headingRef = useRef(null);
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
    // stable: matching projects first, otherwise keep the curated order
    return [...projects.filter((p) => p.tags.includes(focusTag)), ...projects.filter((p) => !p.tags.includes(focusTag))];
  }, [projects, focusTag]);

  const visible = filter === "all" ? ordered : ordered.filter((p) => p.tags.includes(filter));

  // Announce result counts for screen readers — also when the filter was set
  // from the hero's stack chips.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const n = filter === "all" ? projects.length : projects.filter((p) => p.tags.includes(filter)).length;
    setAnnouncement(`${n} ${plural(n)}${filter === "all" ? "" : ` mit ${tags[filter]}`} angezeigt`);
  }, [filter, projects, tags]);

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
    <section id="projekte" aria-labelledby="projekte-title" className="relative z-10 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-px w-8 bg-amber" />
            Projekte
          </p>
          <h2
            id="projekte-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-5 font-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-tight tracking-[-0.02em] focus:outline-none"
          >
            Was ich gebaut habe
          </h2>
          <p className="mt-5 text-base leading-relaxed text-mist sm:text-lg">
            Alles aus meinem GitHub-Profil{" "}
            <ExternalLink href={`https://github.com/${githubUser}`} className="group/link inline-flex items-center gap-1 font-medium text-cream underline decoration-amber/50 underline-offset-4 transition-colors hover:text-amber hover:decoration-amber">
              {githubUser}
            </ExternalLink>{" "}
            — jedes Projekt ist direkt verlinkt: live ansehen, herunterladen oder den Quellcode lesen.
          </p>
        </div>

        {focusTag && (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-amber/30 bg-amber/[0.06] px-4 py-3 text-sm sm:flex-row sm:items-center">
            <Spark className="hidden size-4 shrink-0 text-amber sm:block" />
            <p className="flex-1 text-mist">
              <strong className="font-semibold text-cream">Für dich sortiert:</strong> Projekte mit {tags[focusTag]} stehen oben — basierend auf deinen Klicks
              hier, gespeichert nur in deinem Browser.
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 shrink-0 items-center self-start rounded-full border border-line px-3.5 text-xs font-semibold text-cream transition hover:border-amber hover:text-amber focus-visible:border-amber focus-visible:text-amber sm:self-auto"
            >
              Zurücksetzen
            </button>
          </div>
        )}

        <div className="mt-10">
          <ProjectFilter options={options} value={filter} onChange={choose} />
        </div>
        <p role="status" className="sr-only">
          {announcement}
        </p>

        <ul ref={gridRef} className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project, i) => (
            <li
              key={`${filter}-${project.id}`}
              className={inView ? "motion-on:animate-card-in" : "motion-on:opacity-0"}
              style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
            >
              <ProjectCard
                project={project}
                forYou={!!focusTag && project.tags.includes(focusTag)}
                onVisit={() => recordInterest(project.tags, 2)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
