// node --test   (npm test)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ballistic,
  launchVelocity,
  planServe,
  sampleServe,
  springStep,
  springStep3,
  spinStep,
  SERVE_TIMING,
} from "../src/lib/ballPhysics.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test("analytic flight lands exactly on target after the planned duration", () => {
  const from = [7.2, 1.1, -22];
  const to = [2.25, 0.35, 0];
  const accel = [0, -18, 0];
  const T = 0.95;
  const v0 = launchVelocity(from, to, accel, T);
  const { pos } = ballistic(from, v0, accel, T);
  pos.forEach((p, i) => close(p, to[i], 1e-12));
});

test("a planned serve ends on its target and starts at the server's hand", () => {
  const plan = planServe({ start: [6, -1.2, -22], target: [2.1, 0.4, 0] });
  sampleServe(plan, 0).pos.forEach((p, i) => close(p, plan.start[i]));
  const end = sampleServe(plan, plan.duration);
  assert.equal(end.phase, "landed");
  end.pos.forEach((p, i) => close(p, plan.target[i], 1e-9));
  // the toss peaks at exactly tossHeight above the hand, at SERVE_TIMING.toss
  close(sampleServe(plan, SERVE_TIMING.toss).pos[1], -1.2 + 2.8, 1e-9);
  // the toss/flight hand-over is continuous (no teleport at the hit)
  const before = sampleServe(plan, plan.hitT - 1e-7).pos;
  const after = sampleServe(plan, plan.hitT + 1e-7).pos;
  assert.ok(Math.hypot(before[0] - after[0], before[1] - after[1], before[2] - after[2]) < 1e-4);
});

// Steps a simulation for `total` seconds at a fixed frame rate.
function run(fps, total, init, step) {
  let state = init;
  const dt = 1 / fps;
  for (let t = 0; t < total - 1e-12; t += dt) state = step(state, Math.min(dt, total - t));
  return state;
}

test("spring settles to the same state at 30 fps and 144 fps", () => {
  for (const zeta of [0.55, 1]) {
    const step = (s, dt) => springStep(s.x, s.v, 1.5, 8, zeta, dt);
    const a = run(30, 1.2, { x: -2, v: 4 }, step);
    const b = run(144, 1.2, { x: -2, v: 4 }, step);
    close(a.x, b.x, 1e-9);
    close(a.v, b.v, 1e-9);
  }
});

test("vector spring converges onto its target", () => {
  const s = run(60, 4, { pos: [0, 0, -3], vel: [1, -2, 5] }, (s, dt) => springStep3(s.pos, s.vel, [1, 2, 0], 8, 0.62, dt));
  s.pos.forEach((p, i) => close(p, [1, 2, 0][i], 1e-6));
});

test("spin inertia: same angle and omega at 30 fps and 144 fps", () => {
  const step = (s, dt) => {
    const r = spinStep(s.omega, 0.6, 2.6, dt);
    return { omega: r.omega, angle: s.angle + r.angle };
  };
  const a = run(30, 2, { omega: 28, angle: 0 }, step);
  const b = run(144, 2, { omega: 28, angle: 0 }, step);
  close(a.omega, b.omega, 1e-9);
  close(a.angle, b.angle, 1e-9);
  // and the swept angle matches the closed form ∫ω dt
  const closed = 0.6 * 2 + ((28 - 0.6) * (1 - Math.exp(-2.6 * 2))) / 2.6;
  close(a.angle, closed, 1e-9);
});

test("faster scrolling means faster spin (velocity coupling is monotonic)", () => {
  const settle = (target) => run(60, 3, { omega: 0, angle: 0 }, (s, dt) => {
    const r = spinStep(s.omega, target, 2.6, dt);
    return { omega: r.omega, angle: s.angle + r.angle };
  });
  const slow = settle(4);
  const fast = settle(16);
  assert.ok(fast.omega > slow.omega && fast.angle > slow.angle);
});
