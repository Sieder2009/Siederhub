import { createStore } from "./store.js";
import { motionStore } from "./motionStore.js";
import { canRender3D } from "./capabilities.js";

// The handshake between the page (hero buttons, dock, fallback ball) and the
// lazily loaded 3D scene. This small module ships in the main bundle; the
// scene chunk imports the very same instance.

// "off"      – 3D not wanted (motion paused, no WebGL, Save-Data) → 2D ball
// "pending"  – 3D wanted, waiting for the browser to go idle after first paint
// "loading"  – 3D chunk is being fetched / compiled
// "ready"    – the 3D ball is drawing
// "failed"   – WebGL threw, lost its context or ran too slow → 2D ball
//
// The starting value must already be right on the very first render: starting
// at "off" would flash the 2D ball for one frame — and mark it as shown, which
// cancels the serve (see ballPlaceholder below).
export const ballStatus = createStore(motionStore.get() === "on" && canRender3D ? "pending" : "off");

const commands = new EventTarget();

// "serve" – replay the serve from the hero
// "spike" – hit the ball (the dive's contact)
// "snap"  – put the ball straight onto its current spot, at rest: after a
//           long jump (lib/smoothScroll.js) it is already there instead of
//           flying across every scene in between
export function sendBall(command) {
  commands.dispatchEvent(new Event(command));
}

export function onBallCommand(command, listener) {
  commands.addEventListener(command, listener);
  return () => commands.removeEventListener(command, listener);
}

// Set when the 2D ball was already on screen while the 3D chunk loaded (slow
// network). The 3D ball then fades in on the spot instead of serving in from
// the far court — no second ball flying in next to the first. Setting
// `shown` (BallStage does) also tells subscribers.
let placeholderShown = false;
const placeholderListeners = new Set();
export const ballPlaceholder = {
  get shown() {
    return placeholderShown;
  },
  set shown(value) {
    if (placeholderShown === !!value) return;
    placeholderShown = !!value;
    placeholderListeners.forEach((listener) => listener(placeholderShown));
  },
  subscribe(listener) {
    placeholderListeners.add(listener);
    return () => placeholderListeners.delete(listener);
  },
};

// Which spot the 3D ball is in right now ("hero", "dock", "github" …, see
// lib/sections.js) — null while there is no 3D ball. The dock shows a plain
// arrow while the ball is away.
export const ballSpotStore = createStore(null);

// DOM hooks the scene positions itself against.
export const ANCHOR_SELECTOR = "[data-ball-anchor]";
export const DOCK_SELECTOR = "[data-ball-dock]";

// The hero's ball stage: it holds both the anchor and the ground shadow
// (.ball-shadow, the anchor's sibling), so --ball-shadow is written here,
// where the shadow inherits it.
export function ballStageOf(anchor) {
  return anchor ? anchor.closest("[data-ball-stage]") ?? anchor.parentElement : null;
}
