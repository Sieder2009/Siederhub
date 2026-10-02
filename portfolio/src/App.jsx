import { profile } from "./data/profile.js";
import { projects, TAGS } from "./data/projects.js";
import SiteHeader from "./components/layout/SiteHeader.jsx";
import SiteFooter from "./components/layout/SiteFooter.jsx";
import Hero from "./components/hero/Hero.jsx";
import ProjectsSection from "./components/projects/ProjectsSection.jsx";
import BallLayer from "./components/BallLayer.jsx";
import BallDock from "./components/BallDock.jsx";

// Layering (z-index): arena canvas 0 · page content 10 · dock button 20 ·
// ball canvas 30 · header 40 · skip link 50. Both canvases ignore the
// pointer; the 3D scene hit-tests the cursor itself.
export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-full bg-amber px-5 py-3 font-semibold text-night-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Zum Inhalt springen
      </a>

      <SiteHeader profile={profile} />
      <BallLayer />

      <main id="main" tabIndex={-1} className="relative z-10 focus:outline-none">
        <Hero profile={profile} />
        <ProjectsSection projects={projects} tags={TAGS} githubUser={profile.githubUser} />
      </main>

      <SiteFooter profile={profile} />
      <BallDock />
    </>
  );
}
