import { test } from "node:test";
import assert from "node:assert/strict";
import { rowTravel, runwayHeight, scrollForCard, travelAt } from "../src/lib/rally.js";

test("rowTravel / runwayHeight: one screen plus the overflow", () => {
  assert.equal(rowTravel(3200, 1440), 1760);
  assert.equal(rowTravel(900, 1440), 0); // short row: nothing to travel
  assert.equal(runwayHeight(900, 1760), 2660);
});

test("travelAt: clamps to the runway", () => {
  assert.equal(travelAt(500, 1000, 1760), 0); // before the runway
  assert.equal(travelAt(1600, 1000, 1760), 600);
  assert.equal(travelAt(9000, 1000, 1760), 1760); // past it
});

const base = { cardWidth: 500, stageWidth: 1440, travel: 1760, runwayTop: 1000, pad: 32 };

test("scrollForCard: visible card → no scroll", () => {
  assert.equal(scrollForCard({ ...base, cardLeft: 100, offset: 0 }), null);
});

test("scrollForCard: card off the right edge → align its right edge", () => {
  // card at 2000…2500, stage shows 0…1440 → offset must become 2500 - 1440 + 32
  assert.equal(scrollForCard({ ...base, cardLeft: 2000, offset: 0 }), 1000 + 1092);
});

test("scrollForCard: card off the left edge → align its left edge, clamped at 0", () => {
  assert.equal(scrollForCard({ ...base, cardLeft: 600, offset: 1200 }), 1000 + 568);
  assert.equal(scrollForCard({ ...base, cardLeft: 10, offset: 300 }), 1000);
});

test("scrollForCard: never past the end of the runway", () => {
  assert.equal(scrollForCard({ ...base, cardLeft: 3000, offset: 0 }), 1000 + 1760);
});
