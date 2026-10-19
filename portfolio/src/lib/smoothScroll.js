import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motionStore } from "./motionStore.js";
import { finePointer } from "./capabilities.js";
import { sendBall } from "./ballBridge.js";
import { sectionStore } from "./sectionStore.js";
import { CINEMA_QUERY } from "../hooks/useMedia.js";

// One scroll source for the whole page. Lenis smooths wheel/trackpad input
// and drives GSAP's ticker, so every ScrollTrigger reads the very same
// position. It only runs where the full choreography runs: motion on, a
// mouse, and a screen of at least 960×700 (CINEMA_QUERY). Touch, small and
// short screens keep the native feel. The 3D scene reads window.scrollY on
// its own clock; Lenis moves the real scroll position, so it stays in step
// without any state passed around.
gsap.registerPlugin(ScrollTrigger);

let lenis = null;
const tick = (time) => lenis?.raf(time * 1000);

function start() {
  if (lenis) return;
  lenis = new Lenis({ autoRaf: false, lerp: 0.11, wheelMultiplier: 1 });
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

const cinema = typeof window !== "undefined" && window.matchMedia ? window.matchMedia(CINEMA_QUERY) : null;

export function syncSmoothScroll() {
  if (motionStore.get() === "on" && finePointer && cinema?.matches) start();
  else stop();
}

// resizing below (or back above) the cinema size hands scrolling back and forth
cinema?.addEventListener?.("change", syncSmoothScroll);

const easeOut = (t) => 1 - Math.pow(1 - t, 4);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// A smooth jump longer than this many screens is a page turn: an instant
// cut, so a nav click never scrubs through every scene in between.
const PAGE_TURN = 2.2;

// Jump without any glide. "instant", not "auto": while motion is on, html has
// scroll-behavior: smooth, and "auto" would follow it.
function jumpTo(y) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, behavior: "instant" });
}

// After a page turn the ball is put straight on its new spot instead of
// flying across. Which spot that is depends on the section it is in, and the
// section tracker only learns about the jump from its next
// IntersectionObserver report, so the snap waits for that report (the
// section changes) or, when the jump stayed inside one section, two frames.
let cancelSnap = null;
function snapBallAfterJump() {
  cancelSnap?.();
  let raf = 0;
  const snap = () => {
    cancelSnap();
    sendBall("snap");
  };
  const off = sectionStore.subscribe(snap);
  raf = requestAnimationFrame(() => (raf = requestAnimationFrame(snap)));
  cancelSnap = () => {
    off();
    cancelAnimationFrame(raf);
    cancelSnap = null;
  };
}

// Scroll the page to a y position: a short glide when motion is on (the
// longer the way, the longer the glide, 0.55 to 1 s), a page turn for long
// ways, and a plain jump otherwise.
export function scrollToY(y, { immediate = false } = {}) {
  const smooth = !immediate && motionStore.get() === "on";
  if (!smooth) return jumpTo(y);

  const vh = window.innerHeight || 1;
  const dy = Math.abs(y - window.scrollY);
  if (dy > PAGE_TURN * vh) {
    jumpTo(y);
    ScrollTrigger.update();
    snapBallAfterJump();
    return;
  }

  if (lenis) {
    const duration = clamp(0.45 + 0.25 * Math.sqrt(dy / vh), 0.55, 1.0);
    lenis.scrollTo(y, { duration, easing: easeOut, force: true });
  } else {
    window.scrollTo({ top: y, behavior: "smooth" });
  }
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

const SECTION_IDS = "#top, #warum, #projekte, #angriff, #werkzeug, #kontakt";
const ANCHORS = "article, li, [data-anchor-focus], section[id], footer";
const READ_LINE = 0.4; // the reader's eye: 40% down the screen

// Run a change that re-lays out the page (the motion toggle swaps pinned
// scenes for plain ones and back) and keep the reader where they were: the
// element under their eye stays at the same height on screen, and they never
// leave the section they were in. Never animates.
export function keepReadingPosition(change) {
  const line = window.innerHeight * READ_LINE;
  const probe = document.elementFromPoint(window.innerWidth / 2, line);
  const anchor = probe?.closest(ANCHORS) ?? null;
  const sectionId = probe?.closest(SECTION_IDS)?.id ?? null;
  const box = anchor?.getBoundingClientRect();
  const savedTop = box ? box.top : 0;
  // the anchor is a whole section (the eye is between its items): remember
  // how far through it the reader is instead, since its height will change
  const whole = !!anchor && anchor.id === sectionId && !!box && box.height > 0;
  const share = whole ? (line - box.top) / box.height : 0;

  change();

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const eye = window.innerHeight * READ_LINE;
      let y = null;
      if (anchor?.isConnected) {
        const now = anchor.getBoundingClientRect();
        y = whole ? now.top + window.scrollY + share * now.height - eye : now.top + window.scrollY - savedTop;
      }
      const section = sectionId ? document.getElementById(sectionId) : null;
      if (section) {
        const r = section.getBoundingClientRect();
        const top = r.top + window.scrollY;
        const bottom = r.bottom + window.scrollY;
        // landed outside the section (or nothing to measure): its top then
        if (y === null || y + eye < top || y + eye >= bottom) y = targetY(section);
      }
      if (y !== null) scrollToY(Math.max(0, y), { immediate: true });
    })
  );
}

// Same-page links (#projekte, #top …) go through scrollToTarget, so they
// glide with Lenis (or turn the page), respect each section's landing offset
// and carry focus. A hash in the URL on arrival is honoured once the page
// has laid out.
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
