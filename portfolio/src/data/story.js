// ============================================================================
// TEXTE der Abschnitte „Jeder Satz zählt“ (beats) und „Werkzeug“ (toolkit).
// Alles hier beschreibt nur, was in den Projekten wirklich steckt (siehe
// data/projects.js) — keine erfundenen Erfahrungs-Level. Die Zahlen bei den
// Werkzeug-Karten rechnet die Seite selbst aus den Projekten aus.
// ============================================================================

import { projects } from "./projects.js";
import github from "./github.json";

export const beats = [
  {
    id: "plattformen",
    title: "Eine Codebase, vier Plattformen",
    text: "Ironpeak Fitness läuft auf Android, iOS, Windows und macOS — mit Flutter aus demselben Code gebaut. Jede neue Version baut GitHub Actions automatisch für alle vier.",
  },
  {
    id: "3d",
    title: "3D direkt im Browser",
    text: "affenmal ist eine komplette 3D-Welt mit React Three Fiber: Beim Scrollen geht es durch ein Torii-Tor unter Kirschbäumen entlang. Auch der Volleyball hier ist echtes WebGL — mit eigener Physik für Aufschlag und Drall.",
  },
  {
    id: "pur",
    title: "Ohne Framework, wenn es reicht",
    text: "GYM STATS ist reines HTML, CSS und JavaScript: Diagramme aus SVG, ein Kino-Intro, ein Sternenfeld. Schnell, weil nichts mitgeladen wird, was die Seite nicht braucht.",
  },
  {
    id: "live",
    title: "Alles läuft. Der Code ist öffentlich.",
    text: "Jedes Projekt auf dieser Seite kannst du sofort öffnen — live, im Browser spielbar oder als Produktseite. Den Quellcode gibt es jeweils direkt daneben auf GitHub.",
  },
];

// short names for the evidence lines ("affenmal — Minecraft-Portfolio" → "affenmal")
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
    text: "Apps und Spiele aus einer Codebase — für Android, iOS, Windows, macOS und den Browser.",
  },
  {
    id: "react",
    title: "React & Three.js",
    tags: ["react", "threejs"],
    evidence: [...titlesWith(["react", "threejs"]), "Dieses Portfolio"],
    text: "Websites mit echten 3D-Szenen, eigenen Shadern und Animationen, die dem Scrollen folgen.",
  },
  {
    id: "javascript",
    title: "JavaScript",
    tags: ["javascript"],
    evidence: titlesWith(["javascript"]),
    text: "Vom Warenkorb bis zum Mini-Spiel — mit Framework oder ganz ohne.",
  },
  {
    id: "html-css",
    title: "HTML & CSS",
    tags: ["html-css"],
    evidence: titlesWith(["html-css"]),
    text: "Mehrsprachige Seiten mit Dark Mode — oder im Look eines Hacker-Terminals.",
  },
  {
    id: "actions",
    title: "GitHub Actions",
    tags: [],
    evidence: ["Ironpeak Fitness", "GYM STATS & dieses Portfolio"],
    text: "Baut jede Ironpeak-Version für vier Plattformen und veröffentlicht diese Seite bei jedem Push.",
  },
  {
    id: "git",
    title: "Git & GitHub",
    tags: [],
    evidence: repoCount ? [`${repoCount} öffentliche Repositories`] : [],
    text: "Alles versioniert, alles nachlesbar — jedes Projekt hier hat seinen Code auf GitHub.",
  },
];
