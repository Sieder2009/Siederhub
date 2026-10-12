import { useEffect, useRef } from "react";
import { useStore } from "../../lib/store.js";
import { motionStore } from "../../lib/motionStore.js";
import { RAMP, coverCrop, toGlyphGrid } from "../../lib/glyphs.js";

// Hovering "Quellcode" scans the screenshot into code punctuation: a scan
// head sweeps across and leaves the picture redrawn as glyphs in the page's
// amber, cream and court blue. Built on first use: the photo is shrunk to
// one pixel per glyph cell (same-origin image, so the canvas can read it),
// mapped to glyphs once per card size, then drawn column by column — only
// the newly revealed columns each frame. Motion off: the glyphs just appear.

const CELL_W = 8; // CSS px per glyph cell
const CELL_H = 13;
const SCAN_MS = 720;
const TONES = ["rgba(127,156,255,0.55)", "#ffb347", "#f2efe8"]; // court · amber · cream

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

function buildGrid(img, w, h) {
  const cols = Math.max(1, Math.ceil(w / CELL_W));
  const rows = Math.max(1, Math.ceil(h / CELL_H));
  const small = document.createElement("canvas");
  small.width = cols;
  small.height = rows;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  const { sx, sy, sw, sh } = coverCrop(img.naturalWidth, img.naturalHeight, w, h);
  sctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
  return toGlyphGrid(sctx.getImageData(0, 0, cols, rows).data, cols, rows);
}

export default function GlyphScan({ src, active }) {
  const canvasRef = useRef(null);
  const headRef = useRef(null);
  const state = useRef({ grid: null, key: "", raf: 0 });
  const motion = useStore(motionStore);

  useEffect(() => {
    const canvas = canvasRef.current;
    const head = headRef.current;
    const st = state.current;
    if (!canvas || !active) return;
    let cancelled = false;

    (async () => {
      const box = canvas.parentElement.getBoundingClientRect();
      if (box.width < 4 || box.height < 4) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const key = `${src}|${Math.round(box.width)}x${Math.round(box.height)}|${dpr}`;
      if (st.key !== key) {
        let img;
        try {
          img = await loadImage(src);
        } catch {
          return; // no picture, no scan — the button still works
        }
        if (cancelled) return;
        st.grid = buildGrid(img, box.width, box.height);
        st.key = key;
        canvas.width = Math.round(box.width * dpr);
        canvas.height = Math.round(box.height * dpr);
      }

      const { cols, rows, glyphs, tones } = st.grid;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      ctx.font = `600 ${CELL_H - 2}px "JetBrains Mono Variable", ui-monospace, monospace`;
      ctx.textBaseline = "top";
      ctx.textAlign = "center";

      let drawn = 0;
      const drawColumns = (upTo) => {
        if (upTo <= drawn) return;
        const x0 = drawn * CELL_W;
        ctx.fillStyle = "rgba(6,10,20,0.94)";
        ctx.fillRect(x0, 0, (upTo - drawn) * CELL_W, box.height);
        for (let c = drawn; c < upTo; c++) {
          for (let r = 0; r < rows; r++) {
            const i = r * cols + c;
            const g = glyphs[i];
            if (!g) continue;
            ctx.fillStyle = TONES[tones[i]];
            ctx.fillText(RAMP[g], c * CELL_W + CELL_W / 2, r * CELL_H + 1);
          }
        }
        drawn = upTo;
      };

      if (motion !== "on") {
        drawColumns(cols);
        if (head) head.style.opacity = "0";
        return;
      }

      const start = performance.now();
      const frame = (now) => {
        if (cancelled) return;
        const p = Math.min(1, (now - start) / SCAN_MS);
        const eased = 1 - Math.pow(1 - p, 3);
        drawColumns(Math.ceil(eased * cols));
        if (head) {
          head.style.opacity = p < 1 ? "1" : "0";
          head.style.transform = `translateX(${(eased * box.width).toFixed(1)}px)`;
        }
        if (p < 1) st.raf = requestAnimationFrame(frame);
      };
      st.raf = requestAnimationFrame(frame);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(st.raf);
      if (head) head.style.opacity = "0";
    };
  }, [active, src, motion]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className={`glyph-scan ${active ? "is-on" : ""}`} />
      <span ref={headRef} aria-hidden="true" className="glyph-head" />
    </>
  );
}
