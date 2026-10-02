import * as THREE from "three";
import { BALL_COLORS } from "../../lib/volleyballPattern.js";

// The volleyball, drawn entirely in the fragment shader: no texture to load,
// sharp at any size, anti-aliased seams via fwidth(). The panel maths mirrors
// lib/volleyballPattern.js (cube projection, 3 stripes per face) — which also
// generates the matching 2D SVG ball.

const vertexShader = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vObj = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  uniform vec3 uSeam;
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform vec3 uSky;
  uniform vec3 uGround;
  uniform vec3 uRimColor;
  uniform float uRim;
  uniform float uBlur;
  uniform float uOpacity;

  varying vec3 vObj;
  varying vec3 vNormal;
  varying vec3 vView;

  const float QUARTER = 0.78539816; // π/4: half a cube face, seen from the centre
  const float STRIPE = 0.52359878;  // π/6: one of the three stripes per face
  const float SEAM = 0.016;         // seam half-width (radians)

  void main() {
    vec3 p = normalize(vObj);
    vec3 a = abs(p);

    // Gnomonic (cube) coordinates on this point's face. Stripes are cut along
    // y on the X faces, z on Y, x on Z — so neighbouring faces interlock.
    float u; float v; float s;
    if (a.x >= a.y && a.x >= a.z) { u = p.y / a.x; v = p.z / a.x; s = sign(p.x); }
    else if (a.y >= a.z)          { u = p.z / a.y; v = p.x / a.y; s = sign(p.y); }
    else                          { u = p.x / a.z; v = p.y / a.z; s = sign(p.z); }
    float tu = atan(u);
    float tv = atan(v);

    float stripe = clamp(floor((tu + QUARTER) / STRIPE), 0.0, 2.0);
    if (s < 0.0) stripe = 2.0 - stripe; // opposite faces mirror the colour order
    vec3 base = stripe < 0.5 ? uColA : (stripe < 1.5 ? uColB : uColC);
    // spinning fast: the panels smear into their average, like motion blur
    base = mix(base, (uColA + uColB + uColC) / 3.0, uBlur);

    // distance to the nearest seam — stripe borders and cube-face edges
    float dStripe = abs(abs(tu) - STRIPE * 0.5);
    float dEdge = QUARTER - max(abs(tu), abs(tv));
    float d = min(dStripe, dEdge);
    float aa = fwidth(d) * 1.25;
    float seam = (1.0 - smoothstep(SEAM - aa, SEAM + aa, d)) * (1.0 - uBlur * 0.85);
    float groove = smoothstep(0.0, 0.07, d); // the leather dips into each seam

    // soft "studio" light: wrapped diffuse, sky/ground ambient, broad sheen, rim
    vec3 n = normalize(vNormal);
    vec3 l = normalize(uLightDir);
    vec3 vdir = normalize(vView);
    float wrap = max((dot(n, l) + 0.3) / 1.3, 0.0);
    vec3 ambient = mix(uGround, uSky, n.y * 0.5 + 0.5);
    float sheen = pow(max(dot(n, normalize(l + vdir)), 0.0), 36.0) * 0.3;
    float fresnel = pow(1.0 - max(dot(n, vdir), 0.0), 2.6);

    vec3 col = base * (ambient + wrap * uLightColor) * mix(0.74, 1.0, groove);
    col = mix(col, uSeam, seam * 0.92);
    col += sheen * uLightColor * (1.0 - seam);
    col += fresnel * uRimColor * uRim;

    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

export function createVolleyballMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColA: { value: new THREE.Color(BALL_COLORS.amber) },
      uColB: { value: new THREE.Color(BALL_COLORS.cream) },
      uColC: { value: new THREE.Color(BALL_COLORS.blue) },
      uSeam: { value: new THREE.Color(BALL_COLORS.seam) },
      uLightDir: { value: new THREE.Vector3(-0.55, 0.78, 0.6).normalize() },
      uLightColor: { value: new THREE.Color(1.0, 0.95, 0.88).multiplyScalar(0.92) },
      uSky: { value: new THREE.Color(0.22, 0.26, 0.38) },
      uGround: { value: new THREE.Color(0.05, 0.05, 0.08) },
      uRimColor: { value: new THREE.Color("#ffb347") },
      uRim: { value: 0.3 },
      uBlur: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });
}
