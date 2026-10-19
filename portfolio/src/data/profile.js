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
    "Ich baue Apps mit Flutter und Websites mit React und Three.js. Zum Beispiel Ironpeak, eine Trainings-App mit 535 Übungen.",

  // Social Links: url: null = wird nicht angezeigt.
  socials: [
    { id: "github", label: "GitHub", url: "https://github.com/Sieder2009" },
    { id: "modrinth", label: "Modrinth", url: "https://modrinth.com/user/Sieder" },
    { id: "linkedin", label: "LinkedIn", url: null },
    { id: "x", label: "X / Twitter", url: null },
    { id: "discord", label: "Discord", url: null },
  ],
};
