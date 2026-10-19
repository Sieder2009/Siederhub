// ============================================================================
// PROJEKTE — alles aus github.com/Sieder2009.
//
// Regel: Jedes Projekt bekommt einen Hauptlink, über den man es ansehen kann
// (live, im Browser spielbar oder als Produktseite), und zusätzlich den
// Quellcode. Jeder Link wurde im Browser geprüft (Stand 09.10.2026); ein
// toter Link kommt hier nicht rein.
//
// Felder:
//   repo      – Repo-Name auf GitHub (Sprachen + Datum kommen automatisch
//               aus data/github.json, aktualisieren mit: npm run sync:github)
//   stat      – optional: eine Zahl aus der summary, groß auf der Karte
//   detail    – optional: ein, zwei Sätze aus der summary über dem Zweck
//   tags      – steuern die Filter (siehe TAGS unten)
//   links     – primary: der Hauptlink; more: weitere Links
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
    purpose: "Meine Trainings-App für Android, iOS, Windows und macOS",
    summary:
      "Plant Workouts, trackt Kraftwerte und wertet sie aus. Drin sind 535 Übungen mit Muskel-Diagramm, DOTS-Score, Trends und Erfolge. Alle Daten bleiben lokal auf dem Gerät. GitHub Actions baut jede Version für vier Plattformen.",
    stat: "535 Übungen",
    detail: "Mit Muskel-Diagramm und DOTS-Score. Alle Daten bleiben auf dem Gerät.",
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
    title: "affenmal",
    kind: "3D-Website",
    purpose: "Mein Minecraft-Portfolio mit Welt, Bauwerken und Modrinth-Projekten",
    summary:
      "Beim Scrollen läufst du durch ein Torii-Tor und unter blühenden Kirschbäumen einen Weg entlang. Gebaut mit React Three Fiber, dazu ein 3D-Skin-Viewer, eine Galerie und Live-Daten von Modrinth.",
    // no stat: there is no number in this project's own data
    detail: "Beim Scrollen läufst du durch ein Torii-Tor unter Kirschbäumen. Dazu ein 3D-Skin-Viewer und Live-Daten von Modrinth.",
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
    purpose: "Mein Trainings-Archiv mit allen Plänen und dem Fortschritt in Zahlen",
    summary:
      "Sechs Versionen meines Trainingsplans seit Juli 2024, mit interaktiven SVG-Diagrammen, Kino-Intro, Scroll-Effekten und Sternenfeld. Ohne Framework gebaut.",
    stat: "6 Planversionen",
    detail: "Seit Juli 2024, mit interaktiven SVG-Diagrammen. Ohne Framework gebaut.",
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
      "Blöcke per Drag & Drop auf ein 8×8-Feld ziehen, volle Reihen und Spalten abräumen. Mit Vorschau beim Ziehen, Punkte-Popups, Highscore und gespeichertem Spielstand. Läuft als Web-Build im Browser.",
    stat: "8×8-Feld",
    detail: "Mit Highscore und gespeichertem Spielstand.",
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
    purpose: "Website rund um den Raspberry Pi",
    summary:
      "Eine Website in drei Sprachen (DE/EN/IT) mit Shop und Warenkorb, Produktseiten, Hardware-, Software- und Geschichts-Seiten, Dark Mode und Cookie-Hinweis ohne Tracking.",
    stat: "3 Sprachen",
    detail: "Ein Shop mit Warenkorb, Dark Mode und ein Cookie-Hinweis ohne Tracking.",
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
    purpose: "Die alte Version meiner Website, im Hacker-Terminal-Look",
    summary:
      "Matrix-Regen, grüne Konsole und Mini-Spiele: 3 Gewinnt, 4 Gewinnt und Blackjack, dazu eine Schwarzes-Loch-Simulation mit Reglern. Läuft heute als Extras-Bereich von GYM STATS weiter.",
    stat: "3 Mini-Spiele",
    detail: "3 Gewinnt, 4 Gewinnt und Blackjack, dazu eine Schwarzes-Loch-Simulation.",
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
