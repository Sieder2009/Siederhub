import { useLayoutEffect, useRef } from "react";
import { useStore } from "../../lib/store.js";
import { motionStore } from "../../lib/motionStore.js";
import { RAMP, coverCrop, toGlyphGrid } from "../../lib/glyphs.js";

// Hovering "Quellcode" scans the screenshot into code punctuation: a scan
// head sweeps across at an even, readable pace and leaves the picture redrawn
// as glyphs in the page's amber, cream and court blue. Leaving wipes the
// glyphs off again, right to left, gathering speed like something falling.
// Built on first use: the photo is shrunk to one pixel per glyph cell
// (same-origin image, so the canvas can read it), mapped to glyphs once per
// card size, then drawn column by column, only the columns that change each
// frame. Motion off: the glyphs just appear and disappear.

const CELL_W = 8; // CSS px per glyph cell
const CELL_H = 13;
const SCAN_MS = 900;
const WIPE_MS = 380;
const DELAY_MS = 80; // the address chip opens first; the scan follows a beat later
const TONES = ["rgba(127,156,255,0.55)", "#ffb347", "#f2efe8"]; // court · amber · cream
const BACKDROP = "rgba(6,10,20,0.94)";

const sineInOut = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
const power2In = (p) => p * p;

const images = new Map();
function loadImage(src) {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      })
    );
  }
  return images.get(src);
}

// posY: the photo's vertical object-position (0 top … 1 bottom), so the
// glyphs land on the same crop the photo shows
function buildGrid(img, w, h, posY) {
  const cols = Math.max(1, Math.ceil(w / CELL_W));
  const rows = Math.max(1, Math.ceil(h / CELL_H));
  const small = document.createElement("canvas");
  small.width = cols;
  small.height = rows;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  const { sx, sw, sh } = coverCrop(img.naturalWidth, img.naturalHeight, w, h);
  const sy = (img.naturalHeight - sh) * posY;
  sctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
  return toGlyphGrid(sctx.getImageData(0, 0, cols, rows).data, cols, rows);
}

export default function GlyphScan({ src, active }) {
  const canvasRef = useRef(null);
  const headRef = useRef(null);
  // grid + drawing context survive between hovers; `drawn` is how many
  // columns (from the left) currently show glyphs
  const state = useRef({ grid: null, key: "", ctx: null, height: 0, drawn: 0, raf: 0, timer: 0 });
  const motion = useStore(motionStore);

  // layout effect: the wipe must hold the canvas visible in the same frame
  // that drops "is-on", or the canvas would start fading out first
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const head = headRef.current;
    const st = state.current;
    if (!canvas) return;
    let cancelled = false;

    const moveHead = (cols, on) => {
      if (!head) return;
      head.style.opacity = on ? "1" : "0";
      head.style.transform = `translateX(${(cols * CELL_W).toFixed(1)}px)`;
    };

    // reveal columns [drawn, upTo)
    const drawColumns = (upTo) => {
      const { ctx, grid, height } = st;
      if (!ctx || upTo <= st.drawn) return;
      const { cols, rows, glyphs, tones } = grid;
      ctx.fillStyle = BACKDROP;
      ctx.fillRect(st.drawn * CELL_W, 0, (upTo - st.drawn) * CELL_W, height);
      for (let c = st.drawn; c < upTo; c++) {
        for (let r = 0; r < rows; r++) {
          const i = r * cols + c;
          const g = glyphs[i];
          if (!g) continue;
          ctx.fillStyle = TONES[tones[i]];
          ctx.fillText(RAMP[g], c * CELL_W + CELL_W / 2, r * CELL_H + 1);
        }
      }
      st.drawn = upTo;
    };

    // hide columns [downTo, drawn)
    const clearColumns = (downTo) => {
      const { ctx, height } = st;
      if (!ctx || downTo >= st.drawn) return;
      ctx.clearRect(downTo * CELL_W, 0, (st.drawn - downTo) * CELL_W, height);
      st.drawn = downTo;
    };

    // tween columns from `from` to `to` over `ms`; each frame calls step(at)
    const run = (from, to, ms, ease, step, done) => {
      const start = performance.now();
      const frame = (now) => {
        if (cancelled) return;
        const p = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
        step(from + (to - from) * ease(p), p < 1);
        if (p < 1) st.raf = requestAnimationFrame(frame);
        else done?.();
      };
      st.raf = requestAnimationFrame(frame);
    };

    const cleanup = () => {
      cancelled = true;
      cancelAnimationFrame(st.raf);
      clearTimeout(st.timer);
      delete canvas.dataset.wipe;
      if (head) head.style.opacity = "0";
    };

    // ------------------------------------------------------------ leaving
    if (!active) {
      if (!st.drawn) return;
      if (motion !== "on") {
        clearColumns(0);
        return;
      }
      const cols = st.grid.cols;
      const from = st.drawn;
      canvas.dataset.wipe = ""; // keeps the canvas visible while it clears
      run(
        from,
        0,
        Math.max(160, (WIPE_MS * from) / cols),
        power2In,
        (at, moving) => {
          clearColumns(Math.floor(at));
          moveHead(at, moving);
        },
        () => delete canvas.dataset.wipe
      );
      return cleanup;
    }

    // ------------------------------------------------------------ scanning in
    (async () => {
      const box = canvas.parentElement.getBoundingClientRect();
      if (box.width < 4 || box.height < 4) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const photo = canvas.parentElement.querySelector("img");
      const posY = photo ? (parseFloat(getComputedStyle(photo).objectPosition.split(" ")[1]) || 0) / 100 : 0;
      const key = `${src}|${Math.round(box.width)}x${Math.round(box.height)}|${dpr}|${posY}`;
      if (st.key !== key) {
        let img;
        try {
          img = await loadImage(src);
        } catch {
          return; // no picture, no scan; the link still works
        }
        if (cancelled) return;
        st.grid = buildGrid(img, box.width, box.height, posY);
        st.key = key;
        st.height = box.height;
        st.drawn = 0;
        canvas.width = Math.round(box.width * dpr); // also clears the canvas
        canvas.height = Math.round(box.height * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `600 ${CELL_H - 2}px "JetBrains Mono Variable", ui-monospace, monospace`;
        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        st.ctx = ctx;
      }

      const cols = st.grid.cols;
      if (motion !== "on") {
        drawColumns(cols);
        moveHead(cols, false);
        return;
      }
      // picks up wherever a wipe left off, at the same pace
      const from = st.drawn;
      st.timer = setTimeout(() => {
        run(from, cols, (SCAN_MS * (cols - from)) / cols, sineInOut, (at, moving) => {
          drawColumns(Math.ceil(at));
          moveHead(at, moving);
        });
      }, DELAY_MS);
    })();

    return cleanup;
  }, [active, src, motion]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className={`glyph-scan ${active ? "is-on" : ""}`} />
      <span ref={headRef} aria-hidden="true" className="glyph-head" />
    </>
  );
}
