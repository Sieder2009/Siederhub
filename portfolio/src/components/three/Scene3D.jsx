import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Arena from "./Arena.jsx";
import BallWorld from "./BallWorld.jsx";
import FrameGovernor from "./FrameGovernor.jsx";
import { CAMERA } from "./camera.js";

// Everything three.js lives in this lazily loaded chunk (see BallLayer.jsx).
//
// Two transparent, fixed, full-screen canvases with pointer-events: none:
//   arena – BEHIND the content (z-0): court, net, dust, wireframe satellites
//   ball  – ABOVE the content (z-30): only the volleyball, which never rests
//           under text (hero anchor or corner dock), so nothing gets covered
// Both render on demand: the arena only while the hero is on screen, the ball
// only while something about it moves.
//
// Quality steps when frames run long: 2 = everything, 1 = no arena,
// 0 = ball at pixel ratio 1, below that → give up (2D ball).

// R3F puts pointer-events: auto on its own canvas container, which would
// override the pointer-events-none wrappers and swallow every click on the
// page. The scene hit-tests the cursor itself (window listeners), so the
// canvases never need pointer events.
const NO_POINTER = { pointerEvents: "none" };

export default function Scene3D({ lite, onReady, onLost, onFail }) {
  const [quality, setQuality] = useState(lite ? 1.5 : 2);
  const arenaFade = useRef(null);
  const [arenaOn, setArenaOn] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const stepDown = useCallback(() => {
    setQuality((q) => {
      const next = q >= 1.5 ? 1 : q - 1;
      if (next < 0) onFail?.();
      return next;
    });
  }, [onFail]);

  // A lost context (common on phones when the tab is backgrounded) hands
  // over to the 2D ball; BallLayer remounts the scene if it comes back.
  // Unmounting a Canvas force-loses its own context, so only count losses
  // while the scene is alive.
  const watchContext = useCallback(
    ({ gl }) => {
      gl.domElement.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        if (alive.current) onLost?.();
      });
    },
    [onLost]
  );

  const ballDpr = quality >= 1 ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const arenaDpr = Math.min(lite ? 1 : 1.25, window.devicePixelRatio || 1);

  return (
    <>
      {quality >= 1.5 && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000 ${arenaOn ? "opacity-100" : "opacity-0"}`}
        >
          <div ref={arenaFade} className="absolute inset-0">
            <Canvas
              flat
              style={NO_POINTER}
              frameloop="demand"
              dpr={arenaDpr}
              camera={CAMERA}
              gl={{ alpha: true, antialias: !lite, powerPreference: "high-performance" }}
              onCreated={(state) => {
                watchContext(state);
                requestAnimationFrame(() => setArenaOn(true));
              }}
            >
              <Arena lite={lite} fadeRef={arenaFade} />
            </Canvas>
          </div>
        </div>
      )}

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30">
        <Canvas
          flat
          style={NO_POINTER}
          frameloop="demand"
          dpr={ballDpr}
          camera={CAMERA}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          onCreated={watchContext}
        >
          <BallWorld onFirstFrames={onReady} />
          <FrameGovernor onSlow={stepDown} />
        </Canvas>
      </div>
    </>
  );
}
