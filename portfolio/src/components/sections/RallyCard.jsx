import { useEffect, useState } from "react";
import { useStore } from "../../lib/store.js";
import { motionStore } from "../../lib/motionStore.js";
import Pill from "../ui/Pill.jsx";
import { ArrowUpRight, Code, Download, Play, Spark } from "../ui/icons.jsx";
import GlyphScan from "./GlyphScan.jsx";

const BASE = import.meta.env.BASE_URL;
const ICONS = { live: ArrowUpRight, play: Play, download: Download, code: Code };
const STATUS = {
  live: "Live",
  play: "Spielbar",
  download: "Download",
  code: "Quellcode",
};

// "https://ironpeak.siggidy.dev/" → "ironpeak.siggidy.dev"
const address = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Hovering (or focusing) a button previews where it leads, right on the
// image: the address types itself into a chip — and for the source code,
// the screenshot scans into glyphs (GlyphScan.jsx).
function AddressChip({ text, active }) {
  const motion = useStore(motionStore);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    if (motion !== "on") {
      setShown(text.length);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [active, text, motion]);

  return (
    <span aria-hidden="true" className={`address-chip ${active ? "is-on" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 shrink-0">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span className="truncate">{text.slice(0, shown)}</span>
      <span className="address-caret" />
    </span>
  );
}

export default function RallyCard({ project, index, forYou, onVisit }) {
  const [preview, setPreview] = useState(null); // null | { kind, url }
  const { primary, more } = project.links;
  const links = [primary, ...more];
  const titleId = `${project.id}-title`;

  // mouse: hover · keyboard: focus · touch: while the finger is down
  const previewProps = (link) => ({
    onPointerEnter: (e) => e.pointerType === "mouse" && setPreview(link),
    onPointerLeave: (e) => e.pointerType === "mouse" && setPreview(null),
    onPointerDown: (e) => e.pointerType !== "mouse" && setPreview(link),
    onFocus: () => setPreview(link),
    onBlur: () => setPreview(null),
    onClick: () => onVisit?.(),
  });

  return (
    <article aria-labelledby={titleId} className="rally-card group/card">
      <div className="card-media relative overflow-hidden rounded-2xl border border-night-700 bg-night-800">
        <img
          src={`${BASE}projects/${project.image}.webp`}
          srcSet={`${BASE}projects/${project.image}-640.webp 640w, ${BASE}projects/${project.image}.webp 1200w`}
          sizes="(min-width: 960px) 40vw, 92vw"
          width="1200"
          height="750"
          loading="lazy"
          decoding="async"
          alt={project.imageAlt}
          className="card-photo size-full object-cover object-top"
        />
        <GlyphScan src={`${BASE}projects/${project.image}.webp`} active={preview?.type === "code"} />
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-night-950/85 px-2.5 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-cream backdrop-blur">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_rgb(95_211_154)]" />
          {STATUS[primary.type] || STATUS.code}
        </span>
        {forYou && (
          <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-amber px-2.5 py-1 text-xs font-semibold text-night-950">
            <Spark className="size-3" />
            Für dich
          </span>
        )}
        <AddressChip text={preview ? address(preview.url) : ""} active={!!preview} />
      </div>

      <div className="card-text mt-4">
        <p className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.14em]">
          <span className="text-amber">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-haze"> · {project.kind}</span>
        </p>
        <h3 id={titleId} className="mt-1.5 font-display text-[clamp(1.1rem,1.5vw,1.45rem)] font-semibold leading-snug tracking-[-0.01em] text-cream">
          {project.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-mist">{project.purpose}</p>
        <p className="mt-2 font-mono text-[0.7rem] uppercase leading-relaxed tracking-[0.1em] text-haze">
          <span className="sr-only">Technologien: </span>
          {project.tech.join(" · ")}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((link) => (
            <Pill
              key={link.url}
              href={link.url}
              external
              size="sm"
              tone={link === primary ? "amber" : "ghost"}
              icon={ICONS[link.type] || ArrowUpRight}
              hoverIcon={ArrowUpRight}
              label={link.label}
              srContext={project.title}
              {...previewProps(link)}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
