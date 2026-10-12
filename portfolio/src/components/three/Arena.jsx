import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clamp, damp, smoothstep } from "../../lib/ballPhysics.js";
import { getScrollVelocity, subscribeScroll } from "../../lib/scrollVelocity.js";
import { ANCHOR_SELECTOR } from "../../lib/ballBridge.js";
import { sectionStore } from "../../lib/sectionStore.js";
import { sectionById } from "../../lib/sections.js";
import { finePointer } from "../../lib/capabilities.js";
import { CAMERA_FOV, CAMERA_Z } from "./camera.js";

// The sky behind the page's first act: a deep star field the camera drifts
// through — scroll, and it flies; scroll fast, and the stars stretch into
// light-speed streaks; scroll back up, and it reverses. Around the hero ball
// float a few wireframe "satellites" that react to hover, clicks and
// scrolling. Everything here is low contrast on purpose — it sits behind the
// text (contrast stays AA, see README) — and stops rendering once the page
// turns to day after the dive.

const TAN = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
const FAR = -84;
const NEAR = 7;
const IDLE_SPEED = 1.1; // world units per second while nobody scrolls
const SCROLL_SPEED = 0.014; // extra units/s per px/s of scroll speed
const MAX_SPEED = 70;

// offsets from the ball's centre in ball radii (x right, y up) — wide layout
// keeps them around the ball, narrow layout a bit tighter
const SHAPES = [
  { geo: "icosa", size: 0.34, z: -3, wide: [-0.95, 0.92], narrow: [-1.2, 0.55], color: "#7f9cff", parallax: 0.16 },
  { geo: "octa", size: 0.42, z: -5, wide: [1.2, 1.0], narrow: [1.2, 0.8], color: "#ffb347", parallax: 0.3 },
  { geo: "tetra", size: 0.3, z: -2, wide: [1.32, -0.62], narrow: [1.22, -0.42], color: "#f2efe8", parallax: 0.1 },
  { geo: "dodeca", size: 0.38, z: -4, wide: [-1.02, -0.72], narrow: [-1.18, -0.36], color: "#ffb347", parallax: 0.22 },
  { geo: "box", size: 0.4, z: -7, wide: [0.25, 1.5], narrow: [0.02, 1.32], color: "#7f9cff", parallax: 0.38 },
];

function shapeGeometry(kind) {
  const g = {
    icosa: () => new THREE.IcosahedronGeometry(1, 0),
    octa: () => new THREE.OctahedronGeometry(1, 0),
    tetra: () => new THREE.TetrahedronGeometry(1, 0),
    dodeca: () => new THREE.DodecahedronGeometry(1, 0),
    box: () => new THREE.BoxGeometry(1.3, 1.3, 1.3),
  }[kind]();
  const edges = new THREE.EdgesGeometry(g);
  g.dispose();
  return edges;
}

// Shared GLSL: where a star is right now. position.xy is fixed, position.z
// is the star's phase (0…1) along the flight path; uTravel moves everyone.
const STAR_POSITION = /* glsl */ `
  attribute float aSeed;
  uniform float uTravel;
  vec3 starPosition() {
    float span = ${(NEAR - FAR).toFixed(1)};
    float z = ${FAR.toFixed(1)} + mod(position.z * span + uTravel * (0.7 + aSeed * 0.6), span);
    return vec3(position.xy, z);
  }
  float starFade(float dist) {
    // fade in far away, fade out just before a star would pass the camera
    return smoothstep(${(CAMERA_Z - FAR).toFixed(1)}, ${((CAMERA_Z - FAR) * 0.62).toFixed(1)}, dist) * smoothstep(3.0, 9.0, dist);
  }
`;

const STAR_COLOR = /* glsl */ `
  vec3 starColor(float seed) {
    // mostly cream, a few amber and court-blue ones tie the sky to the ball
    vec3 cream = vec3(0.95, 0.94, 0.91);
    vec3 amber = vec3(1.0, 0.70, 0.28);
    vec3 court = vec3(0.50, 0.61, 1.0);
    float t = fract(seed * 7.13);
    return t > 0.9 ? amber : (t > 0.82 ? court : cream);
  }
`;

function createSky(count) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const farHalfH = TAN * (CAMERA_Z - FAR);
  for (let i = 0; i < count; i++) {
    // spread over the far end of the view (wider than tall), a little beyond
    pos[i * 3] = (Math.random() * 2 - 1) * farHalfH * 1.95;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * farHalfH * 1.15;
    pos[i * 3 + 2] = Math.random();
    seed[i] = Math.random();
  }

  const points = new THREE.BufferGeometry();
  points.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  points.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

  // streaks: every star twice — head (aTail 0) and tail (aTail 1)
  const linePos = new Float32Array(count * 6);
  const lineSeed = new Float32Array(count * 2);
  const tail = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 2; k++) {
      linePos.set(pos.subarray(i * 3, i * 3 + 3), (i * 2 + k) * 3);
      lineSeed[i * 2 + k] = seed[i];
      tail[i * 2 + k] = k;
    }
  }
  const lines = new THREE.BufferGeometry();
  lines.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  lines.setAttribute("aSeed", new THREE.BufferAttribute(lineSeed, 1));
  lines.setAttribute("aTail", new THREE.BufferAttribute(tail, 1));

  const uniforms = {
    uTravel: { value: 0 },
    uStretch: { value: 0 },
    uStreak: { value: 0 },
    uSize: { value: 1 },
    uOpacity: { value: 1 },
  };

  const pointMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      ${STAR_POSITION}
      ${STAR_COLOR}
      uniform float uSize;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec4 mv = modelViewMatrix * vec4(starPosition(), 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        gl_PointSize = min(uSize * (0.55 + aSeed * 1.25) * (34.0 / dist), uSize * 3.2);
        // a slow twinkle, different for every star
        float twinkle = 0.75 + 0.25 * sin(aSeed * 91.0 + position.z * 40.0);
        vAlpha = starFade(dist) * (0.28 + 0.72 * fract(aSeed * 13.7)) * twinkle;
        vColor = starColor(aSeed);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * a * vAlpha * uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const lineMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      ${STAR_POSITION}
      ${STAR_COLOR}
      attribute float aTail;
      uniform float uStretch;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec3 p = starPosition();
        // the tail trails behind the direction of flight
        p.z -= aTail * uStretch * (0.7 + aSeed * 0.6);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vAlpha = starFade(-mv.z) * (1.0 - aTail) * (0.35 + 0.65 * fract(aSeed * 13.7));
        vColor = starColor(aSeed);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uStreak;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, vAlpha * uStreak * uOpacity * 0.9);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return { points, lines, pointMaterial, lineMaterial, uniforms };
}

const isInteractive = (el) => !!el?.closest?.("a, button, input, textarea, select, label, summary, [role='button']");

export default function Arena({ lite }) {
  const { camera, size, invalidate, gl } = useThree();
  const shapeRefs = useRef([]);

  const sky = useMemo(() => createSky(lite ? 650 : 1500), [lite]);
  const shapes = useMemo(
    () =>
      SHAPES.map((def) => ({
        ...def,
        geometry: shapeGeometry(def.geo),
        material: new THREE.LineBasicMaterial({ color: def.color, transparent: true, opacity: 0.5 }),
        base: new THREE.Color(def.color),
        hover: 0,
        pop: 0,
        spin: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.25 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4),
        screen: { x: -1e4, y: -1e4, r: 0 },
      })),
    []
  );
  const amber = useMemo(() => new THREE.Color("#ffb347"), []);

  const state = useRef({ night: true, visible: 1, clock: 0, speed: IDLE_SPEED, pointer: { nx: 0, ny: 0, x: -1e4, y: -1e4, free: false } });

  useEffect(() => {
    const s = state.current;
    // day act (after the dive): the sky fades out and the loop goes to sleep
    const onSection = (id) => {
      s.night = sectionById(id).act === "night";
      invalidate();
    };
    onSection(sectionStore.get());
    const offSection = sectionStore.subscribe(onSection);
    const offScroll = subscribeScroll(() => s.night && invalidate());
    const onMove = (e) => {
      s.pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
      s.pointer.ny = -((e.clientY / window.innerHeight) * 2 - 1);
      s.pointer.x = e.clientX;
      s.pointer.y = e.clientY;
      s.pointer.free = e.pointerType === "mouse" && !isInteractive(e.target);
    };
    const onClick = (e) => {
      if (isInteractive(e.target)) return;
      for (const sh of shapes) {
        const dx = e.clientX - sh.screen.x;
        const dy = e.clientY - sh.screen.y;
        if (dx * dx + dy * dy < sh.screen.r * sh.screen.r * 1.6) {
          // flick it: a burst of spin and a little pop
          sh.spin.x += (Math.random() - 0.5) * 9;
          sh.spin.y += 6 + Math.random() * 4;
          sh.pop = 1;
          invalidate();
        }
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("click", onClick);
    return () => {
      offSection();
      offScroll();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, [invalidate, shapes]);

  useEffect(
    () => () => {
      sky.points.dispose();
      sky.lines.dispose();
      sky.pointMaterial.dispose();
      sky.lineMaterial.dispose();
      shapes.forEach((sh) => {
        sh.geometry.dispose();
        sh.material.dispose();
      });
    },
    [sky, shapes]
  );

  useFrame((_, rawDelta) => {
    const s = state.current;
    const dt = Math.min(rawDelta, 1 / 20);
    s.clock += dt;

    // fade the whole sky with the act; once it is gone, stop drawing
    s.visible = damp(s.visible, s.night ? 1 : 0, 3, dt);
    if (!s.night && s.visible < 0.01) {
      sky.uniforms.uOpacity.value = 0;
      return;
    }

    // ------------------------------------------------------ flight
    const v = getScrollVelocity();
    const target = clamp(IDLE_SPEED + v * SCROLL_SPEED, -MAX_SPEED, MAX_SPEED);
    s.speed = damp(s.speed, target, 3.2, dt);
    const u = sky.uniforms;
    u.uTravel.value += s.speed * dt;
    u.uStretch.value = s.speed * 0.16;
    u.uStreak.value = smoothstep(4, 22, Math.abs(s.speed));
    u.uSize.value = gl.getPixelRatio() * (lite ? 1.7 : 2.1);
    u.uOpacity.value = s.visible;

    // gentle camera parallax toward the pointer (mouse only)
    if (!lite && finePointer) {
      camera.position.x = damp(camera.position.x, s.pointer.nx * 0.35, 2.5, dt);
      camera.position.y = damp(camera.position.y, s.pointer.ny * 0.2, 2.5, dt);
      camera.lookAt(0, 0, -6);
    }

    // ------------------------------------------------- satellites
    const anchorEl = document.querySelector(ANCHOR_SELECTOR);
    const y = window.scrollY;
    const heroH = document.getElementById("top")?.offsetHeight || window.innerHeight;
    const heroFade = 1 - smoothstep(0.15, 0.8, y / heroH);
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const R = r.width / 2;
      const k = (2 * TAN * CAMERA_Z) / size.height; // world units per px at z = 0
      const scale = R * k; // ball radius in world units
      const wide = size.width >= 1024;
      const roll = getScrollVelocity() * 0.0025;

      shapes.forEach((sh, i) => {
        const obj = shapeRefs.current[i];
        if (!obj) return;
        obj.visible = heroFade > 0.01;
        if (!obj.visible) return;
        const [ox, oy] = wide ? sh.wide : sh.narrow;
        // anchored to the ball, plus their own parallax drift as you scroll
        const px = clamp(cx + ox * R, 24, size.width - 24);
        const py = cy - oy * R - y * sh.parallax;
        const depth = CAMERA_Z - sh.z;
        const wx = ((px - size.width / 2) / (size.height / 2)) * TAN * depth;
        const wy = ((size.height / 2 - py) / (size.height / 2)) * TAN * depth;
        const radius = sh.size * (scale / 1.3) * (1 + sh.hover * 0.25 + sh.pop * 0.3);
        obj.position.set(wx, wy, sh.z);
        obj.scale.setScalar(radius);

        sh.screen.x = px;
        sh.screen.y = py;
        sh.screen.r = (radius * size.height) / (2 * TAN * depth);
        const dx = s.pointer.x - px;
        const dy = s.pointer.y - py;
        const hovered = finePointer && s.pointer.free && dx * dx + dy * dy < sh.screen.r * sh.screen.r * 1.6;
        sh.hover = damp(sh.hover, hovered ? 1 : 0, 8, dt);
        sh.pop = damp(sh.pop, 0, 5, dt);

        // spin: own drift + scroll speed + whatever a click added, easing back
        sh.spin.x = damp(sh.spin.x, 0.15, 1.2, dt);
        sh.spin.y = damp(sh.spin.y, 0.35, 1.2, dt);
        obj.rotation.x += (sh.spin.x + roll) * dt;
        obj.rotation.y += (sh.spin.y + roll * 0.6 + sh.hover * 1.5) * dt;
        obj.rotation.z += sh.spin.z * dt;

        sh.material.color.copy(sh.base).lerp(amber, sh.hover);
        sh.material.opacity = (0.42 + sh.hover * 0.45) * heroFade;
      });
    }

    invalidate();
  });

  return (
    <>
      <points geometry={sky.points} material={sky.pointMaterial} frustumCulled={false} />
      <lineSegments geometry={sky.lines} material={sky.lineMaterial} frustumCulled={false} />
      {shapes.map((sh, i) => (
        <lineSegments key={sh.geo} ref={(el) => (shapeRefs.current[i] = el)} geometry={sh.geometry} material={sh.material} />
      ))}
    </>
  );
}
