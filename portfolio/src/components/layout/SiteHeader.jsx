import { useScrolled } from "../../hooks/useScrolled.js";
import VolleyballSVG from "../ball/VolleyballSVG.jsx";
import ExternalLink from "../ui/ExternalLink.jsx";
import { GitHub } from "../ui/icons.jsx";
import MotionToggle from "./MotionToggle.jsx";

const navLink =
  "group/link relative inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-mist transition-colors duration-200 hover:text-cream focus-visible:text-cream " +
  "after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-amber after:transition-transform after:duration-300 hover:after:scale-x-100 focus-visible:after:scale-x-100";

export default function SiteHeader({ profile }) {
  const scrolled = useScrolled();
  const github = profile.socials.find((s) => s.id === "github")?.url;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled ? "border-b border-night-700/80 bg-night-950/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#top" className="group flex items-center gap-2.5 rounded-full py-1 pr-2 font-display text-lg font-bold tracking-tight">
          <VolleyballSVG className="size-6 transition-transform duration-500 group-hover:rotate-[200deg] group-focus-visible:rotate-[200deg]" />
          <span>
            {profile.name.toLowerCase()}
            <span className="text-amber">.</span>
          </span>
          <span className="sr-only"> — zum Seitenanfang</span>
        </a>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav aria-label="Hauptnavigation">
            <ul className="flex items-center gap-0.5 sm:gap-1">
              <li>
                <a href="#projekte" className={navLink}>
                  Projekte
                </a>
              </li>
              {github && (
                <li>
                  <ExternalLink href={github} className={navLink}>
                    <GitHub className="size-4" />
                    <span className="hidden sm:inline">GitHub</span>
                    <span className="sr-only sm:hidden">GitHub</span>
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
