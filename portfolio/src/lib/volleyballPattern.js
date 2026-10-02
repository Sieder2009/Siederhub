// The volleyball's panel layout, shared by the GLSL shader
// (components/three/volleyballMaterial.js) and the 2D fallback generator
// (scripts/generate-ball-svg.mjs) — so the SVG ball and the 3D ball match.
//
// Classic 18-panel ball: project the sphere onto a cube (gnomonic projection)
// and cut each of the 6 faces into 3 parallel stripes. The stripe direction
// cycles X→y, Y→z, Z→x, so every pair of neighbouring faces meets at a right
// angle — the interlocking look of a real volleyball. Straight lines in the
// gnomonic (u, v) plane are great-circle arcs on the sphere, which is why the
// seams come out as clean curves.

export const BALL_COLORS = {
  amber: "#ffb547",
  cream: "#f3eee4",
  blue: "#2d5be3",
  seam: "#0b1222",
};

// Colour of stripe 0, 1, 2 (opposite faces use the reverse order, so the
// pattern is point-symmetric like a real ball).
export const STRIPE_COLORS = [BALL_COLORS.amber, BALL_COLORS.cream, BALL_COLORS.blue];

export const STRIPES = 3;
// Each face spans 90° (atan of the gnomonic coordinate runs from -45° to 45°);
// every stripe gets an equal 30° slice of that.
export const STRIPE_ANGLE = Math.PI / 2 / STRIPES;

// For a face whose normal is axis 0/1/2: [axis the stripes are cut along (u),
// the remaining in-face axis (v)]. Must match the branches in the shader.
export const FACE_AXES = [
  [1, 2],
  [2, 0],
  [0, 1],
];

// Which colour a stripe gets, given its geometric index on the face.
export function stripeColorIndex(stripe, sign) {
  return sign < 0 ? STRIPES - 1 - stripe : stripe;
}

// Geometric stripe index for an angle atan(u) in [-π/4, π/4].
export function stripeAt(theta) {
  return Math.min(STRIPES - 1, Math.max(0, Math.floor((theta + Math.PI / 4) / STRIPE_ANGLE)));
}

function toSphere(axis, sign, u, v) {
  const [ua, va] = FACE_AXES[axis];
  const p = [0, 0, 0];
  p[axis] = sign;
  p[ua] = u;
  p[va] = v;
  const len = Math.hypot(p[0], p[1], p[2]);
  return [p[0] / len, p[1] / len, p[2] / len];
}

// Closed outline of one panel as points on the unit sphere: the panel's
// rectangle in (u, v) space, walked edge by edge.
export function panelOutline(axis, sign, stripe, samplesPerEdge = 16) {
  const u0 = Math.tan(-Math.PI / 4 + stripe * STRIPE_ANGLE);
  const u1 = Math.tan(-Math.PI / 4 + (stripe + 1) * STRIPE_ANGLE);
  const corners = [
    [u0, -1],
    [u1, -1],
    [u1, 1],
    [u0, 1],
  ];
  const points = [];
  for (let e = 0; e < 4; e++) {
    const [ua, va] = corners[e];
    const [ub, vb] = corners[(e + 1) % 4];
    for (let i = 0; i < samplesPerEdge; i++) {
      const t = i / samplesPerEdge;
      points.push(toSphere(axis, sign, ua + (ub - ua) * t, va + (vb - va) * t));
    }
  }
  return points;
}

// All 18 panels with their colour.
export function allPanels(samplesPerEdge) {
  const panels = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [1, -1]) {
      for (let stripe = 0; stripe < STRIPES; stripe++) {
        panels.push({
          axis,
          sign,
          stripe,
          color: STRIPE_COLORS[stripeColorIndex(stripe, sign)],
          outline: panelOutline(axis, sign, stripe, samplesPerEdge),
        });
      }
    }
  }
  return panels;
}
