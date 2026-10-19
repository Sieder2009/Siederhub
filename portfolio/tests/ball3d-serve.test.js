// node --test   (npm test) — the serve as it appears on screen: tossed small
// at the top right, swept down-left onto the hero's ball spot, never leaving
// the viewport sideways; and the contact squash.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SQUASH,
  planServe,
  project,
  sampleServe,
  servePose,
  serveStart,
  springStep,
  squashKick,
} from "../src/lib/ballPhysics.js";

const CAMERA_Z = 10;
const FOV = 30;
const unitsPerPx = (h) => (2 * Math.tan(((FOV / 2) * Math.PI) / 180) * CAMERA_Z) / h;

// the hero's ball spot (viewport px, roughly where BallStage puts it) → world
const SCREENS = [
  { width: 1440, height: 900, spot: [360, 560] },
  { width: 960, height: 700, spot: [250, 450] },
  { width: 390, height: 844, spot: [195, 600] },
];

function serveOn({ width, height, spot }) {
  const k = unitsPerPx(height);
  const view = { width, height, unitsPerPx: k, cameraZ: CAMERA_Z };
  const pose = servePose(width);
  const start = serveStart({ ...pose, ...view });
  const target = [(spot[0] - width / 2) * k, (height / 2 - spot[1]) * k, 0];
  return { view, pose, plan: planServe({ start, target }) };
}

test("the toss tops out at the pose's apex, top right", () => {
  for (const screen of SCREENS) {
    const { view, pose, plan } = serveOn(screen);
    // the toss apex is at t = SERVE_TIMING.toss, tossHeight above the hand
    const apex = project([plan.start[0], plan.start[1] + 2.8, plan.start[2]], view);
    assert.ok(Math.abs(apex.x - pose.apex[0] * view.width) < 0.5, `apex x ${apex.x}`);
    assert.ok(Math.abs(apex.y - pose.apex[1] * view.height) < 0.5, `apex y ${apex.y}`);
    assert.ok(pose.apex[0] >= 0.74 && pose.apex[1] <= 0.13, "top right");
    assert.ok(apex.scale < 0.25, "small: far behind the page");
  }
});

test("the serve stays inside the viewport sideways and lands on the spot", () => {
  for (const screen of SCREENS) {
    const { view, plan } = serveOn(screen);
    let lastX = Infinity;
    for (let i = 0; i <= 400; i++) {
      const t = (i / 400) * plan.duration;
      const p = project(sampleServe(plan, t).pos, view);
      assert.ok(p.x >= 0 && p.x <= view.width, `x ${p.x.toFixed(1)} at ${t.toFixed(3)} s on ${view.width} px`);
      assert.ok(p.y < view.height, "never below the screen");
      // the flight only ever sweeps leftwards, over the letters
      if (t >= plan.hitT) {
        assert.ok(p.x <= lastX + 1e-6, "sweeps right to left");
        lastX = p.x;
      }
    }
    const end = project(sampleServe(plan, plan.duration).pos, view);
    assert.ok(Math.abs(end.x - screen.spot[0]) < 1e-6 && Math.abs(end.y - screen.spot[1]) < 1e-6);
  }
});

test("a squash kick bottoms out at its depth about 50 ms after the contact", () => {
  let q = 0;
  let v = squashKick(0.1);
  let min = 0;
  let tMin = 0;
  const dt = 1 / 1000;
  for (let t = dt; t < 0.9; t += dt) {
    const r = springStep(q, v, 0, SQUASH.omega, SQUASH.zeta, dt);
    q = r.x;
    v = r.v;
    if (q < min) {
      min = q;
      tMin = t;
    }
  }
  assert.ok(Math.abs(min + 0.1) < 1e-3, `depth ${min}`);
  assert.ok(tMin > 0.04 && tMin < 0.06, `peak at ${tMin}`);
  assert.ok(Math.abs(q) < 1e-3, "round again inside --dur-rally");
});
