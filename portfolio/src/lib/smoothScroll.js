import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motionStore } from "./motionStore.js";
import { finePointer } from "./capabilities.js";

// One scroll source for the whole page. Lenis smooths wheel/trackpad input
// (mouse users with motion on only — touch keeps the native feel) and drives
// GSAP's ticker, so every ScrollTrigger reads the very same position. The
// 3D scene reads window.scrollY on its own clock; Lenis moves the real
// scroll position, so it stays in step without any state passed around.
gsap.registerPlugin(ScrollTrigger);

let lenis = null;
const tick = (time) => lenis?.raf(time * 1000);

function start() {
  if (lenis) return;
  lenis = new Lenis({ autoRaf: false, lerp: 0.12, wheelMultiplier: 0.95 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
}

function stop() {
  if (!lenis) return;
  gsap.ticker.remove(tick);
  lenis.destroy();
  lenis = null;
}

export function syncSmoothScroll() {
  if (motionStore.get() === "on" && finePointer) start();
  else stop();
}

const easeOut = (t) => 1 - Math.pow(1 - t, 4);

// Scroll the page to a y position — smoothly when motion is on.
export function scrollToY(y, { immediate = false } = {}) {
  const smooth = !immediate && motionStore.get() === "on";
  if (lenis) lenis.scrollTo(y, { immediate: !smooth, duration: 1.15, easing: easeOut, force: true });
  else window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
}

// Where an anchor target lands: its top, minus its own scroll-margin-top.
function targetY(el) {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return el.getBoundingClientRect().top + window.scrollY - margin;
}

// Move keyboard focus along with the jump — to the section's heading if it
// has one marked, else to the section itself — without a second jump.
function focusTarget(el) {
  const focusEl = el.querySelector("[data-anchor-focus]") || el;
  if (!focusEl.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(focusEl.tagName)) {
    focusEl.setAttribute("tabindex", "-1");
  }
  focusEl.focus({ preventScroll: true });
}

export function scrollToTarget(el, { immediate = false, focus = true } = {}) {
  if (!el) return;
  scrollToY(targetY(el), { immediate });
  if (focus) focusTarget(el);
}

// Same-page links (#projekte, #top …) go through scrollToTarget, so they
// glide with Lenis, respect each section's landing offset and carry focus.
// A hash in the URL on arrival is honoured once the page has laid out.
export function initAnchors() {
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest?.('a[href^="#"]');
    if (!link) return;
    const id = decodeURIComponent(link.getAttribute("href").slice(1));
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollToTarget(el);
    if (window.location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
  };
  document.addEventListener("click", onClick);

  const initial = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (initial) {
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToTarget(initial, { immediate: true, focus: false })));
  }

  // late layout changes (web fonts swapping in) move every trigger
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => document.removeEventListener("click", onClick);
}

export { gsap, ScrollTrigger };
