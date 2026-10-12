// Can this device draw the 3D scene at all? (Same checks as the mc repo's
// lib/world.js.) Whether it *should* right now also depends on the motion
// setting, which can change at runtime — see components/BallLayer.jsx.

// Testing aid: ?3d=force skips the performance-caveat check (headless
// browsers, VMs), ?3d=off always uses the 2D ball.
const override = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("3d") : null;

// failIfMajorPerformanceCaveat: software renderers (SwiftShader, llvmpipe,
// WARP — VMs, remote desktops, blocklisted GPUs) would crawl, so they get the
// 2D ball instead.
const supportsWebGL = (() => {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const options = override === "force" ? {} : { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext("webgl2", options) || canvas.getContext("webgl", options);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
})();

// Data-saver mode skips the scene: ~250 kB of 3D code nobody on a metered
// connection asked for.
const saveData = typeof navigator !== "undefined" && !!navigator.connection?.saveData;

export const canRender3D = override === "off" ? false : override === "force" ? true : supportsWebGL && !saveData;

// ?3d=force also keeps the scene alive when frames run slow (software
// renderers in automated checks would otherwise hand over to the 2D ball).
export const forced3D = override === "force";

// Phones and tablets: fewer particles, lower pixel ratio, no camera parallax.
export const liteMode =
  typeof window !== "undefined" &&
  (window.matchMedia("(max-width: 720px)").matches || window.matchMedia("(pointer: coarse)").matches);

export const finePointer = typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
