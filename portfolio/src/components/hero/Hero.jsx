import { useMagnetic } from "../../hooks/useMagnetic.js";
import ExternalLink from "../ui/ExternalLink.jsx";
import { ArrowDown, GitHub } from "../ui/icons.jsx";
import { btnPrimary, btnSecondary } from "../ui/buttons.js";
import BallStage from "./BallStage.jsx";
import StackChips from "./StackChips.jsx";

// Staggered entrance; only runs while animations are allowed.
const RISE = "motion-on:animate-rise";
const delay = (ms) => ({ animationDelay: `${ms}ms` });

function Highlighted({ text, word }) {
  if (!word || !text.includes(word)) return text;
  const [before, after] = text.split(word);
  return (
    <>
      {before}
      <span className="bg-gradient-to-r from-amber to-ember bg-clip-text text-transparent">{word}</span>
      {after}
    </>
  );
}

export default function Hero({ profile }) {
  const primaryRef = useMagnetic();
  const secondaryRef = useMagnetic();
  const github = profile.socials.find((s) => s.id === "github")?.url;

  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate flex min-h-svh items-center overflow-hidden pb-20 pt-24 lg:pt-28">
      {/* CSS backdrop — also what 2D/reduced-motion visitors see behind the ball */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_42rem_at_78%_32%,rgb(255_179_71/0.09),transparent_62%),radial-gradient(48rem_36rem_at_8%_92%,rgb(127_156_255/0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_70%_40%,black,transparent)]" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.22fr_0.78fr] lg:gap-8">
        <div className="order-2 lg:order-1">
          <p className={RISE}>
            <span className="eyebrow inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-px w-8 bg-amber" />
              {profile.role}
            </span>
          </p>

          <h1
            id="hero-title"
            tabIndex={-1}
            className="mt-6 font-display text-[clamp(1.7rem,4.2vw,3.3rem)] font-bold leading-[1.06] tracking-[-0.02em] text-balance focus:outline-none"
          >
            {profile.headline.map((line, i) => (
              <span key={line} style={delay(110 + i * 110)} className={`block ${RISE}`}>
                <Highlighted text={line} word={profile.highlight} />
              </span>
            ))}
          </h1>

          <p style={delay(360)} className={`mt-6 max-w-xl text-base leading-relaxed text-mist sm:text-lg ${RISE}`}>
            Ich bin <strong className="font-semibold text-cream">{profile.name}</strong>. {profile.intro}
          </p>

          <div style={delay(470)} className={`mt-9 flex flex-wrap gap-3 ${RISE}`}>
            <a ref={primaryRef} href="#projekte" className={btnPrimary}>
              Projekte ansehen
              <ArrowDown className="size-4 transition-transform duration-300 group-hover/link:translate-y-0.5 group-focus-visible/link:translate-y-0.5" />
            </a>
            {github && (
              <ExternalLink ref={secondaryRef} href={github} className={btnSecondary}>
                <GitHub className="size-4" />
                GitHub-Profil
              </ExternalLink>
            )}
          </div>

          <div style={delay(580)} className={`mt-12 ${RISE}`}>
            <StackChips />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <BallStage />
        </div>
      </div>

      <a
        href="#projekte"
        className="group absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 rounded-full px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-haze transition-colors hover:text-cream focus-visible:text-cream sm:flex [@media(max-height:780px)]:hidden"
      >
        Scrollen
        <span aria-hidden="true" className="relative h-9 w-px overflow-hidden bg-night-700">
          <span className="absolute inset-x-0 top-0 h-1/2 bg-amber motion-on:animate-cue" />
        </span>
      </a>
    </section>
  );
}
