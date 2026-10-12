// Math for the pinned project row (components/sections/Rally.jsx) — pure, so
// it is tested in plain Node (tests/rally.test.js).
//
// The row sits in a sticky stage inside a tall "runway". Every pixel scrolled
// down the runway moves the row one pixel to the left, so the runway is one
// screen plus the row's travel, and scrollY - runwayTop IS the travel so far.

// How far the row has to move: its full width minus what the stage shows.
export function rowTravel(trackWidth, stageWidth) {
  return Math.max(0, Math.round(trackWidth - stageWidth));
}

export function runwayHeight(viewportHeight, travel) {
  return Math.round(viewportHeight + travel);
}

// Row offset (px, ≥ 0 = moved left) for a scroll position.
export function travelAt(scrollY, runwayTop, travel) {
  return Math.min(travel, Math.max(0, scrollY - runwayTop));
}

// Keyboard focus landed on a card that is (partly) off stage: the scroll
// position that brings it fully into view with the smallest move.
//   cardLeft/cardWidth – the card's box inside the row (unmoved)
//   offset             – the row's current offset (travelAt)
//   pad                – breathing room to keep at the stage edges
// Returns null when the card is already fully visible.
export function scrollForCard({ cardLeft, cardWidth, stageWidth, offset, travel, runwayTop, pad = 32 }) {
  const left = cardLeft - offset;
  const right = left + cardWidth;
  let next = offset;
  if (left < pad) next = cardLeft - pad;
  else if (right > stageWidth - pad) next = cardLeft + cardWidth - stageWidth + pad;
  else return null;
  next = Math.min(travel, Math.max(0, next));
  return runwayTop + next;
}
