// ============================================================================
// The page as one rally. Every section says
//   title – what the browser tab reads while you are in it
//   act   – "night" (dark, starfield) or "day" (cream, after the dive)
//   spots – where the volleyball wants to be, in order of preference: the
//           first [data-ball-spot] of that name that is on screen wins;
//           "dock" is the corner button (see lib/spots.js)
// Order = document order. The ids are also the anchor targets (#projekte …).
// ============================================================================

export const SECTIONS = [
  { id: "top", title: "Sieder — Informatiker · Apps & Websites", act: "night", spots: ["hero"] },
  { id: "warum", title: "Jeder Satz zählt · Sieder", act: "night", spots: ["beats", "dock"] },
  { id: "projekte", title: "Projekte · Sieder", act: "night", spots: ["github", "dock"] },
  { id: "angriff", title: "Angriff! · Sieder", act: "night", spots: ["dive", "dock"] },
  { id: "werkzeug", title: "Werkzeug · Sieder", act: "day", spots: ["toolkit", "dock"] },
  { id: "kontakt", title: "Kontakt · Sieder", act: "day", spots: ["finale", "dock"] },
];

export const sectionById = (id) => SECTIONS.find((s) => s.id === id) || SECTIONS[0];
