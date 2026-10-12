// The "source code" preview: a screenshot redrawn as code punctuation.
// Pure helpers (tested in tests/glyphs.test.js); the canvas work lives in
// components/sections/GlyphScan.jsx.

// light → dense
export const RAMP = " .,:;-=+*/<>{}[]#%@";

// The part of an image that object-fit: cover (anchored top, like the card
// photos' object-top) shows in a box — as a source rectangle.
export function coverCrop(iw, ih, bw, bh) {
  const scale = Math.max(bw / iw, bh / ih);
  const sw = bw / scale;
  const sh = bh / scale;
  return { sx: (iw - sw) / 2, sy: 0, sw, sh };
}

// rgba: one pixel per glyph cell (an image already shrunk to cols × rows).
// Brightness is stretched to the image's own range first, so dark UI
// screenshots still get the full range of glyphs.
// Returns per cell: glyph index into RAMP and a tone (0 dim, 1 accent, 2 light).
export function toGlyphGrid(rgba, cols, rows) {
  const n = cols * rows;
  const lum = new Float32Array(n);
  let min = 1;
  let max = 0;
  for (let i = 0; i < n; i++) {
    const l = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255;
    lum[i] = l;
    if (l < min) min = l;
    if (l > max) max = l;
  }
  const range = Math.max(max - min, 1e-3);
  const glyphs = new Uint8Array(n);
  const tones = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const t = (lum[i] - min) / range;
    glyphs[i] = Math.min(RAMP.length - 1, Math.floor(t * RAMP.length));
    tones[i] = t > 0.62 ? 2 : t > 0.3 ? 1 : 0;
  }
  return { cols, rows, glyphs, tones };
}
