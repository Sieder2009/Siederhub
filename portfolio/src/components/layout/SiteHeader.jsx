import { useEffect, useRef } from "react";
import { useScrolled } from "../../hooks/useScrolled.js";
import { useStore } from "../../lib/store.js";
import { sectionStore } from "../../lib/sectionStore.js";
import VolleyballSVG from "../ball/VolleyballSVG.jsx";
import ExternalLink from "../ui/ExternalLink.jsx";
import MotionToggle from "./MotionToggle.jsx";

// The header: logo, three links and the motion toggle, on the same left edge
// as every heading (.page). Opaque once the page is scrolled, and it flips
// between night and day in the same frame as the page (no transition). The
// link of the section you are in carries a chalk underline (styles: .nav-link).
export default function SiteHeader({ profile }) {
  const scrolled = useScrolled();
  const section = useStore(sectionStore);
  const github = profile.socials.find((s) => s.id === "github")?.url;
  const current = (id) => (section === id ? "location" : undefined);
  const ref = useRef(null);

  // The act flip is a hard cut (the dive turns the page cream in one frame).
  // Links and the toggle ease their colours on hover, so for the two frames
  // around a flip nothing in the header eases (chrome.css [data-act-cut]):
  // no frame of night-coloured text on the cream bar.
  useEffect(() => {
    const header = ref.current;
    const html = document.documentElement;
    if (!header || typeof MutationObserver === "undefined") return;
    let raf = 0;
    const mo = new MutationObserver((records) => {
      // the act is rewritten on every section change: only a real flip cuts
      if (records[0].oldValue === html.getAttribute("data-act")) return;
      header.setAttribute("data-act-cut", "");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => header.removeAttribute("data-act-cut"))));
    });
    mo.observe(html, { attributes: true, attributeFilter: ["data-act"], attributeOldValue: true });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
      header.removeAttribute("data-act-cut");
    };
  }, []);

  return (
    <header
      ref={ref}
      className={`fixed inset-x-0 top-0 z-40 border-b ${
        scrolled ? "border-night-700 bg-night-950 day:border-ink/15 day:bg-cream" : "border-transparent"
      }`}
    >
      <div className="page flex h-16 items-center justify-between gap-3">
        <a href="#top" className="logo group flex h-10 items-center gap-2.5 rounded-tape pr-1 font-display text-lg font-semibold text-cream day:text-ink">
          <VolleyballSVG className="logo-ball size-6 shrink-0" />
          <span>{profile.name}</span>
          <span className="sr-only">, zum Seitenanfang</span>
        </a>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav aria-label="Hauptnavigation">
            <ul className="flex items-center">
              <li>
                <a href="#projekte" aria-current={current("projekte")} className="nav-link">
                  Projekte
                </a>
              </li>
              <li className="hidden sm:block">
                <a href="#werkzeug" aria-current={current("werkzeug")} className="nav-link">
                  Werkzeug
                </a>
              </li>
              {github && (
                <li>
                  <ExternalLink href={github} className="nav-link">
                    GitHub
                  </ExternalLink>
                </li>
              )}
            </ul>
          </nav>
          <MotionToggle />
        </div>
      </div>
    </header>
  );
}
