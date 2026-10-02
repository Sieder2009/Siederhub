import { useId } from "react";
import { BALL_SVG } from "./volleyballSvgData.js";

// The 2D volleyball: reduced-motion fallback, loading placeholder and dock
// icon. Generated from the same panel layout as the 3D shader
// (scripts/generate-ball-svg.mjs). Only the panel group spins (via `spinRef`)
// — light and shadow stay put, like on a real ball turning in place.
export default function VolleyballSVG({ className = "", title, spinRef }) {
  const uid = useId().replace(/:/g, "");
  const { view, center: c, radius: r, panels, seams, seam, base } = BALL_SVG;
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };

  return (
    <svg viewBox={`0 0 ${view} ${view}`} className={className} focusable="false" {...a11y}>
      <defs>
        <clipPath id={`clip-${uid}`}>
          <circle cx={c} cy={c} r={r} />
        </clipPath>
        <radialGradient id={`light-${uid}`} cx="0.34" cy="0.28" r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`shade-${uid}`} cx="0.38" cy="0.32" r="0.78">
          <stop offset="0.5" stopColor="#060a14" stopOpacity="0" />
          <stop offset="1" stopColor="#060a14" stopOpacity="0.62" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#clip-${uid})`}>
        <circle cx={c} cy={c} r={r} fill={base} />
        <g ref={spinRef}>
          {panels.map((p, i) => (
            <path key={i} d={p.d} fill={p.fill} />
          ))}
          <path d={seams} fill="none" stroke={seam} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <circle cx={c} cy={c} r={r} fill={`url(#shade-${uid})`} />
        <circle cx={c} cy={c} r={r} fill={`url(#light-${uid})`} />
      </g>
      <circle cx={c} cy={c} r={r} fill="none" stroke={seam} strokeWidth="2" />
    </svg>
  );
}
