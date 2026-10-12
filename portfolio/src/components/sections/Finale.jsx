import { useInView } from "../../hooks/useInView.js";
import { useMagnetic } from "../../hooks/useMagnetic.js";
import Pill from "../ui/Pill.jsx";
import { ArrowUp, ArrowUpRight, GitHub, LinkIcon } from "../ui/icons.jsx";

// The closing scene (and the page's footer): the headline slides up out of
// its masks as it comes into view, the ball turns one last time in the spot
// beside it. Contact goes through the profiles that exist — no form, no
// e-mail address on the page.
export default function Finale({ profile }) {
  const [titleRef, inView] = useInView("0px 0px -18% 0px");
  const github = profile.socials.find((s) => s.id === "github")?.url;
  const modrinth = profile.socials.find((s) => s.id === "modrinth")?.url;
  const githubRef = useMagnetic(0.18);
  const modrinthRef = useMagnetic(0.18);
  const year = new Date().getFullYear();

  return (
    <footer id="kontakt" aria-labelledby="kontakt-title" className="relative z-10 overflow-hidden bg-cream text-ink">
      <div className="mx-auto grid max-w-[96rem] gap-12 px-4 pb-14 pt-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-12 lg:pb-20 lg:pt-28">
        <div>
          <p className="eyebrow on-day inline-flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-ember-deep" />
            06 — Kontakt
          </p>
          <h2
            id="kontakt-title"
            ref={titleRef}
            tabIndex={-1}
            data-anchor-focus
            className={`mt-6 font-tall text-[clamp(4.5rem,12.5vw,12.5rem)] leading-[0.86] tracking-[0.005em] focus:outline-none ${inView ? "is-in" : ""}`}
          >
            <span className="mask-line">
              <span style={{ "--i": 0 }}>Lust auf</span>
            </span>
            <span className="mask-line">
              <span style={{ "--i": 1 }} className="text-ember-deep">
                ein Match?
              </span>
            </span>
          </h2>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Eine neue Idee, eine Frage zu einem Projekt oder einfach Feedback? Du findest mich auf GitHub — dort liegt auch der ganze Code. Meine
            Minecraft-Projekte gibt es auf Modrinth.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {github && <Pill ref={githubRef} href={github} external tone="ink" icon={GitHub} hoverIcon={ArrowUpRight} label="Zu meinem GitHub" />}
            {modrinth && <Pill ref={modrinthRef} href={modrinth} external tone="ink-ghost" icon={LinkIcon} hoverIcon={ArrowUpRight} label="Modrinth" />}
          </div>
        </div>
        <div data-ball-spot="finale" aria-hidden="true" className="hidden aspect-square w-[min(22rem,34svh)] lg:block" />
      </div>

      <div className="border-t border-ink/15">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-3 py-6 pl-4 pr-20 text-xs leading-relaxed text-ink-soft sm:pl-8 sm:pr-24 md:flex-row md:items-center md:justify-between lg:pl-12 lg:pr-28">
          <p>
            © {year} {profile.name} · Gebaut mit React, Three.js, GSAP &amp; Tailwind CSS
          </p>
          <p>Keine Cookies, kein Tracking — Filter und Animations-Einstellung merkt sich nur dein Browser.</p>
          <a
            href="#top"
            className="inline-flex items-center gap-1.5 self-start rounded-full font-semibold text-ink underline decoration-ember-deep/60 underline-offset-4 transition-colors hover:text-ember-deep md:self-auto"
          >
            Nach oben
            <ArrowUp className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
