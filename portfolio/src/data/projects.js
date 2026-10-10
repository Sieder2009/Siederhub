// ============================================================================
// PROJEKTE — alles aus github.com/Sieder2009.
//
// Regel: Jedes Projekt bekommt als großen Button einen Link, über den man es
// sich direkt ansehen kann — live, im Browser spielbar oder als Produktseite —
// und zusätzlich den Quellcode. Jeder Link wurde im Browser geprüft
// (Stand 09.10.2026); ein toter Link kommt hier nicht rein.
//
// Felder:
//   repo      – Repo-Name auf GitHub (Sprachen + Datum kommen automatisch
//               aus data/github.json, aktualisieren mit: npm run sync:github)
//   tags      – steuern die Filter (siehe TAGS unten)
//   links     – primary: der große Button; more: weitere Links
//               type: live | play | download | code (Symbol + Badge der Karte)
//   image     – Datei in public/projects/ (1200×750 + eine -640-Variante)
// ============================================================================

export const TAGS = {
  flutter: "Flutter",
  react: "React",
  threejs: "Three.js",
  javascript: "JavaScript",
  "html-css": "HTML & CSS",
};

export const projects = [
  {
    id: "ironpeak",
    repo: "GymTracker",
    title: "Ironpeak Fitness",
    kind: "Flutter-App",
    purpose: "Mein Trainings-Begleiter für Android, iOS, Windows und macOS",
    summary:
      "Workout-Planer, Kraft-Tracker und Analyse-Tool in einer Codebase: 535 Übungen mit Muskel-Diagramm, DOTS-Score, Trends und Erfolge — alle Daten bleiben lokal auf dem Gerät. Jede Version wird per GitHub Actions für vier Plattformen gebaut.",
    tags: ["flutter"],
    tech: ["Flutter", "Dart", "GitHub Actions", "Inno Setup"],
    image: "gymtracker",
    imageAlt: "Drei Bildschirme der App Ironpeak Fitness: Kraft-Übersicht, Trainingstag mit Wochenplan und Analyse-Tab",
    highlight: true,
    links: {
      // Produktseite aus dem GymTracker-Repo, mit drei Rechnern der App zum Ausprobieren
      primary: { type: "live", label: "Produktseite ansehen", url: "https://ironpeak.siggidy.dev/" },
      more: [
        { type: "download", label: "Herunterladen", url: "https://github.com/Sieder2009/GymTracker/releases/latest" },
        { type: "code", label: "Quellcode", url: "https://github.com/Sieder2009/GymTracker" },
      ],
    },
  },
  {
    id: "affenmal",
    repo: "mc",
    title: "affenmal — Minecraft-Portfolio",
    kind: "3D-Website",
    purpose: "Portfolio für meine Minecraft-Welt, Bauwerke und Modrinth-Projekte",
    summary:
      "Scrollen führt durch ein Torii-Tor einen Pfad unter blühenden Kirschbäumen entlang — eine komplette 3D-Welt mit React Three Fiber, dazu ein 3D-Skin-Viewer, Galerie und Live-Daten von Modrinth.",
    tags: ["react", "threejs", "javascript"],
    tech: ["React 19", "React Three Fiber", "Three.js", "GSAP", "Lenis", "Vite"],
    image: "mc",
    imageAlt: "Startseite von affenmal: großer Schriftzug über einem roten Torii-Tor zwischen rosa Kirschbäumen",
    links: {
      primary: { type: "live", label: "Live ansehen", url: "https://mc.siggidy.dev/" },
      more: [{ type: "code", label: "Quellcode", url: "https://github.com/Sieder2009/mc" }],
    },
  },
  {
    id: "gymstats",
    repo: "Siederhub",
    title: "GYM STATS",
    kind: "Website",
    purpose: "Mein Trainings-Archiv: alle Pläne und echter Fortschritt in Zahlen",
    summary:
      "Sechs Trainingsplan-Versionen seit Juli 2024 mit interaktiven SVG-Diagrammen, Kino-Intro, Scroll-Effekten und einem Sternenfeld-Hintergrund — komplett ohne Framework gebaut.",
    tags: ["html-css", "javascript"],
    tech: ["HTML", "CSS", "JavaScript", "SVG", "Canvas"],
    image: "gymstats",
    imageAlt: "Startseite von GYM STATS: Überschrift „Jedes Gewicht. Jede Woche. Dokumentiert.“ über Kacheln mit Squat-, Bench- und Deadlift-Bestwerten",
    links: {
      primary: { type: "live", label: "Live ansehen", url: "https://sieder2009.github.io/Siederhub/" },
      more: [{ type: "code", label: "Quellcode", url: "https://github.com/Sieder2009/Siederhub" }],
    },
  },
  {
    id: "blockblast",
    repo: "BlockBlast",
    title: "Block Blast",
    kind: "Flutter-Spiel",
    purpose: "Nachbau des Puzzle-Spiels Block Blast als App",
    summary:
      "Blöcke per Drag & Drop auf ein 8×8-Feld ziehen, volle Reihen und Spalten abräumen. Mit Vorschau beim Ziehen, Punkte-Popups, Highscore und gespeichertem Spielstand — als Web-Build direkt im Browser spielbar.",
    tags: ["flutter"],
    tech: ["Flutter", "Dart", "Flutter Web", "shared_preferences"],
    image: "blockblast",
    imageAlt: "Block Blast mitten im Spiel: 8×8-Spielfeld mit bunten Blöcken, oben Punkte und Rekord 19",
    // Web-Build entsteht bei jedem Deploy frisch aus dem BlockBlast-Repo
    // (.github/workflows/pages.yml) und liegt unter /Siederhub/projects/blockblast/.
    links: {
      primary: { type: "play", label: "Im Browser spielen", url: "https://sieder2009.github.io/Siederhub/projects/blockblast/" },
      more: [{ type: "code", label: "Quellcode", url: "https://github.com/Sieder2009/BlockBlast" }],
    },
  },
  {
    id: "raspberrypi",
    repo: "Raspberrypi",
    title: "Raspberry Pi Website",
    kind: "Website",
    purpose: "Mehrsprachige Website rund um den Raspberry Pi",
    summary:
      "Komplette Website in drei Sprachen (DE/EN/IT) mit Shop und Warenkorb, Produktseiten, Hardware-, Software- und Geschichts-Seiten, Dark Mode und Cookie-Hinweis ohne Tracking.",
    tags: ["html-css", "javascript"],
    tech: ["HTML", "CSS", "JavaScript", "i18n"],
    image: "raspberrypi",
    imageAlt: "Startseite der Raspberry-Pi-Website: „Klein. Mächtig. Unendlich möglich.“ neben einem Raspberry Pi 5 auf einem Holztisch",
    links: {
      primary: { type: "live", label: "Live ansehen", url: "https://sieder2009.github.io/Raspberrypi/" },
      more: [{ type: "code", label: "Quellcode", url: "https://github.com/Sieder2009/Raspberrypi" }],
    },
  },
  {
    id: "terminal",
    repo: "Terminal",
    title: "CyberSpace Terminal",
    kind: "Website",
    purpose: "Die frühere Version meiner Website — im Hacker-Terminal-Look",
    summary:
      "Matrix-Regen, grüne Konsole und Mini-Spiele: 3 Gewinnt, 4 Gewinnt und Blackjack, dazu eine Schwarzes-Loch-Simulation mit Reglern. Läuft heute als Extras-Bereich von GYM STATS weiter.",
    tags: ["html-css", "javascript"],
    tech: ["HTML", "CSS", "JavaScript", "Canvas"],
    image: "terminal",
    imageAlt: "Grünes Terminal „CYBER_GAMES v1.0“ mit den Spielen 3 Gewinnt, 4 Gewinnt und Blackjack",
    links: {
      primary: { type: "live", label: "Live ansehen", url: "https://sieder2009.github.io/Siederhub/extras/" },
      more: [{ type: "code", label: "Quellcode", url: "https://github.com/Sieder2009/Terminal" }],
    },
  },
];
