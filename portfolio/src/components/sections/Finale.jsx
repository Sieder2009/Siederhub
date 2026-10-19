import { useEffect, useRef } from "react";
import { useStore } from "../../lib/store.js";
import { motionStore } from "../../lib/motionStore.js";
import { ballSpotStore, ballStatus } from "../../lib/ballBridge.js";
import VolleyballSVG from "../ball/VolleyballSVG.jsx";
import Tape from "../ui/Tape.jsx";
import { ArrowUp, ArrowUpRight } from "../ui/icons.jsx";

// Calls onArrive(x) once each time the 3D ball comes in to `spot`. x = viewport
// px from BallWorld's "ball:arrive", or null from the fallback timer.
function useBallArrival(spot, onArrive) {
  const cb = useRef(onArrive);
  cb.current = onArrive;
  useEffect(() => {
    let armed = false;
    let timer = 0;
    const fire = (x) => {
      if (!armed) return;
      armed = false;
      clearTimeout(timer);
      cb.current(x);
    };
    const onSpot = (s) => {
      clearTimeout(timer);
      armed = s === spot && ballStatus.get() === "ready" && motionStore.get() === "on";
      if (armed) timer = setTimeout(() => fire(null), 600); // no "ball:arrive" came: assume it is there
    };
    const onEvent = (e) => e.detail?.spot === spot && fire(e.detail.x ?? null);
    const off = ballSpotStore.subscribe(onSpot);
    window.addEventListener("ball:arrive", onEvent);
    return () => {
      off();
      clearTimeout(timer);
      window.removeEventListener("ball:arrive", onEvent);
    };
  }, [spot]);
}

// The closing scene (and the page's footer). The page opened with his serve;
// it ends by handing the serve to the visitor. The rally's last contact: the
// ball comes down on the court line beside the text and the line ripples out
// from where it touched, like the net tape under the wordmark. Nothing else
// here moves. Contact goes through the profiles that exist (no form, no
// e-mail address on the page).
export default function Finale({ profile }) {
  const github = profile.socials.find((s) => s.id === "github")?.url;
  const modrinth = profile.socials.find((s) => s.id === "modrinth")?.url;
  const year = new Date().getFullYear();
  const show2D = useStore(ballStatus) !== "ready";
  const spotRef = useRef(null);
  const tapeRef = useRef(null);

  useBallArrival("finale", (x) => {
    // no position from the scene (fallback timer): the ball rests over the spot's centre
    const r = spotRef.current?.getBoundingClientRect();
    tapeRef.current?.strike(x ?? (r ? r.left + r.width / 2 : window.innerWidth / 2), { amp: 5 });
  });

  return (
    <footer id="kontakt" aria-labelledby="kontakt-title" className="on-cream relative z-10 overflow-hidden bg-cream text-ink">
      <div className="page pt-[var(--space-section)] pb-14 lg:pb-20">
        <h2 id="kontakt-title" tabIndex={-1} data-anchor-focus className="font-display text-h2-xl text-right focus:outline-none lg:pl-[16.66%]">
          Dein
          <br />
          Aufschlag.
        </h2>

        <div className="mt-12 grid grid-cols-12 items-end gap-x-[var(--gutter)] gap-y-10">
          {/* the spot only exists on lg; below that the column would leave an empty grid row (plus its gap) */}
          <div className="col-span-12 hidden lg:col-span-4 lg:block">
            <div ref={spotRef} data-ball-spot="finale" aria-hidden="true" className="hidden aspect-square w-[min(16rem,26svh)] lg:block">
              {show2D && <VolleyballSVG className="finale-ball size-full" />}
            </div>
          </div>

          <div className="col-span-12 pb-10 lg:col-span-6 lg:col-start-7 lg:pb-12">
            <p className="max-w-xl text-body text-ink-soft">
              Fragen oder Feedback zu einem Projekt? Du findest mich auf GitHub. Meine Minecraft-Projekte liegen auf Modrinth.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              {github && (
                <a href={github} target="_blank" rel="noopener noreferrer" className="serve" data-tone="ink">
                  Zu meinem GitHub
                  <span className="sr-only"> (öffnet in neuem Tab)</span>
                  <ArrowUpRight className="" />
                </a>
              )}
              {modrinth && (
                <a href={modrinth} target="_blank" rel="noopener noreferrer" className="line-link">
                  Modrinth
                  <span className="sr-only"> (öffnet in neuem Tab)</span>
                  <ArrowUpRight className="" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* the court line: its centre (y = 12 of 24) is the row's bottom edge, where the ball rests */}
        <Tape ref={tapeRef} className="-mt-3 text-ink/40" style={{ "--tape-w": "2px" }} />
      </div>

      <div className="border-t border-ink/15">
        <div className="page">
          {/* the right padding keeps the text clear of the fixed corner dock */}
          <div className="flex flex-col gap-3 py-6 pr-16 text-meta text-ink-soft sm:pr-20 lg:flex-row lg:items-center lg:justify-between lg:gap-x-8 lg:pr-24">
            <p>
              © {year} {profile.name} · Gebaut mit React, Three.js, GSAP und Tailwind CSS
            </p>
            <p className="lg:max-w-[62ch]">
              Diese Seite setzt keine Cookies und trackt nichts. Was du angeklickt hast (für die Sortierung) und ob Animationen laufen, speichert nur dein Browser.
            </p>
            {/* nowrap: the arrow stays on the text's line when the row gets tight */}
            <a href="#top" className="line-link shrink-0 self-start whitespace-nowrap lg:self-auto" data-glyph="up">
              Nach oben
              <ArrowUp className="" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
