import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clamp, damp, smoothstep } from "../../lib/ballPhysics.js";
import { getScrollVelocity, subscribeScroll } from "../../lib/scrollVelocity.js";
import { ANCHOR_SELECTOR } from "../../lib/ballBridge.js";
import { finePointer } from "../../lib/capabilities.js";
import { CAMERA_FOV, CAMERA_Z } from "./camera.js";

// The room behind the hero: a faint volleyball court with its net, dust
// drifting in the hall light, and a few wireframe "satellites" around the
// ball that react to hover, clicks and scrolling. Everything here is low
// contrast on purpose — it sits behind the text (contrast stays AA, see
// README) and fades out (wrapper opacity) as the hero scrolls away, then
// stops rendering altogether.

// deep enough that the whole court stays right of the hero text column
const FLOOR_Y = -4.6;
const NET_Z = -28;
const TAN = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);

// offsets from the ball's centre in ball radii (x right, y up) — wide layout
// keeps them right of the text column, narrow layout above the text
const SHAPES = [
  { geo: "icosa", size: 0.34, z: -3, wide: [-0.95, 0.92], narrow: [-1.3, 0.55], color: "#7f9cff", parallax: 0.16 },
  { geo: "octa", size: 0.42, z: -5, wide: [1.2, 1.0], narrow: [1.3, 0.8], color: "#ffb347", parallax: 0.3 },
  { geo: "tetra", size: 0.3, z: -2, wide: [1.32, -0.62], narrow: [1.32, -0.42], color: "#f2efe8", parallax: 0.1 },
  { geo: "dodeca", size: 0.38, z: -4, wide: [-1.02, -0.72], narrow: [-1.26, -0.36], color: "#ffb347", parallax: 0.22 },
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

function linesGeometry(segments) {
  return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(segments.flat(2), 3));
}

function courtSegments() {
  const y = FLOOR_Y;
  const w = 4.5;
  const z0 = NET_Z - 9;
  const z1 = NET_Z + 9;
  return [
    [[-w, y, z0], [w, y, z0]],
    [[w, y, z0], [w, y, z1]],
    [[w, y, z1], [-w, y, z1]],
    [[-w, y, z1], [-w, y, z0]],
    [[-w, y, NET_Z], [w, y, NET_Z]], // centre line
    [[-w, y, NET_Z - 3], [w, y, NET_Z - 3]], // attack lines, 3 m from the net
    [[-w, y, NET_Z + 3], [w, y, NET_Z + 3]],
  ];
}

function netSegments() {
  const bottom = FLOOR_Y + 1.43;
  const top = FLOOR_Y + 2.43;
  const half = 5.1;
  const s = [];
  for (let x = -half; x <= half + 1e-6; x += 0.3) s.push([[x, bottom, NET_Z], [x, top, NET_Z]]);
  for (let y = bottom; y <= top + 1e-6; y += 0.25) s.push([[-half, y, NET_Z], [half, y, NET_Z]]);
  s.push([[-half - 0.25, FLOOR_Y, NET_Z], [-half - 0.25, top + 0.12, NET_Z]]); // posts
  s.push([[half + 0.25, FLOOR_Y, NET_Z], [half + 0.25, top + 0.12, NET_Z]]);
  return s;
}

// Dust motes: thousands of points, all motion computed on the GPU — drift,
// sway and the scroll-driven lift are a few lines of vertex shader, so the CPU
// only updates three uniforms per frame however many particles there are.
function createDust(count) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 32;
    pos[i * 3 + 1] = Math.random() * 12 - 4;
    pos[i * 3 + 2] = -34 + Math.random() * 40;
    seed[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uSize: { value: 1 },
      uOpacity: { value: 1 },
      uColA: { value: new THREE.Color("#f2efe8") },
      uColB: { value: new THREE.Color("#ffb347") },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uScroll;
      uniform float uSize;
      varying float vAlpha;
      varying float vTint;
      void main() {
        vec3 p = position;
        // rise slowly, a little faster while scrolling, wrap inside the box
        p.y = mod(p.y + 4.0 + uTime * (0.05 + aSeed * 0.1) + uScroll * (0.6 + aSeed * 0.8), 12.0) - 4.0;
        p.x += sin(uTime * 0.25 + aSeed * 40.0) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float depth = -mv.z;
        gl_PointSize = uSize * (0.6 + aSeed * 1.6) * (14.0 / depth);
        float edge = smoothstep(-4.0, -3.0, p.y) * (1.0 - smoothstep(7.0, 8.0, p.y));
        vAlpha = edge * (0.25 + 0.75 * fract(aSeed * 7.31)) * smoothstep(46.0, 14.0, depth);
        vTint = step(0.82, aSeed);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColA;
      uniform vec3 uColB;
      uniform float uOpacity;
      varying float vAlpha;
      varying float vTint;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(mix(uColA, uColB, vTint), a * a * vAlpha * uOpacity * 0.7);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return { geometry, material };
}

const isInteractive = (el) => !!el?.closest?.("a, button, input, textarea, select, label, summary, [role='button']");

export default function Arena({ lite, fadeRef }) {
  const { camera, size, invalidate, gl } = useThree();
  const court = useRef(null);
  const shapeRefs = useRef([]);

  const courtGeo = useMemo(() => linesGeometry(courtSegments()), []);
  const netGeo = useMemo(() => linesGeometry(netSegments()), []);
  const dust = useMemo(() => createDust(lite ? 650 : 1700), [lite]);
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

  const state = useRef({ active: true, clock: 0, lastY: 0, scroll: 0, pointer: { nx: 0, ny: 0, x: -1e4, y: -1e4, free: false } });

  useEffect(() => {
    const s = state.current;
    s.lastY = window.scrollY;
    const hero = document.getElementById("top");
    let io;
    if (hero && "IntersectionObserver" in window) {
      io = new IntersectionObserver(([entry]) => {
        s.active = entry.isIntersecting;
        if (s.active) invalidate();
      });
      io.observe(hero);
    }
    const offScroll = subscribeScroll(() => s.active && invalidate());
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
      io?.disconnect();
      offScroll();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, [invalidate, shapes]);

  useEffect(
    () => () => {
      courtGeo.dispose();
      netGeo.dispose();
      dust.geometry.dispose();
      dust.material.dispose();
      shapes.forEach((sh) => {
        sh.geometry.dispose();
        sh.material.dispose();
      });
    },
    [courtGeo, netGeo, dust, shapes]
  );

  useFrame((_, rawDelta) => {
    const s = state.current;
    if (!s.active) return;
    const dt = Math.min(rawDelta, 1 / 20);
    s.clock += dt;

    const y = window.scrollY;
    const heroH = document.getElementById("top")?.offsetHeight || window.innerHeight;
    const fade = 1 - smoothstep(0.1, 0.85, y / heroH);
    if (fadeRef.current) fadeRef.current.style.opacity = fade.toFixed(3);
    s.scroll += (y - s.lastY) * 0.004;
    s.lastY = y;

    // gentle camera parallax toward the pointer (mouse only)
    if (!lite && finePointer) {
      camera.position.x = damp(camera.position.x, s.pointer.nx * 0.35, 2.5, dt);
      camera.position.y = damp(camera.position.y, s.pointer.ny * 0.2, 2.5, dt);
      camera.lookAt(0, 0, -6);
    }

    dust.material.uniforms.uTime.value = s.clock;
    dust.material.uniforms.uScroll.value = s.scroll;
    dust.material.uniforms.uSize.value = gl.getPixelRatio() * (lite ? 1.6 : 2);

    const anchorEl = document.querySelector(ANCHOR_SELECTOR);
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const R = r.width / 2;
      const k = (2 * TAN * CAMERA_Z) / size.height; // world units per px at z = 0
      const scale = R * k; // ball radius in world units

      // the court lines up under the ball (its centre line sits on the ball's x).
      // Stacked (narrow) layout: the floor would land right behind the text,
      // so there it is left out.
      const wide = size.width >= 1024;
      if (court.current) {
        const ax = (cx - size.width / 2) * k;
        court.current.position.x = damp(court.current.position.x, ax * ((CAMERA_Z - NET_Z) / CAMERA_Z), 3, dt);
        court.current.visible = wide && fade > 0.01;
      }

      const roll = getScrollVelocity() * 0.0025;
      shapes.forEach((sh, i) => {
        const obj = shapeRefs.current[i];
        if (!obj) return;
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
        sh.material.opacity = 0.42 + sh.hover * 0.45;
      });
    }

    invalidate();
  });

  return (
    <>
      <points geometry={dust.geometry} material={dust.material} frustumCulled={false} />
      <group ref={court}>
        <lineSegments geometry={courtGeo}>
          <lineBasicMaterial color="#a9b4c9" transparent opacity={0.16} depthWrite={false} />
        </lineSegments>
        <lineSegments geometry={netGeo}>
          <lineBasicMaterial color="#a9b4c9" transparent opacity={0.11} depthWrite={false} />
        </lineSegments>
      </group>
      {shapes.map((sh, i) => (
        <lineSegments key={sh.geo} ref={(el) => (shapeRefs.current[i] = el)} geometry={sh.geometry} material={sh.material} />
      ))}
    </>
  );
}
