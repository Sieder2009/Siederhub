import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

// Watches how long frames take while the scene is animating. If it stays
// below ~30 fps for a while, it asks the scene to step down (drop the arena,
// then the pixel ratio, then give up → 2D ball). Gaps from a sleeping
// render loop or a backgrounded tab are not frames and are ignored.
export default function FrameGovernor({ onSlow }) {
  const stat = useRef({ ema: 16, slow: 0, age: 0, cooldown: 0 });

  useFrame((_, delta) => {
    const s = stat.current;
    if (delta > 0.25) return;
    s.age += delta;
    if (s.age < 2.5) return; // boot hitches (shader compiles) don't count
    s.ema += (delta * 1000 - s.ema) * 0.06;
    s.cooldown = Math.max(0, s.cooldown - delta);
    s.slow = s.ema > 34 ? s.slow + delta : 0;
    if (s.slow > 2.5 && s.cooldown === 0) {
      s.slow = 0;
      s.cooldown = 4;
      s.ema = 16;
      onSlow();
    }
  });

  return null;
}
