import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createVolleyballMaterial } from "./volleyballMaterial.js";
import {
  SQUASH,
  clamp,
  damp,
  planServe,
  sampleServe,
  servePose,
  serveStart,
  smoothstep,
  spinStep,
  springStep,
  springStep3,
  squashKick,
} from "../../lib/ballPhysics.js";
import { getScrollVelocity, subscribeScroll } from "../../lib/scrollVelocity.js";
import { ANCHOR_SELECTOR, DOCK_SELECTOR, ballPlaceholder, ballSpotStore, ballStageOf, onBallCommand } from "../../lib/ballBridge.js";
import { sectionStore } from "../../lib/sectionStore.js";
import { sectionById } from "../../lib/sections.js";
import { pickSpot } from "../../lib/spots.js";
import { finePointer } from "../../lib/capabilities.js";
import { CAMERA_FOV, CAMERA_Z } from "./camera.js";

// The volleyball's own canvas sits ABOVE the page content (so the docked ball
// can float over the corner button) but never under text: it only ever rests
// in an empty spot box — the hero's [data-ball-anchor], a section's
// [data-ball-spot], or the corner dock — and travels between them as you
// scroll (lib/sections.js says which spot each section wants). Camera: fixed
// at z = 10 looking down -z, so the z = 0 plane maps linearly onto the
// viewport and DOM boxes convert directly.
//
// Riding: the ball sits at goal + offset, and only the offset is a spring.
// Scrolling moves the goal, so inside a section the ball travels rigidly
// with its box; a spot change turns the distance to the new box into the
// offset (and the ball's speed into the offset's speed), and the spring
// carries it over. The first frame it comes within ARRIVE radii of the new
// spot, it tells the page ("ball:arrive"), and it gives a little on contact.

const SCROLL_SPIN = 0.0105; // rad/s of roll per px/s of scroll speed
const MAX_SPIN = 30; // rad/s — faster just strobes
const IDLE_SPIN = 0.5; // rad/s drift while resting
const SPIN_INERTIA = 2.6; // how quickly the spin follows the scroll (1/s)
const IDLE_AXIS = new THREE.Vector3(0.35, 1, 0.12).normalize();

// offset spring [ω, ζ]: normal settles inside --dur-rally with ≈ 4 % overshoot;
// the dock a touch softer; the dive's spot is followed tightly
const RIDE = { normal: [9, 0.7], dock: [7, 0.74], tight: [16, 0.92] };
const ARRIVE = 0.15; // arrived: within this many radii of the goal
const LEAD = 0.35; // look-ahead while scrolling, in screen heights (lib/spots.js)
const LEAD_SPEED = 40; // px/s of scroll below which nothing is looked ahead
const DOCK_DELAY = 0.2; // s the dock must stay the pick before the ball goes there
const SNAP_WINDOW = 0.3; // s after a snap in which a late spot change still snaps
const IDLE_AFTER = 2.5; // s at rest off the hero before the bob and idle spin ease out
const FADE_IN = 10; // 1/s: an invisible ball (after the dive cut) fades in on its new spot
const WATCH_MS = 150; // asleep: how often the spot's box is checked for layout moves
const ZERO = [0, 0, 0];

const isInteractive = (el) => !!el?.closest?.("a, button, input, textarea, select, label, summary, [role='button']");
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

// world units per CSS pixel on the z = 0 plane
const unitsPerPixel = (height) => (2 * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2) * CAMERA_Z) / height;

// Where the ball should be this frame: the current section's preferred spot
// that is on screen (the spot it is in keeps counting a little longer, and
// while scrolling a spot just about to come in counts already), else the
// dock (once the hero is behind you), else the hero.
function findHome(anchorEl, dockEl, size, current, lead) {
  const dockActive = dockEl?.dataset.active === "true";
  const candidates = sectionById(sectionStore.get()).spots.map((name) => {
    let el = null;
    if (name === "dock") el = dockActive ? dockEl : null;
    else if (name === "hero") el = anchorEl;
    else el = document.querySelector(`[data-ball-spot="${name}"]`);
    return { name, el, rect: el ? el.getBoundingClientRect() : null };
  });
  const pick = pickSpot(candidates, size.width, size.height, 0.6, { current, lead });
  if (pick) return pick;
  if (dockActive) return { name: "dock", el: dockEl, rect: dockEl.getBoundingClientRect() };
  return { name: "hero", el: anchorEl, rect: anchorEl.getBoundingClientRect() };
}

function rectToWorld(r, size, k, fill) {
  return {
    x: (r.left + r.width / 2 - size.width / 2) * k,
    y: (size.height / 2 - (r.top + r.height / 2)) * k,
    radius: (Math.min(r.width, r.height) / 2) * k * fill,
  };
}

export default function BallWorld({ onFirstFrames }) {
  const invalidate = useThree((s) => s.invalidate);
  const group = useRef(null);
  const deform = useRef(null);
  const spinner = useRef(null);
  const ballMaterial = useMemo(createVolleyballMaterial, []);
  const tmp = useMemo(
    () => ({ target: new THREE.Vector3(), axis: new THREE.Vector3(), q: new THREE.Quaternion() }),
    []
  );

  const sim = useRef(null);
  if (!sim.current) {
    sim.current = {
      // a 2D ball was already showing: fade in on the spot, no second serve
      mode: ballPlaceholder.shown ? "rest" : "serve-pending",
      serve: null,
      serveGoal: null,
      t: 0,
      hit: false,
      pos: [0, 0, 0],
      vel: [0, 0, 0], // world velocity, whatever moves the ball
      offset: [0, 0, 0], // ride mode: pos = goal + offset
      offVel: [0, 0, 0],
      goalPrev: null,
      goalVel: [0, 0, 0], // how fast the spot itself moves (scroll, a catch)
      radius: 1,
      rOff: 0,
      rVel: 0,
      opacity: 0,
      fading: false,
      omega: new THREE.Vector3(),
      q: 0, // contact squash (lib/ballPhysics.js SQUASH)
      qv: 0,
      qAngle: Math.PI / 2,
      spotName: null,
      spotEl: null,
      dockSince: -1,
      arrivePending: false,
      snapPending: false,
      snapUntil: -1,
      still: 0,
      idle: 1,
      clock: 0,
      frames: 0,
      shadow: -1,
      stage: null,
      hovered: false,
      pointer: { x: -1e4, y: -1e4, free: false },
      screen: { x: -1e4, y: -1e4, r: 0 },
    };
  }

  // Asleep (nothing about the ball moves): a cheap watch on its spot's box,
  // so a layout change without a scroll (the rally filter, fonts) still
  // wakes the loop and the ball stays on its spot.
  const watch = useRef({ id: 0, el: null, box: null, section: null });
  const stopWatch = () => {
    const w = watch.current;
    if (w.id) clearInterval(w.id);
    w.id = 0;
  };
  const startWatch = (el) => {
    const w = watch.current;
    if (w.id || !el) return;
    const r = el.getBoundingClientRect();
    w.el = el;
    w.box = [r.left, r.top, r.width, r.height];
    w.section = sectionStore.get();
    w.id = setInterval(() => {
      const now = w.el.isConnected ? w.el.getBoundingClientRect() : null;
      const moved =
        !now ||
        Math.abs(now.left - w.box[0]) > 0.5 ||
        Math.abs(now.top - w.box[1]) > 0.5 ||
        Math.abs(now.width - w.box[2]) > 0.5 ||
        Math.abs(now.height - w.box[3]) > 0.5;
      if (moved || sectionStore.get() !== w.section) {
        stopWatch();
        invalidate();
      }
    }, WATCH_MS);
  };

  // squash on contact: `depth` of flattening along the direction (dx, dy)
  // on screen (world axes, y up); no direction → straight down, like a floor
  const squash = (depth, dx = 0, dy = -1) => {
    const s = sim.current;
    if (depth <= 0) return;
    // a new contact while still deformed keeps the axis it already has
    if (Math.abs(s.q) < 0.02) s.qAngle = Math.hypot(dx, dy) > 1e-6 ? Math.atan2(dy, dx) : Math.PI / 2;
    s.qv += squashKick(depth);
  };

  // DOM → scene: commands, scroll, pointer. Every one of them wakes the
  // demand-driven render loop.
  useEffect(() => {
    const s = sim.current;
    // dev-only probe for checks: window.__ball() → mode, spot, screen position, spin
    if (import.meta.env.DEV) {
      window.__ball = () => ({
        mode: s.mode,
        spot: s.spotName,
        t: s.t,
        screen: { ...s.screen },
        omega: s.omega.length(),
        opacity: s.opacity,
        q: s.q,
        asleep: !!watch.current.id,
      });
    }
    const spike = () => {
      if (s.mode !== "rest") return;
      s.offVel[1] -= 2.6 * s.radius;
      s.offVel[2] += 3.4 * s.radius;
      s.omega.x += 24;
      s.omega.y += (Math.random() - 0.5) * 10;
      squash(0.1);
      s.still = 0;
      invalidate();
    };
    const offServe = onBallCommand("serve", () => {
      s.mode = "serve-pending";
      invalidate();
    });
    const offSpike = onBallCommand("spike", spike);
    const offSnap = onBallCommand("snap", () => {
      s.snapPending = true;
      invalidate();
    });
    const offScroll = subscribeScroll(() => invalidate());

    // the cursor turns into a hand over the resting ball (clicking it hits it)
    const hover = () => {
      const p = s.pointer;
      const dx = p.x - s.screen.x;
      const dy = p.y - s.screen.y;
      const inside = finePointer && p.free && s.mode === "rest" && s.opacity > 0.9 && dx * dx + dy * dy < s.screen.r * s.screen.r;
      if (inside !== s.hovered) {
        s.hovered = inside;
        document.documentElement.classList.toggle("cursor-3d", inside);
      }
    };
    s.hover = hover;
    const onMove = (e) => {
      s.pointer.x = e.clientX;
      s.pointer.y = e.clientY;
      s.pointer.free = e.pointerType === "mouse" && !isInteractive(e.target);
      hover();
    };
    const onClick = (e) => {
      if (isInteractive(e.target) || s.mode !== "rest") return;
      const dx = e.clientX - s.screen.x;
      const dy = e.clientY - s.screen.y;
      if (dx * dx + dy * dy < s.screen.r * s.screen.r) spike();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("click", onClick);
    return () => {
      offServe();
      offSpike();
      offSnap();
      offScroll();
      stopWatch();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
      document.documentElement.classList.remove("cursor-3d");
      ballSpotStore.set(null);
      // back to the 2D ball (paused / failed): its shadow must not inherit our last value
      s.stage?.style.removeProperty("--ball-shadow");
      s.stage = null;
      s.shadow = -1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidate]);

  useEffect(() => () => ballMaterial.dispose(), [ballMaterial]);

  useFrame((state, rawDelta) => {
    const s = sim.current;
    const size = state.size;
    const anchorEl = document.querySelector(ANCHOR_SELECTOR);
    if (!anchorEl || !group.current || !deform.current || !spinner.current) return;
    stopWatch();
    // after sleeping, or a long hitch, don't let physics jump
    const dt = Math.min(rawDelta, 1 / 20);
    s.clock += dt;

    // ------------------------------------------------ where should it be?
    const k = unitsPerPixel(size.height);
    const dockEl = document.querySelector(DOCK_SELECTOR);
    const scroll = getScrollVelocity();
    const lead = Math.abs(scroll) > LEAD_SPEED ? Math.sign(scroll) * LEAD * size.height : 0;
    const snapping = s.snapPending || s.clock < s.snapUntil;
    let spot = findHome(anchorEl, dockEl, size, s.spotName, lead);
    // the corner is a last resort: the dock has to stay the pick for a moment
    // before the ball leaves its spot for it (no detours while sections hand over)
    if (spot.name === "dock" && s.spotName && s.spotName !== "dock" && !snapping) {
      if (s.dockSince < 0) s.dockSince = s.clock;
      if (s.clock - s.dockSince < DOCK_DELAY && s.spotEl?.isConnected) {
        const rect = s.spotEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) spot = { name: s.spotName, el: s.spotEl, rect };
      }
    } else s.dockSince = -1;

    const changed = spot.name !== s.spotName;
    // the spot it is leaving had hidden it (the dive's cut): whatever the
    // ball's own fade says, it is gone and must not cross the page
    const leftHidden = changed && Number(s.spotEl?.dataset.ballOpacity ?? 1) < 0.05;
    const docked = spot.name === "dock";
    // tight spots (the dive) follow their box closely instead of floating after it
    const tight = spot.el?.dataset.ballTight === "true";
    const [omega, zeta] = tight ? RIDE.tight : docked ? RIDE.dock : RIDE.normal;
    const home = rectToWorld(spot.rect, size, k, docked ? 0.72 : 1);
    const anchor = rectToWorld(anchorEl.getBoundingClientRect(), size, k, 1);
    // a spot may ask for the ball to fade (the dive hides it at its cut)
    const wantOpacity = spot.el?.dataset.ballOpacity != null ? Number(spot.el.dataset.ballOpacity) : 1;

    // idle float (bob + slow spin): always in the hero; elsewhere it eases out
    // once the ball has been still for a while, so the loop can sleep
    const idleWanted = spot.name === "hero" || s.still < IDLE_AFTER;
    s.idle = damp(s.idle, idleWanted ? 1 : 0, 1.6, dt);
    if (!idleWanted && s.idle < 1e-3) s.idle = 0;
    const bob = docked || tight ? 0 : Math.sin(s.clock * 1.25) * 0.045 * home.radius * s.idle;
    const goal = [home.x, home.y + bob, 0];

    // how fast the spot itself moves, so a ball leaving it keeps that speed
    if (!changed && s.goalPrev && rawDelta < 0.1) {
      for (let i = 0; i < 2; i++) s.goalVel[i] = damp(s.goalVel[i], (goal[i] - s.goalPrev[i]) / dt, 30, dt);
    } else s.goalVel = [0, 0, 0];
    const goalMoved = !s.goalPrev || Math.hypot(goal[0] - s.goalPrev[0], goal[1] - s.goalPrev[1]) > 1e-5;
    s.goalPrev = goal;

    // put the ball on its goal, at rest (snap, an invisible ball, first frame)
    const place = () => {
      s.pos = goal.slice();
      s.vel = [0, 0, 0];
      s.offset = [0, 0, 0];
      s.offVel = [0, 0, 0];
      s.radius = home.radius;
      s.rOff = 0;
      s.rVel = 0;
      s.q = 0;
      s.qv = 0;
    };

    // ------------------------------------------------------- spot change
    if (changed) {
      s.spotName = spot.name;
      s.spotEl = spot.el;
      s.still = 0;
      // the serve only ever lands in the hero: scrolled away mid-serve, the
      // ball just goes where it is wanted now
      if (s.mode === "serve" && spot.name !== "hero") s.mode = "rest";
      if (s.mode === "rest") {
        if (snapping || leftHidden || s.opacity < 0.05) {
          // never fly an invisible ball across the page (after the dive's
          // cut, or the very first frame): it appears on its new spot
          place();
          if (snapping) s.opacity = wantOpacity;
          else {
            s.opacity = 0;
            s.fading = true;
          }
        } else {
          s.offset = sub(s.pos, goal);
          s.offVel = s.vel.slice();
          s.rOff = s.radius - home.radius;
        }
        s.arrivePending = true;
      }
      // subscribers (dock, rally, finale) arm for this spot's "ball:arrive"
      ballSpotStore.set(spot.name);
    }

    if (s.snapPending) {
      s.snapPending = false;
      s.snapUntil = s.clock + SNAP_WINDOW;
      // a running serve ends in rest, right where it would have landed
      if (s.mode !== "rest") {
        s.mode = "rest";
        s.serve = null;
      }
      place();
      s.opacity = wantOpacity;
      s.fading = false;
      s.arrivePending = true;
    }

    // ------------------------------------------------------------- serve
    let landed = false;
    if (s.mode === "serve-pending") {
      if (spot.name !== "hero") {
        // the page opened further down: no serve, the ball fades in where it is wanted
        s.mode = "rest";
        place();
        s.fading = true;
        s.arrivePending = false;
      } else {
        // tossed far behind the page at the top right, beyond the wordmark;
        // the flight then sweeps down-left over the letters onto the spot
        const pose = servePose(size.width);
        const start = serveStart({ ...pose, width: size.width, height: size.height, unitsPerPx: k, cameraZ: CAMERA_Z });
        s.serve = planServe({ start, target: goal });
        s.serveGoal = goal.slice();
        s.mode = "serve";
        s.t = 0;
        s.hit = false;
        s.opacity = 0;
        s.fading = false;
        s.radius = home.radius;
        s.rOff = 0;
        s.rVel = 0;
        s.omega.set(-3, 0, 0);
        s.arrivePending = false; // the serve announces itself with "ball:land" only
      }
    }

    if (s.mode === "serve") {
      s.t += dt;
      const plan = s.serve;
      const sample = sampleServe(plan, s.t);
      // the page may move under the flight (a scroll, fonts swapping in):
      // steer it, more and more, onto where the anchor is now
      const f = clamp((s.t - plan.hitT) / (plan.duration - plan.hitT), 0, 1);
      s.pos = sample.pos.map((p, i) => p + (goal[i] - s.serveGoal[i]) * f);
      s.vel = sample.vel;
      s.opacity = smoothstep(0, 0.25, s.t);
      s.radius = home.radius;
      if (!s.hit && s.t >= plan.hitT) {
        // the hit: heavy topspin
        s.hit = true;
        s.omega.set(30, 2.5, 0);
      }
      if (sample.phase === "landed") {
        // received: most of the momentum is absorbed, the rest becomes a little give
        s.mode = "rest";
        s.vel = s.vel.map((v) => v * 0.18);
        s.offset = sub(s.pos, goal);
        s.offVel = s.vel.slice();
        landed = true;
        squash(0.12, sample.vel[0], sample.vel[1]);
      }
    } else if (s.mode === "rest") {
      // ---------------------------------------------------------- ride
      const r = springStep3(s.offset, s.offVel, ZERO, omega, zeta, dt);
      s.offset = r.pos;
      s.offVel = r.vel;
      s.pos = add(goal, s.offset);
      s.vel = [s.offVel[0] + s.goalVel[0], s.offVel[1] + s.goalVel[1], s.offVel[2]];
      // size follows a little faster than the position, without overshoot
      const rr = springStep(s.rOff, s.rVel, 0, omega * 1.25, 1, dt);
      s.rOff = rr.x;
      s.rVel = rr.v;
      s.radius = Math.max(home.radius + s.rOff, 1e-4);
      // a spot that hides the ball (the dive's cut) does it in that very frame
      if (wantOpacity < 0.05 && !s.fading) s.opacity = wantOpacity;
      else s.opacity = damp(s.opacity, wantOpacity, s.fading ? FADE_IN : tight ? 14 : 5, dt);
      if (s.fading && Math.abs(s.opacity - wantOpacity) < 0.005) s.fading = false;
    }

    // ------------------------------------------------- screen position
    const persp = CAMERA_Z / (CAMERA_Z - s.pos[2]);
    s.screen.x = size.width / 2 + (s.pos[0] * persp) / k;
    s.screen.y = size.height / 2 - (s.pos[1] * persp) / k;
    s.screen.r = (s.radius * persp) / k;
    s.hover?.();

    // ----------------------------------------------------------- contact
    if (landed) {
      // the page reacts to the landing (the hero's net tape and letters)
      window.dispatchEvent(new CustomEvent("ball:land", { detail: { x: s.screen.x, y: s.screen.y } }));
    }
    const offLen = len(s.offset);
    if (s.arrivePending && s.mode === "rest" && offLen < ARRIVE * home.radius) {
      s.arrivePending = false;
      // came in with some speed: it gives a little against its spot
      const speed = Math.hypot(s.offVel[0], s.offVel[1]) / Math.max(home.radius, 1e-3);
      squash(0.06 * smoothstep(1.5, 6, speed), s.offVel[0], s.offVel[1]);
      window.dispatchEvent(new CustomEvent("ball:arrive", { detail: { spot: spot.name, x: s.screen.x, y: s.screen.y } }));
    }

    // squash: M = Rz(θ) · S(1 + q, 1/√(1 + q), 1/√(1 + q)) · Rz(−θ)
    const sq = springStep(s.q, s.qv, 0, SQUASH.omega, SQUASH.zeta, dt);
    s.q = clamp(sq.x, SQUASH.min, SQUASH.max);
    s.qv = sq.v;
    if (Math.abs(s.q) < 1e-4 && Math.abs(s.qv) < 1e-3) s.q = s.qv = 0;
    const a = 1 + s.q;
    const b = 1 / Math.sqrt(a);
    const c = Math.cos(s.qAngle);
    const n = Math.sin(s.qAngle);
    deform.current.matrix.set(
      a * c * c + b * n * n, (a - b) * c * n, 0, 0,
      (a - b) * c * n, a * n * n + b * c * c, 0, 0,
      0, 0, b, 0,
      0, 0, 0, 1
    );
    deform.current.matrixWorldNeedsUpdate = true;

    // ------------------------------------------------------------- spin
    // idle drift around a tilted axis + scroll-driven roll around X: rolling
    // with the page — scroll faster, it spins faster; stop, and it coasts out.
    const roll = clamp(scroll * SCROLL_SPIN, -MAX_SPIN, MAX_SPIN);
    const idleSpin = docked || s.mode === "serve" ? 0 : IDLE_SPIN * s.idle;
    tmp.target.copy(IDLE_AXIS).multiplyScalar(idleSpin);
    tmp.target.x += roll;
    const lambda = s.mode === "serve" ? 0.9 : SPIN_INERTIA;
    const sx = spinStep(s.omega.x, tmp.target.x, lambda, dt);
    const sy = spinStep(s.omega.y, tmp.target.y, lambda, dt);
    const sz = spinStep(s.omega.z, tmp.target.z, lambda, dt);
    s.omega.set(sx.omega, sy.omega, sz.omega);
    tmp.axis.set(sx.angle, sy.angle, sz.angle);
    const angle = tmp.axis.length();
    if (angle > 1e-7) {
      tmp.q.setFromAxisAngle(tmp.axis.divideScalar(angle), angle);
      spinner.current.quaternion.premultiply(tmp.q);
    }

    // ------------------------------------------------------------ apply
    group.current.position.set(s.pos[0], s.pos[1], s.pos[2]);
    group.current.scale.setScalar(s.radius);
    const u = ballMaterial.uniforms;
    u.uOpacity.value = s.opacity;
    u.uBlur.value = smoothstep(12, 30, s.omega.length()) * 0.6;

    // ground shadow on the hero's floor line: full while the ball sits on its
    // spot, thinner as it floats up, gone while it is away. Written on the
    // stage, which holds both the anchor and .ball-shadow.
    const stage = ballStageOf(anchorEl);
    if (stage !== s.stage) {
      s.stage?.style.removeProperty("--ball-shadow");
      s.stage = stage;
      s.shadow = -1;
    }
    const away = Math.hypot(s.pos[0] - anchor.x, s.pos[1] - anchor.y, s.pos[2] * 0.25) / Math.max(anchor.radius, 1e-3);
    const lift = spot.name === "hero" ? bob / Math.max(home.radius, 1e-3) : 0;
    const shadow = clamp((1 - away / 1.2) * s.opacity * (1 - lift * 2.5), 0, 1);
    if (stage && Math.abs(shadow - s.shadow) > 0.004) {
      s.shadow = shadow;
      stage.style.setProperty("--ball-shadow", shadow.toFixed(3));
    }

    if (++s.frames === 3) onFirstFrames?.();

    // --------------------------------------------------------- sleep?
    // Nothing about the ball moves: stop rendering until the next scroll,
    // command or layout change wakes it. In the hero it floats, so it runs.
    const resting = s.mode === "rest" && offLen < 0.01 * home.radius && len(s.offVel) < 0.05 * home.radius && Math.abs(scroll) < 1;
    s.still = resting && !goalMoved ? s.still + dt : resting ? s.still : 0;
    const settled =
      s.mode === "rest" &&
      spot.name !== "hero" &&
      !s.arrivePending &&
      !snapping &&
      (docked || tight || s.idle === 0) &&
      !goalMoved &&
      offLen < 1e-4 &&
      len(s.offVel) < 1e-3 &&
      Math.abs(s.rOff) < 1e-4 &&
      Math.abs(s.rVel) < 1e-3 &&
      s.omega.lengthSq() < 1e-4 &&
      Math.abs(s.opacity - wantOpacity) < 1e-3 &&
      s.q === 0;
    if (settled) startWatch(spot.el);
    else invalidate();
  });

  return (
    <group ref={group}>
      <group ref={deform} matrixAutoUpdate={false}>
        <group ref={spinner}>
          <mesh material={ballMaterial}>
            <sphereGeometry args={[1, 64, 48]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
