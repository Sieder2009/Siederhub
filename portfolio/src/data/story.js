// ============================================================================
// TEXTE der Abschnitte „Jeder Satz zählt“ (beats) und „Werkzeug“ (toolkit).
// Alles hier beschreibt nur, was in den Projekten steckt (siehe
// data/projects.js). Erfahrungs-Level werden nicht erfunden. Die Zahlen bei
// den Werkzeug-Karten rechnet die Seite selbst aus den Projekten aus.
// ============================================================================

import { projects } from "./projects.js";
import github from "./github.json";

export const beats = [
  {
    id: "plattformen",
    title: "Eine Codebase, vier Plattformen",
    text: "Ironpeak Fitness läuft auf Android, iOS, Windows und macOS, alles aus demselben Flutter-Code. Bei jeder neuen Version baut GitHub Actions automatisch alle vier.",
  },
  {
    id: "3d",
    title: "3D im Browser",
    text: "affenmal ist eine 3D-Welt mit React Three Fiber. Beim Scrollen läufst du durch ein Torii-Tor und unter Kirschbäumen einen Weg entlang. Auch der Volleyball hier ist WebGL, mit eigener Physik für Aufschlag und Drall.",
  },
  {
    id: "pur",
    title: "Ohne Framework, wenn es reicht",
    text: "GYM STATS ist nur HTML, CSS und JavaScript. Die Diagramme sind SVG, dazu gibt es ein Kino-Intro und ein Sternenfeld. Die Seite lädt nur, was sie braucht.",
  },
  {
    // the only place on the page that pitches "open it and read the code"
    id: "live",
    title: "Alles läuft. Der Code ist öffentlich.",
    text: "Jedes Projekt hier kannst du öffnen und ausprobieren. Den Code dazu findest du jeweils auf GitHub.",
  },
];

// short names for the evidence lines: drops a " — subtitle" suffix if a title
// ever gets one again (none has one right now)
const titlesWith = (tags) => projects.filter((p) => p.tags.some((t) => tags.includes(t))).map((p) => p.title.split(" — ")[0]);
const repoCount = Object.keys(github.repos || {}).length;

// tags: which project tags count for this card (and which visitor interest
// highlights it). evidence: what the card lists as proof.
export const toolkit = [
  {
    id: "flutter",
    title: "Flutter & Dart",
    tags: ["flutter"],
    evidence: titlesWith(["flutter"]),
    text: "Eine App und ein Spiel, jeweils aus einer Codebase. Die App läuft auf vier Systemen, das Spiel im Browser.",
  },
  {
    id: "react",
    title: "React & Three.js",
    tags: ["react", "threejs"],
    evidence: [...titlesWith(["react", "threejs"]), "Dieses Portfolio"],
    text: "Websites mit 3D-Szenen und eigenen Shadern, animiert über das Scrollen.",
  },
  {
    id: "javascript",
    title: "JavaScript",
    tags: ["javascript"],
    evidence: titlesWith(["javascript"]),
    text: "Zum Beispiel ein Warenkorb und ein paar Mini-Spiele. Meistens ganz ohne Framework.",
  },
  {
    id: "html-css",
    title: "HTML & CSS",
    tags: ["html-css"],
    evidence: titlesWith(["html-css"]),
    text: "Eine Seite in drei Sprachen mit Dark Mode, eine andere sieht aus wie ein Hacker-Terminal.",
  },
  {
    id: "actions",
    title: "GitHub Actions",
    tags: [],
    // pages.yml deploys GYM STATS, the Block Blast web build and this portfolio
    evidence: ["Ironpeak Fitness", "GYM STATS", "Block Blast", "Dieses Portfolio"],
    text: "Baut jede Ironpeak-Version für vier Plattformen und veröffentlicht diese Seite bei jedem Push.",
  },
  {
    id: "git",
    title: "Git & GitHub",
    tags: [],
    evidence: repoCount ? [`${repoCount} öffentliche Repositories`] : [],
    text: "Auch diese Seite liegt auf GitHub. Jeder Commit ist nachlesbar.",
  },
];
