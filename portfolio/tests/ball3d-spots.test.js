// node --test   (npm test) — the ball's spot choice while scrolling:
// hysteresis for the spot it is in, look-ahead past the dock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSpot } from "../src/lib/spots.js";

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
const VW = 800;
const VH = 600;
const dock = { name: "dock", rect: rect(740, 540, 56, 56) };

test("an entering spot beats the dock while scrolling towards it", () => {
  // half of it is still below the fold: on its own it does not count yet
  const beats = { name: "beats", rect: rect(500, 450, 200, 300) };
  assert.equal(pickSpot([beats, dock], VW, VH), dock);
  // scrolling down, the screen reaches 0.35 × its height further: it wins
  assert.equal(pickSpot([beats, dock], VW, VH, 0.6, { lead: 0.35 * VH }), beats);
  // scrolling up, away from it: the look-ahead is on the other edge
  assert.equal(pickSpot([beats, dock], VW, VH, 0.6, { lead: -0.35 * VH }), dock);
});

test("the spot the ball is in is kept down to keepShare", () => {
  const github = { name: "github", rect: rect(100, -110, 200, 200) }; // 45 % on screen
  assert.equal(pickSpot([github, dock], VW, VH, 0.6, { current: "github" }), github);
  // below keepShare it lets go
  const leaving = { name: "github", rect: rect(100, -140, 200, 200) }; // 30 %
  assert.equal(pickSpot([leaving, dock], VW, VH, 0.6, { current: "github" }), dock);
});

test("a spot the ball is not in needs the full minShare", () => {
  const github = { name: "github", rect: rect(100, -110, 200, 200) }; // 45 %
  assert.equal(pickSpot([github, dock], VW, VH, 0.6, { current: "beats" }), dock);
  assert.equal(pickSpot([github, dock], VW, VH, 0.6, { current: null }), dock);
});

test("the defaults behave exactly like the plain first-spot rule", () => {
  const cases = [
    [{ name: "github", rect: rect(100, 100, 200, 200) }, dock],
    [{ name: "github", rect: rect(700, 100, 200, 200) }, dock],
    [{ name: "beats", rect: rect(500, 450, 200, 300) }, dock],
    [{ name: "beats", rect: null }, { name: "dock", rect: null }],
    [{ name: "toolkit", rect: rect(0, 0, 100, 100) }, { name: "finale", rect: rect(0, 300, 100, 100) }],
    [],
  ];
  const plain = (cs) => cs.find((c) => c.rect && (c.name === "dock" || visible(c.rect) >= 0.6)) ?? null;
  for (const cs of cases) {
    assert.equal(pickSpot(cs, VW, VH), plain(cs));
    assert.equal(pickSpot(cs, VW, VH, 0.6, {}), plain(cs));
  }
});

// the plain on-screen share, written out independently of lib/spots.js
function visible(r) {
  const w = Math.max(0, Math.min(r.right, VW) - Math.max(r.left, 0));
  const h = Math.max(0, Math.min(r.bottom, VH) - Math.max(r.top, 0));
  return (w * h) / (Math.min(r.width, VW) * Math.min(r.height, VH));
}
