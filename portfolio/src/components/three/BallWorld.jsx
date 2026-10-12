import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createVolleyballMaterial } from "./volleyballMaterial.js";
import { clamp, damp, planServe, sampleServe, smoothstep, spinStep, springStep3 } from "../../lib/ballPhysics.js";
import { getScrollVelocity, subscribeScroll } from "../../lib/scrollVelocity.js";
import { ANCHOR_SELECTOR, DOCK_SELECTOR, ballPlaceholder, ballSpotStore, onBallCommand } from "../../lib/ballBridge.js";
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

const SERVER_Z = -40; // the server stands behind the far baseline (arena: net at z = -28)
const SCROLL_SPIN = 0.0105; // rad/s of roll per px/s of scroll speed
const MAX_SPIN = 30; // rad/s — faster just strobes
const IDLE_SPIN = 0.5; // rad/s drift while resting in the hero
const SPIN_INERTIA = 2.6; // how quickly the spin follows the scroll (1/s)
const IDLE_AXIS = new THREE.Vector3(0.35, 1, 0.12).normalize();
const TRAIL = 14;

const isInteractive = (el) => !!el?.closest?.("a, button, input, textarea, select, label, summary, [role='button']");

// world units per CSS pixel on the z = 0 plane
const unitsPerPixel = (height) => (2 * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2) * CAMERA_Z) / height;

// Where the ball should be this frame: the current section's preferred spot
// that is on screen, else the dock (once the hero is behind you), else the hero.
function findHome(anchorEl, dockEl, size) {
  const dockActive = dockEl?.dataset.active === "true";
  const candidates = sectionById(sectionStore.get()).spots.map((name) => {
    let el = null;
    if (name === "dock") el = dockActive ? dockEl : null;
    else if (name === "hero") el = anchorEl;
    else el = document.querySelector(`[data-ball-spot="${name}"]`);
    return { name, el, rect: el ? el.getBoundingClientRect() : null };
  });
  const pick = pickSpot(candidates, size.width, size.height);
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

function boxToWorld(el, size, k, fill) {
  const r = el.getBoundingClientRect();
  return {
    x: (r.left + r.width / 2 - size.width / 2) * k,
    y: (size.height / 2 - (r.top + r.height / 2)) * k,
    radius: (Math.min(r.width, r.height) / 2) * k * fill,
  };
}

// Soft glowing discs left behind by a fast ball — cheap motion blur.
function createTrailMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFocal: { value: 1 }, uColor: { value: new THREE.Color("#ffd08a") } },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      attribute float aRadius;
      uniform float uFocal;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 2.0 * aRadius * uFocal / max(-mv.z, 0.1);
        vAlpha = aAlpha;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.15, d) * vAlpha;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export default function BallWorld({ onFirstFrames }) {
  const { size, invalidate, gl } = useThree();
  const group = useRef(null);
  const spinner = useRef(null);
  const ring = useRef(null);
  const ballMaterial = useMemo(createVolleyballMaterial, []);
  const trailMaterial = useMemo(createTrailMaterial, []);
  const trailGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(TRAIL), 1));
    g.setAttribute("aRadius", new THREE.BufferAttribute(new Float32Array(TRAIL), 1));
    return g;
  }, []);
  const tmp = useMemo(() => ({ target: new THREE.Vector3(), axis: new THREE.Vector3(), q: new THREE.Quaternion() }), []);

  const sim = useRef(null);
  if (!sim.current) {
    sim.current = {
      // a 2D ball was already showing: fade in on the spot, no second serve
      mode: ballPlaceholder.shown ? "rest" : "serve-pending",
      serve: null,
      t: 0,
      hit: false,
      pos: [0, 0, 0],
      vel: [0, 0, 0],
      radius: 1,
      opacity: 0,
      omega: new THREE.Vector3(),
      hover: 0,
      hovered: false,
      tiltX: 0,
      tiltY: 0,
      ringT: -1,
      ringPos: new THREE.Vector3(),
      ringR: 1,
      trailHead: 0,
      trailLive: 0,
      clock: 0,
      frames: 0,
      shadow: -1,
      pointer: { x: -1e4, y: -1e4, free: false },
      screen: { x: -1e4, y: -1e4, r: 0 },
    };
  }

  // DOM → scene: commands, scroll, pointer. Every one of them wakes the
  // demand-driven render loop.
  useEffect(() => {
    const s = sim.current;
    // dev-only probe for checks: window.__ball() → mode, screen position, spin
    if (import.meta.env.DEV) {
      window.__ball = () => ({ mode: s.mode, t: s.t, screen: { ...s.screen }, omega: s.omega.length(), opacity: s.opacity });
    }
    const spike = () => {
      s.vel[1] -= 2.6 * s.radius;
      s.vel[2] += 3.4 * s.radius;
      s.omega.x += 24;
      s.omega.y += (Math.random() - 0.5) * 10;
      s.ringT = 0;
      s.ringPos.set(s.pos[0], s.pos[1], s.pos[2] - 0.01);
      s.ringR = s.radius;
      invalidate();
    };
    const offServe = onBallCommand("serve", () => {
      s.mode = "serve-pending";
      invalidate();
    });
    const offSpike = onBallCommand("spike", spike);
    const offScroll = subscribeScroll(() => invalidate());

    const onMove = (e) => {
      s.pointer.x = e.clientX;
      s.pointer.y = e.clientY;
      s.pointer.free = e.pointerType === "mouse" && !isInteractive(e.target);
      invalidate();
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
      offScroll();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
      document.documentElement.classList.remove("cursor-3d");
      ballSpotStore.set(null);
      // back to the 2D ball (paused / failed): its shadow must not inherit our last value
      document.querySelector(ANCHOR_SELECTOR)?.style.removeProperty("--ball-shadow");
    };
  }, [invalidate]);

  useEffect(
    () => () => {
      ballMaterial.dispose();
      trailMaterial.dispose();
      trailGeometry.dispose();
    },
    [ballMaterial, trailMaterial, trailGeometry]
  );

  useFrame((_, rawDelta) => {
    const s = sim.current;
    const anchorEl = document.querySelector(ANCHOR_SELECTOR);
    if (!anchorEl || !group.current || !spinner.current) return;
    // after sleeping, or a long hitch, don't let physics jump
    const dt = Math.min(rawDelta, 1 / 20);
    s.clock += dt;

    // ------------------------------------------------ where should it be?
    const k = unitsPerPixel(size.height);
    const dockEl = document.querySelector(DOCK_SELECTOR);
    const spot = findHome(anchorEl, dockEl, size);
    if (spot.name !== ballSpotStore.get()) ballSpotStore.set(spot.name);
    const docked = spot.name === "dock";
    // tight spots (the dive) follow their box closely instead of floating after it
    const tight = spot.el?.dataset.ballTight === "true";
    const anchor = boxToWorld(anchorEl, size, k, 1);
    const home = rectToWorld(spot.rect, size, k, docked ? 0.72 : 1);
    const bob = docked || tight ? 0 : Math.sin(s.clock * 1.25) * 0.045 * home.radius;
    const goal = [home.x, home.y + bob, 0];

    // ------------------------------------------------------------- serve
    if (s.mode === "serve-pending") {
      // start on the camera ray through the goal, so the far-away toss
      // projects onto the ball's own spot (never across the text column)
      const depth = (CAMERA_Z - SERVER_Z) / CAMERA_Z;
      s.serve = planServe({ start: [goal[0] * depth, goal[1] * depth - 1.2, SERVER_Z], target: goal });
      s.mode = "serve";
      s.t = 0;
      s.hit = false;
      s.opacity = 0;
      s.radius = home.radius;
      s.omega.set(-3, 0, 0);
    }

    if (s.mode === "serve") {
      s.t += dt;
      const sample = sampleServe(s.serve, s.t);
      s.pos = sample.pos;
      s.vel = sample.vel;
      s.opacity = smoothstep(0, 0.25, s.t);
      if (!s.hit && s.t >= s.serve.hitT) {
        // the hit: heavy topspin and a small flash far away
        s.hit = true;
        s.omega.set(30, 2.5, 0);
        s.ringT = 0;
        s.ringPos.set(...s.pos);
        s.ringR = home.radius * 0.6;
      }
      if (sample.phase === "landed") {
        // received: most of the momentum is absorbed, the rest becomes a little give
        s.mode = "rest";
        s.vel = s.vel.map((v) => v * 0.18);
        s.ringT = 0;
        s.ringPos.set(goal[0], goal[1], -0.01);
        s.ringR = home.radius;
        // the page reacts to the landing (Hero.jsx sends a jolt through the wordmark)
        window.dispatchEvent(new CustomEvent("ball:land", { detail: { x: s.screen.x, y: s.screen.y } }));
      }
    } else {
      if (s.frames === 0) s.pos = goal.slice();
      const r = springStep3(s.pos, s.vel, goal, tight ? 16 : docked ? 7 : 8.5, tight ? 0.92 : docked ? 0.74 : 0.6, dt);
      s.pos = r.pos;
      s.vel = r.vel;
      s.radius = damp(s.radius, home.radius, tight ? 16 : 6, dt);
      // a spot may ask for the ball to fade (the dive dissolves it into the page)
      const wantOpacity = spot.el?.dataset.ballOpacity != null ? Number(spot.el.dataset.ballOpacity) : 1;
      s.opacity = damp(s.opacity, wantOpacity, tight ? 14 : 5, dt);
    }

    // ------------------------------------------------- screen position
    const persp = CAMERA_Z / (CAMERA_Z - s.pos[2]);
    s.screen.x = size.width / 2 + (s.pos[0] * persp) / k;
    s.screen.y = size.height / 2 - (s.pos[1] * persp) / k;
    s.screen.r = (s.radius * persp) / k;

    // ------------------------------------------------- hover + pointer tilt
    const p = s.pointer;
    const dx = p.x - s.screen.x;
    const dy = p.y - s.screen.y;
    const inside = finePointer && p.free && s.mode === "rest" && s.opacity > 0.9 && dx * dx + dy * dy < s.screen.r * s.screen.r;
    if (inside !== s.hovered) {
      s.hovered = inside;
      document.documentElement.classList.toggle("cursor-3d", inside);
    }
    s.hover = damp(s.hover, inside ? 1 : 0, 10, dt);
    const near = !docked && finePointer && p.free && dx * dx + dy * dy < 4 * s.screen.r * s.screen.r;
    s.tiltX = damp(s.tiltX, near ? clamp(dy / s.screen.r, -1, 1) * 0.22 : 0, 4, dt);
    s.tiltY = damp(s.tiltY, near ? clamp(dx / s.screen.r, -1, 1) * 0.22 : 0, 4, dt);

    // ------------------------------------------------------------- spin
    // idle drift around a tilted axis + scroll-driven roll around X: rolling
    // with the page — scroll faster, it spins faster; stop, and it coasts out.
    const roll = clamp(getScrollVelocity() * SCROLL_SPIN, -MAX_SPIN, MAX_SPIN);
    const idle = docked || s.mode === "serve" ? 0 : IDLE_SPIN;
    tmp.target.copy(IDLE_AXIS).multiplyScalar(idle);
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
    group.current.scale.setScalar(s.radius * (1 + 0.06 * s.hover));
    group.current.rotation.set(s.tiltX, s.tiltY, 0);
    const u = ballMaterial.uniforms;
    u.uOpacity.value = s.opacity;
    u.uBlur.value = smoothstep(12, 30, s.omega.length()) * 0.6;
    u.uRim.value = 0.3 + 0.6 * s.hover;

    // impact ring
    if (s.ringT >= 0 && ring.current) {
      s.ringT += dt;
      const t = s.ringT / 0.7;
      ring.current.visible = t < 1;
      ring.current.position.copy(s.ringPos);
      ring.current.scale.setScalar(s.ringR * (1.04 + t * 1.3));
      ring.current.material.opacity = (1 - t) * (1 - t) * 0.85;
      if (t >= 1) s.ringT = -1;
    }

    // comet trail while the ball is really flying
    const speed = Math.hypot(s.vel[0], s.vel[1], s.vel[2]);
    const alphas = trailGeometry.attributes.aAlpha.array;
    let live = 0;
    for (let i = 0; i < TRAIL; i++) {
      alphas[i] *= Math.exp(-dt * 9);
      if (alphas[i] < 0.004) alphas[i] = 0;
      else live++;
    }
    if (speed > 3.5 && s.opacity > 0.3) {
      const h = s.trailHead;
      trailGeometry.attributes.position.array.set(s.pos, h * 3);
      trailGeometry.attributes.aRadius.array[h] = s.radius * 0.92;
      alphas[h] = 0.32 * s.opacity;
      s.trailHead = (h + 1) % TRAIL;
      live++;
      trailGeometry.attributes.position.needsUpdate = true;
      trailGeometry.attributes.aRadius.needsUpdate = true;
    }
    trailGeometry.attributes.aAlpha.needsUpdate = true;
    trailMaterial.uniforms.uFocal.value = (size.height * gl.getPixelRatio()) / 2 / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
    s.trailLive = live;

    // ground shadow under the hero ball: full when it sits on its spot
    const away = Math.hypot(s.pos[0] - anchor.x, s.pos[1] - anchor.y, s.pos[2] * 0.25) / Math.max(anchor.radius, 1e-3);
    const shadow = clamp((1 - away / 1.2) * s.opacity * (1 - (bob / Math.max(home.radius, 1e-3)) * 2.5), 0, 1);
    if (Math.abs(shadow - s.shadow) > 0.004) {
      s.shadow = shadow;
      anchorEl.style.setProperty("--ball-shadow", shadow.toFixed(3));
    }

    if (++s.frames === 3) onFirstFrames?.();

    // --------------------------------------------------------- sleep?
    // Resting in the dock with nothing moving: stop rendering until the next
    // scroll/pointer/command wakes us. In the hero the ball floats, so it runs.
    const settled =
      docked &&
      s.mode === "rest" &&
      speed < 1e-3 &&
      Math.hypot(s.pos[0] - goal[0], s.pos[1] - goal[1], s.pos[2]) < 1e-3 &&
      s.omega.lengthSq() < 1e-4 &&
      Math.abs(s.hover - (s.hovered ? 1 : 0)) < 0.01 &&
      s.opacity > 0.999 &&
      s.ringT < 0 &&
      live === 0;
    if (!settled) invalidate();
  });

  return (
    <>
      <group ref={group}>
        <group ref={spinner}>
          <mesh material={ballMaterial}>
            <sphereGeometry args={[1, 64, 48]} />
          </mesh>
        </group>
      </group>
      <mesh ref={ring} visible={false}>
        <ringGeometry args={[0.96, 1, 96]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <points geometry={trailGeometry} material={trailMaterial} frustumCulled={false} />
    </>
  );
}
