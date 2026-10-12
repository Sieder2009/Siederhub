import { test } from "node:test";
import assert from "node:assert/strict";
import { RAMP, coverCrop, toGlyphGrid } from "../src/lib/glyphs.js";

test("coverCrop: same aspect → whole image", () => {
  assert.deepEqual(coverCrop(1200, 750, 480, 300), { sx: 0, sy: 0, sw: 1200, sh: 750 });
});

test("coverCrop: taller box → crops the sides, keeps the top", () => {
  const c = coverCrop(1200, 750, 300, 300);
  assert.equal(c.sy, 0);
  assert.equal(c.sh, 750);
  assert.equal(c.sw, 750);
  assert.equal(c.sx, 225);
});

test("toGlyphGrid: darkest → space, brightest → densest glyph, stretched", () => {
  // three cells: dark, mid, bright (only a narrow range → still full ramp)
  const rgba = new Uint8ClampedArray([40, 40, 40, 255, 70, 70, 70, 255, 100, 100, 100, 255]);
  const { glyphs, tones } = toGlyphGrid(rgba, 3, 1);
  assert.equal(RAMP[glyphs[0]], " ");
  assert.equal(glyphs[2], RAMP.length - 1);
  assert.ok(glyphs[1] > glyphs[0] && glyphs[1] < glyphs[2]);
  assert.deepEqual([...tones], [0, 1, 2]);
});

test("toGlyphGrid: a flat image does not divide by zero", () => {
  const rgba = new Uint8ClampedArray([128, 128, 128, 255, 128, 128, 128, 255]);
  const { glyphs } = toGlyphGrid(rgba, 2, 1);
  assert.deepEqual([...glyphs], [0, 0]);
});
