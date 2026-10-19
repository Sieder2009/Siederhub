import { useLayoutEffect, useRef, useState } from "react";
import github from "../../data/github.json";
import { ArrowUpRight, Download, Play } from "../ui/icons.jsx";
import GlyphScan from "./GlyphScan.jsx";

const BASE = import.meta.env.BASE_URL;
const ICONS = { live: ArrowUpRight, code: ArrowUpRight, play: Play, download: Download };
const month = new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric" });

// "https://ironpeak.siggidy.dev/" → "ironpeak.siggidy.dev"
const address = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// When the repo was last pushed ("Okt. 2026"), from data/github.json. Nothing
// when the repo is not in there.
function updated(repo) {
  const at = github.repos?.[repo]?.pushedAt;
  if (!at) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : month.format(date);
}

// Hovering (or focusing) a link previews where it leads, right on the photo:
// the address opens in a chip at the foot of the photo, wiped open from its
// leading edge, and for the source code the screenshot scans into glyphs
// (GlyphScan.jsx). The chip keeps the last address while it closes, so it
// never empties before it is gone.
function AddressChip({ text, active, side }) {
  const [shown, setShown] = useState(text);
  if (text && text !== shown) setShown(text);
  return (
    <span aria-hidden="true" data-side={side} className={`address-chip ${active ? "is-on" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 shrink-0">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span className="truncate">{shown}</span>
    </span>
  );
}

export default function RallyCard({ project, forYou, onVisit }) {
  const [preview, setPreview] = useState(null); // null | { kind, url }
  const [side, setSide] = useState("left");
  const mediaRef = useRef(null);
  const { primary, more } = project.links;
  const links = [primary, ...more];
  const titleId = `${project.id}-title`;
  const date = updated(project.repo);

  // mouse: hover · keyboard: focus · touch: while the finger is down
  const previewProps = (link) => ({
    onPointerEnter: (e) => e.pointerType === "mouse" && setPreview(link),
    onPointerLeave: (e) => e.pointerType === "mouse" && setPreview(null),
    onPointerDown: (e) => e.pointerType !== "mouse" && setPreview(link),
    onFocus: () => setPreview(link),
    onBlur: () => setPreview(null),
    onClick: () => onVisit?.(),
  });

  // In the pinned row a card can sit half off the stage's left edge: the
  // chip then opens from the photo's right edge, where it can be read. Decided
  // when a preview opens (one read per hover), kept while it closes.
  useLayoutEffect(() => {
    if (!preview || !mediaRef.current) return;
    setSide(mediaRef.current.getBoundingClientRect().left < 0 ? "right" : "left");
  }, [preview]);

  return (
    <article aria-labelledby={titleId} className="rally-card">
      <div ref={mediaRef} className="card-media relative overflow-hidden rounded-photo bg-night-800">
        <img
          src={`${BASE}projects/${project.image}.webp`}
          srcSet={`${BASE}projects/${project.image}-640.webp 640w, ${BASE}projects/${project.image}.webp 1200w`}
          sizes="(min-width: 960px) 40vw, 92vw"
          width="1200"
          height="750"
          loading="lazy"
          decoding="async"
          alt={project.imageAlt}
          className="card-photo size-full object-cover"
        />
        <GlyphScan src={`${BASE}projects/${project.image}.webp`} active={preview?.type === "code"} />
        <AddressChip text={preview ? address(preview.url) : ""} active={!!preview} side={side} />
      </div>

      {/* flow-root: the title's top margin stays inside, so sizeCards measures it */}
      <div className="card-text flow-root">
        <h3 id={titleId} className="mt-4 font-display text-h3 text-cream">
          {project.title}
        </h3>
        {/* compact 2 (pinned, short stage): the number drops to title size */}
        {project.stat && (
          <p className="card-stat mt-2 font-display text-stat tabular-nums text-cream group-data-[compact=2]/track:text-[length:var(--text-h3)]">
            {project.stat}
          </p>
        )}
        {project.detail && <p className="card-detail mt-2 text-small text-cream">{project.detail}</p>}
        <p className="card-purpose mt-1.5 text-small text-mist">{project.purpose}</p>
        <p className="label mt-3">
          {project.kind}
          {date && <> · aktualisiert {date}</>}
          {forYou && <span className="text-court"> · Für dich zuerst</span>}
        </p>
        <p className="label">
          <span className="sr-only">Technologien: </span>
          {project.tech.join(", ")}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => {
            const Icon = ICONS[link.type] || ArrowUpRight;
            return (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="line-link"
                data-primary={link === primary || undefined}
                data-quiet={link.type === "code" || undefined}
                {...previewProps(link)}
              >
                {link.label}
                <span className="sr-only">: {project.title}</span>
                <span className="sr-only"> (öffnet in neuem Tab)</span>
                <Icon className="" />
              </a>
            );
          })}
        </div>
      </div>
    </article>
  );
}
