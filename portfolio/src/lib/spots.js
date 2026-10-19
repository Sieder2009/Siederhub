// Where the volleyball goes — pure functions, tested in plain Node
// (tests/spots.test.js, tests/ball3d-spots.test.js). The 3D scene feeds them
// DOM rects every frame.

// How much of a rect lies inside the box top…bottom × left…right (0 … 1) —
// measured against the part of it that could fit at all, so a rect bigger
// than the box that covers it completely counts as fully visible.
function shareIn(rect, left, top, right, bottom) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return 0;
  const w = Math.max(0, Math.min(rect.right, right) - Math.max(rect.left, left));
  const h = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top));
  return (w * h) / (Math.min(rect.width, right - left) * Math.min(rect.height, bottom - top));
}

// How much of a rect is on screen (0 … 1); a spot bigger than the screen
// (the dive) that covers it completely counts as fully visible.
export function visibleShare(rect, vw, vh) {
  return shareIn(rect, 0, 0, vw, vh);
}

// candidates: [{ name, rect }] in order of preference (rect null = not on
// the page). A spot counts once at least `minShare` of it is on screen; the
// corner dock counts whenever it exists (it is fixed, always on screen).
// Returns the winning candidate or null (→ caller falls back to the hero).
//
//   current  – the spot the ball is in now: it stays valid down to
//              `keepShare`, so a spot sliding out does not flicker in and
//              out at the threshold (hysteresis)
//   lead     – px the viewport reaches ahead in the scroll direction (+ =
//              scrolling down, the bottom edge reaches further). A spot that
//              is about to come in already beats the dock, so the ball flies
//              straight on instead of detouring through the corner.
//
// With the defaults this is exactly the plain "first spot ≥ minShare" rule.
export function pickSpot(candidates, vw, vh, minShare = 0.6, { current = null, keepShare = 0.35, lead = 0 } = {}) {
  let ahead = null;
  for (const c of candidates) {
    if (!c.rect) continue;
    if (c.name === "dock") return ahead || c;
    const need = c.name === current ? Math.min(keepShare, minShare) : minShare;
    if (visibleShare(c.rect, vw, vh) >= need) return c;
    if (!ahead && lead !== 0) {
      const top = lead < 0 ? lead : 0;
      const bottom = lead > 0 ? vh + lead : vh;
      if (shareIn(c.rect, 0, top, vw, bottom) >= minShare) ahead = c;
    }
  }
  return ahead;
}
