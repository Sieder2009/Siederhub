// Scroll speed in px/s (positive = scrolling down), shared by the 3D ball
// and the 2D fallback spin. Measured on the scroll events themselves, eased so
// a single wheel notch can't read as a huge spike, and fading out smoothly
// once scrolling stops — the ball's own inertia then takes it from there.

let lastY = 0;
let lastT = 0;
let velocity = 0;
const listeners = new Set();

function sample(now) {
  const idle = (now - lastT) / 1000;
  // hold the reading across the gap between two scroll events, then let it go
  return idle < 0.05 ? velocity : velocity * Math.exp(-(idle - 0.05) * 6);
}

function onScroll() {
  const now = performance.now();
  const y = window.scrollY;
  const dt = Math.max((now - lastT) / 1000, 1 / 240);
  const instant = (y - lastY) / dt;
  const current = sample(now);
  velocity = current + (instant - current) * (1 - Math.exp(-dt * 16));
  lastY = y;
  lastT = now;
  listeners.forEach((listener) => listener());
}

export function getScrollVelocity(now = performance.now()) {
  return listeners.size ? sample(now) : 0;
}

// Subscribing also wakes demand-driven render loops on every scroll event.
export function subscribeScroll(listener) {
  if (listeners.size === 0) {
    lastY = window.scrollY;
    lastT = performance.now();
    velocity = 0;
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("scroll", onScroll);
  };
}
