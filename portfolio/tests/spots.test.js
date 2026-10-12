import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSpot, visibleShare } from "../src/lib/spots.js";

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test("visibleShare: fully inside, half outside, off screen, empty", () => {
  assert.equal(visibleShare(rect(10, 10, 100, 100), 800, 600), 1);
  assert.equal(visibleShare(rect(-50, 0, 100, 100), 800, 600), 0.5);
  assert.equal(visibleShare(rect(0, 700, 100, 100), 800, 600), 0);
  assert.equal(visibleShare(rect(0, 0, 0, 100), 800, 600), 0);
  assert.equal(visibleShare(null, 800, 600), 0);
  // bigger than the screen and covering it: fully visible (the dive)
  assert.equal(visibleShare(rect(-500, -400, 1800, 1400), 800, 600), 1);
});

test("pickSpot: first spot that is on screen wins", () => {
  const github = { name: "github", rect: rect(100, 100, 200, 200) };
  const dock = { name: "dock", rect: rect(740, 540, 56, 56) };
  assert.equal(pickSpot([github, dock], 800, 600), github);
});

test("pickSpot: a spot still mostly off screen falls through to the dock", () => {
  const github = { name: "github", rect: rect(700, 100, 200, 200) }; // 50 % visible
  const dock = { name: "dock", rect: rect(740, 540, 56, 56) };
  assert.equal(pickSpot([github, dock], 800, 600), dock);
});

test("pickSpot: nothing usable → null (caller uses the hero)", () => {
  assert.equal(pickSpot([{ name: "beats", rect: null }, { name: "dock", rect: null }], 800, 600), null);
  assert.equal(pickSpot([], 800, 600), null);
});
