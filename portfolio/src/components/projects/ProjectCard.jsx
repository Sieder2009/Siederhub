import { useStore } from "../../lib/store.js";
import { motionStore } from "../../lib/motionStore.js";
import { finePointer } from "../../lib/capabilities.js";
import github from "../../data/github.json";
import ExternalLink from "../ui/ExternalLink.jsx";
import { Code, Download, Spark } from "../ui/icons.jsx";
import { btnSmallPrimary, btnSmallSecondary } from "../ui/buttons.js";
import LanguageBar from "./LanguageBar.jsx";

const BASE = import.meta.env.BASE_URL;
const ICONS = { download: Download, code: Code };
const STATUS = {
  live: { label: "Live", dot: "bg-mint" },
  download: { label: "Download", dot: "bg-court" },
  code: { label: "Quellcode", dot: "bg-haze" },
};
const monthYear = new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric" });
const TILT = 5; // degrees

function LinkLabel({ link }) {
  const Icon = ICONS[link.type];
  return (
    <>
      {Icon && <Icon className="size-4" />}
      {link.label}
    </>
  );
}

// One project. The primary button's click area stretches over the whole card
// (.stretched-link), the other links sit above it and stay separately
// clickable. Hover effects (lift, border glow following the pointer, slight
// 3D tilt, image zoom) all have a :focus-within twin for keyboard users.
export default function ProjectCard({ project, forYou, onVisit }) {
  const motion = useStore(motionStore);
  const repo = github.repos?.[project.repo];
  const { primary, more } = project.links;
  // the badge names what the big button does: try it live, download it, or read the code
  const status = STATUS[primary.type] || STATUS.code;
  const titleId = `${project.id}-title`;
  const tilt = motion === "on" && finePointer;

  const onPointerMove = (e) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
    if (tilt) {
      card.style.setProperty("--ry", `${((x / r.width - 0.5) * TILT).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${((0.5 - y / r.height) * TILT).toFixed(2)}deg`);
    }
  };
  const onPointerLeave = (e) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

  return (
    <article
      aria-labelledby={titleId}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="project-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-night-700 bg-night-850"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-night-800">
        <img
          src={`${BASE}projects/${project.image}.webp`}
          srcSet={`${BASE}projects/${project.image}-640.webp 640w, ${BASE}projects/${project.image}.webp 1200w`}
          sizes="(min-width: 1280px) 368px, (min-width: 768px) 45vw, 92vw"
          width="1200"
          height="750"
          loading="lazy"
          decoding="async"
          alt={project.imageAlt}
          className="size-full object-cover object-top transition-transform duration-700 ease-[var(--ease-snap)] group-hover:scale-[1.045] group-focus-within:scale-[1.045]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night-850 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-night-950/85 px-2.5 py-1 text-xs font-semibold text-cream backdrop-blur">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        {forYou && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber px-2.5 py-1 text-xs font-semibold text-night-950">
            <Spark className="size-3" />
            Für dich
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-wider">
          <span className="text-amber">{project.kind}</span>
          {repo?.pushedAt && (
            <time dateTime={repo.pushedAt} className="text-haze" title="Letzte Aktualisierung auf GitHub">
              <span className="sr-only">, zuletzt aktualisiert </span>
              {monthYear.format(new Date(repo.pushedAt))}
            </time>
          )}
        </p>
        <h3 id={titleId} className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight">
          {project.title}
        </h3>
        <p className="mt-2 text-sm font-medium text-cream">
          <span className="text-haze">Zweck: </span>
          {project.purpose}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-mist">{project.summary}</p>

        <ul aria-label="Technologien" className="mt-4 flex flex-wrap gap-1.5">
          {project.tech.map((t) => (
            <li key={t} className="rounded-md border border-night-700 bg-night-900 px-2 py-0.5 font-mono text-xs text-mist transition-colors duration-300 group-hover:border-night-700 group-hover:text-cream">
              {t}
            </li>
          ))}
        </ul>

        <LanguageBar languages={repo?.languages} />

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
          <ExternalLink href={primary.url} onClick={onVisit} srContext={project.title} className={`stretched-link ${btnSmallPrimary}`}>
            <LinkLabel link={primary} />
          </ExternalLink>
          {more.map((link) => (
            <ExternalLink key={link.url} href={link.url} onClick={onVisit} srContext={project.title} className={btnSmallSecondary}>
              <LinkLabel link={link} />
            </ExternalLink>
          ))}
        </div>
      </div>
    </article>
  );
}
