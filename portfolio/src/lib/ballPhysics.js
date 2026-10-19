// Pure physics for the volleyball — no three.js, no React, so it runs (and is
// tested) in plain Node: tests/ballPhysics.test.js, tests/ball3d-*.test.js.
// Vectors are [x, y, z].
//
// Every integrator here is the *exact* solution over one time step, not an
// Euler approximation. That makes the ball behave identically at 30, 60 or
// 144 fps — a phone dropping frames gets the same motion, just fewer samples.

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const clamp01 = (v) => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// Exponential approach to a (constant) target, independent of frame rate.
export function damp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt);
}

// Angular velocity with inertia: omega approaches `target` exponentially
// (rate `lambda`). Also returns the exact angle swept during the step, so the
// ball's orientation does not depend on the frame rate either.
export function spinStep(omega, target, lambda, dt) {
  const e = Math.exp(-lambda * dt);
  return {
    omega: target + (omega - target) * e,
    angle: target * dt + ((omega - target) * (1 - e)) / lambda,
  };
}

// Damped spring toward `target` (angular frequency `omega`, damping ratio
// `zeta` ≤ 1), solved analytically for one step.
export function springStep(x, v, target, omega, zeta, dt) {
  const x0 = x - target;
  if (zeta >= 1) {
    const e = Math.exp(-omega * dt);
    const c = v + omega * x0;
    return { x: target + (x0 + c * dt) * e, v: (v - omega * c * dt) * e };
  }
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * dt);
  const cos = Math.cos(wd * dt);
  const sin = Math.sin(wd * dt);
  const b = (v + zeta * omega * x0) / wd;
  const xs = x0 * cos + b * sin;
  return {
    x: target + e * xs,
    v: e * (-zeta * omega * xs + wd * (b * cos - x0 * sin)),
  };
}

// Spring for a whole vector (same constants on every axis).
export function springStep3(pos, vel, target, omega, zeta, dt) {
  const p = [0, 0, 0];
  const v = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const r = springStep(pos[i], vel[i], target[i], omega, zeta, dt);
    p[i] = r.x;
    v[i] = r.v;
  }
  return { pos: p, vel: v };
}

// ---------------------------------------------------------------- the serve
// Constant acceleration `accel` (gravity plus the downward Magnus pull of
// topspin, folded into one vector): p(t) = p0 + v0·t + ½·a·t².
export function launchVelocity(from, to, accel, duration) {
  return from.map((f, i) => (to[i] - f - 0.5 * accel[i] * duration * duration) / duration);
}

export function ballistic(from, v0, accel, t) {
  return {
    pos: from.map((f, i) => f + v0[i] * t + 0.5 * accel[i] * t * t),
    vel: v0.map((v, i) => v + accel[i] * t),
  };
}

// Timing of a jump-float-style serve, in seconds.
export const SERVE_TIMING = {
  toss: 0.62, // ball rises from the server's hand to the apex
  hang: 0.09, // falls back a touch — the hit lands just after the apex
  flight: 1.05, // hit → arrives in its resting spot
};

// Plans a serve that starts at `start` (the server's hand, deep in the
// scene), rises `tossHeight`, gets hit and lands exactly on `target`.
//   gravity – pull during the toss (tuned so the apex arrives at `toss`)
//   pull    – downward acceleration during the flight (gravity + topspin dip)
export function planServe({ start, target, tossHeight = 2.8, pull = 18 }) {
  const { toss, hang, flight } = SERVE_TIMING;
  const gravity = (2 * tossHeight) / (toss * toss);
  const vUp = gravity * toss;
  const hitT = toss + hang;
  const hit = [start[0], start[1] + vUp * hitT - 0.5 * gravity * hitT * hitT, start[2]];
  const accel = [0, -pull, 0];
  const v0 = launchVelocity(hit, target, accel, flight);
  return { start, target, gravity, vUp, hit, hitT, accel, v0, duration: hitT + flight };
}

// Where the ball is `t` seconds into a planned serve.
export function sampleServe(plan, t) {
  if (t < plan.hitT) {
    return {
      phase: "toss",
      pos: [plan.start[0], plan.start[1] + plan.vUp * t - 0.5 * plan.gravity * t * t, plan.start[2]],
      vel: [0, plan.vUp - plan.gravity * t, 0],
    };
  }
  const tf = Math.min(t - plan.hitT, plan.duration - plan.hitT);
  const { pos, vel } = ballistic(plan.hit, plan.v0, plan.accel, tf);
  return { phase: t >= plan.duration ? "landed" : "flight", pos, vel };
}

// Where the server stands: far behind the page at the top right, beyond the
// wordmark, so the serve comes in small, rises a touch as it flies at you
// and dips down-left across S-I-E-D-E-R onto the ball's spot. Returns the
// toss apex in viewport fractions [x, y] and the server's depth z, phones
// to wide screens. The apex sits just under the header row, so the far
// ball never hangs behind the nav.
export function servePose(width) {
  const t = smoothstep(480, 1024, width);
  return { apex: [lerp(0.75, 0.82, t), lerp(0.12, 0.1, t)], z: lerp(-50, -72, t) };
}

// The server's hand, deep in the scene at depth `z`, placed so that the top
// of the toss projects exactly onto `apex` (viewport fractions). The camera
// sits at `cameraZ` looking down -z; `unitsPerPx` is the size of one CSS px
// on the z = 0 plane.
export function serveStart({ apex, width, height, unitsPerPx, cameraZ, z, tossHeight = 2.8 }) {
  const depth = (cameraZ - z) / cameraZ;
  return [
    (apex[0] * width - width / 2) * unitsPerPx * depth,
    (height / 2 - apex[1] * height) * unitsPerPx * depth - tossHeight,
    z,
  ];
}

// Where a point in the scene lands on screen (viewport CSS px) and how much a
// unit of size there is scaled by perspective.
export function project(pos, { width, height, unitsPerPx, cameraZ }) {
  const persp = cameraZ / (cameraZ - pos[2]);
  return {
    x: width / 2 + (pos[0] * persp) / unitsPerPx,
    y: height / 2 - (pos[1] * persp) / unitsPerPx,
    scale: persp,
  };
}

// ------------------------------------------------------------ contact squash
// The ball gives on contact: q is its stretch along the contact axis (−0.1 =
// 10 % flatter, the cross-section grows so the volume stays the same). A
// stiff, lightly damped spring: it bottoms out ≈ 50 ms after the contact,
// rebounds once, and is round again well inside --dur-rally.
export const SQUASH = { omega: 26, zeta: 0.32, min: -0.18, max: 0.16 };

// The velocity kick that makes a squash spring at rest bottom out at −depth.
export function squashKick(depth, o = SQUASH) {
  const wd = o.omega * Math.sqrt(1 - o.zeta * o.zeta);
  const tPeak = Math.atan2(wd, o.zeta * o.omega) / wd;
  const unit = (Math.exp(-o.zeta * o.omega * tPeak) * Math.sin(wd * tPeak)) / wd;
  return -depth / unit;
}
