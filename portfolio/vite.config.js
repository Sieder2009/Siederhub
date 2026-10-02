import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Same idea as the mc repo: `base: "./"` keeps every asset URL relative, so
// the build works at any path depth (e.g. sieder2009.github.io/Siederhub/portfolio/).
// The 3D scene (three + R3F) is split into its own lazily loaded chunk by the
// dynamic import in BallLayer.jsx — no manual chunk config needed for that.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    // The only chunk above Vite's 500 kB default is Scene3D (three + R3F,
    // ~250 kB gzip). It is loaded lazily after first paint and never at all
    // under reduced motion / Save-Data / no WebGL, so it is allowed to be big.
    chunkSizeWarningLimit: 1000,
  },
});
