// ============================================================================
// PROFIL — Name, Vorstellung und Social Links.
// Alles hier erscheint automatisch auf der Seite. Felder mit null werden
// sauber ausgeblendet (z. B. LinkedIn, solange du keinen Link einträgst).
// ============================================================================

export const profile = {
  // Anzeigename — z. B. deinen vollen Namen eintragen, wenn du magst.
  name: "Sieder",
  githubUser: "Sieder2009",
  role: "Informatiker · Apps & Websites",

  // Zwei Zeilen Überschrift im Hero (aus deinem GitHub-Profil-README).
  headline: ["Jeder Satz zählt.", "Jeder Commit auch."],
  // Das Wort, das in der Überschrift farbig hervorgehoben wird.
  highlight: "Commit",

  intro:
    "Ich entwickle native Apps mit Flutter und interaktive Websites mit React und Three.js — vom Trainings-Tracker für vier Plattformen bis zur begehbaren 3D-Welt. Jedes Projekt hier ist direkt verlinkt: live ansehen, herunterladen oder den Code lesen.",

  // Social Links: url: null = wird nicht angezeigt.
  socials: [
    { id: "github", label: "GitHub", url: "https://github.com/Sieder2009" },
    { id: "modrinth", label: "Modrinth", url: "https://modrinth.com/user/Sieder" },
    { id: "linkedin", label: "LinkedIn", url: null },
    { id: "x", label: "X / Twitter", url: null },
    { id: "discord", label: "Discord", url: null },
  ],
};
