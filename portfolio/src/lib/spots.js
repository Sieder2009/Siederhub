// Where the volleyball goes — pure functions, tested in plain Node
// (tests/spots.test.js). The 3D scene feeds them DOM rects every frame.

// How much of a rect is on screen (0 … 1) — measured against the part of it
// that could fit at all, so a spot bigger than the screen (the dive) that
// covers it completely counts as fully visible.
export function visibleShare(rect, vw, vh) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return 0;
  const w = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
  const h = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
  return (w * h) / (Math.min(rect.width, vw) * Math.min(rect.height, vh));
}

// candidates: [{ name, rect }] in order of preference (rect null = not on
// the page). A spot counts once at least `minShare` of it is on screen; the
// corner dock counts whenever it exists (it is fixed, always on screen).
// Returns the winning candidate or null (→ caller falls back to the hero).
export function pickSpot(candidates, vw, vh, minShare = 0.6) {
  for (const c of candidates) {
    if (!c.rect) continue;
    if (c.name === "dock") return c;
    if (visibleShare(c.rect, vw, vh) >= minShare) return c;
  }
  return null;
}
