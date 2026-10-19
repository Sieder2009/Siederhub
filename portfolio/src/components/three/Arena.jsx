import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_FOV, CAMERA_Z } from "./camera.js";

// The sky behind the page's first act: a sparse field of still stars. Nothing
// here moves — the ball is the only thing with physics on this page — so the
// canvas draws once on mount, again on resize, and when the act flips (it is
// hidden once the page has turned to day after the dive). Low contrast on
// purpose: it sits behind the text (contrast stays AA, see README).

const TAN = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
const FAR = -84;
const NEAR = 7;

function createSky(count) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const farHalfH = TAN * (CAMERA_Z - FAR);
  for (let i = 0; i < count; i++) {
    // spread over the far end of the view (wider than tall), a little beyond
    pos[i * 3] = (Math.random() * 2 - 1) * farHalfH * 1.95;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * farHalfH * 1.15;
    pos[i * 3 + 2] = FAR + Math.random() * (NEAR - FAR);
    seed[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uSize;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        gl_PointSize = min(uSize * (0.55 + aSeed * 1.25) * (34.0 / dist), uSize * 3.2);
        // fainter with distance, gone just before a star would sit on the
        // camera; every star keeps its own fixed brightness
        float fade = smoothstep(${(CAMERA_Z - FAR).toFixed(1)}, ${((CAMERA_Z - FAR) * 0.62).toFixed(1)}, dist) * smoothstep(3.0, 9.0, dist);
        float shade = 0.75 + 0.25 * sin(aSeed * 91.0 + position.z * 0.44);
        vAlpha = fade * (0.28 + 0.72 * fract(aSeed * 13.7)) * shade;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        // cream, never amber: the ball is the only amber object up here
        gl_FragColor = vec4(0.95, 0.94, 0.91, a * a * vAlpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return { geometry, material };
}

export default function Arena({ lite }) {
  const invalidate = useThree((s) => s.invalidate);
  const dpr = useThree((s) => s.viewport.dpr);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const points = useRef(null);

  // 40 % of the old drifting field: sparse and still
  const sky = useMemo(() => createSky(lite ? 260 : 600), [lite]);

  // night only: the act is on <html data-act> (sectionStore, plus the dive's
  // override at its cut), so watch the attribute itself
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      if (points.current) points.current.visible = root.dataset.act !== "day";
      invalidate();
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(root, { attributes: true, attributeFilter: ["data-act"] });
    return () => mo.disconnect();
  }, [invalidate]);

  useEffect(() => {
    sky.material.uniforms.uSize.value = dpr * (lite ? 1.7 : 2.1);
    invalidate();
  }, [sky, dpr, lite, width, height, invalidate]);

  useEffect(
    () => () => {
      sky.geometry.dispose();
      sky.material.dispose();
    },
    [sky]
  );

  return <points ref={points} geometry={sky.geometry} material={sky.material} frustumCulled={false} />;
}
