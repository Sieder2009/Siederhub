import { useEffect } from "react";
import { profile } from "./data/profile.js";
import { projects, TAGS } from "./data/projects.js";
import { useStore } from "./lib/store.js";
import { motionStore } from "./lib/motionStore.js";
import { useSectionTracking } from "./lib/sectionStore.js";
import { initAnchors, syncSmoothScroll } from "./lib/smoothScroll.js";
import SiteHeader from "./components/layout/SiteHeader.jsx";
import Hero from "./components/sections/Hero.jsx";
import Beats from "./components/sections/Beats.jsx";
import Dive from "./components/sections/Dive.jsx";
import Toolkit from "./components/sections/Toolkit.jsx";
import Finale from "./components/sections/Finale.jsx";
import { beats, toolkit } from "./data/story.js";
import Rally from "./components/sections/Rally.jsx";
import BallLayer from "./components/BallLayer.jsx";
import BallDock from "./components/BallDock.jsx";
import ScrollProgress from "./components/motion/ScrollProgress.jsx";
import LiveFavicon from "./components/motion/LiveFavicon.jsx";
import PointerGlow from "./components/motion/PointerGlow.jsx";
import CalmNotice from "./components/motion/CalmNotice.jsx";

// Layering (z-index): sky canvas 0 · pointer glow 5 · page content 10 ·
// dock button 20 · ball canvas 30 · header & calm notice 40 · scroll
// progress 45 · skip link 50. Both canvases ignore the
// pointer; the 3D scene hit-tests the cursor itself.
export default function App() {
  const motion = useStore(motionStore);
  useSectionTracking();
  useEffect(() => initAnchors(), []);
  useEffect(() => syncSmoothScroll(), [motion]);

  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-full bg-amber px-5 py-3 font-semibold text-night-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Zum Inhalt springen
      </a>

      <ScrollProgress />
      <SiteHeader profile={profile} />
      <PointerGlow />
      <BallLayer />

      <main id="main" tabIndex={-1} className="relative z-10 focus:outline-none">
        <Hero profile={profile} />
        <Beats beats={beats} />
        <Rally projects={projects} tags={TAGS} githubUser={profile.githubUser} />
        <Dive />
        <Toolkit cards={toolkit} />
      </main>

      <Finale profile={profile} />
      <BallDock />
      <CalmNotice />
      <LiveFavicon />
    </>
  );
}
