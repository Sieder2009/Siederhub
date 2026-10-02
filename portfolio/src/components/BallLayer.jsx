import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useStore } from "../lib/store.js";
import { motionStore } from "../lib/motionStore.js";
import { ballStatus } from "../lib/ballBridge.js";
import { canRender3D, liteMode } from "../lib/capabilities.js";
import CanvasBoundary from "./three/CanvasBoundary.jsx";

// three.js + React Three Fiber are a separate chunk. It is only requested
// when motion is on, WebGL works and Save-Data is off — and even then only
// once the browser is idle after first paint. Everyone else (and everyone
// during the first moments) gets the 2D ball and never downloads it.
const Scene3D = lazy(() => import("./three/Scene3D.jsx"));

export default function BallLayer() {
  const motion = useStore(motionStore);
  const wants = motion === "on" && canRender3D;
  const [idle, setIdle] = useState(false);
  const [dead, setDead] = useState(false); // threw / too slow: 2D for the rest of the visit
  const [lost, setLost] = useState(false); // WebGL context lost: 2D until the tab is back
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!wants || idle) return;
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setIdle(true), 400);
    return () => clearTimeout(id);
  }, [wants, idle]);

  useEffect(() => {
    if (!wants) ballStatus.set("off");
    else if (dead || lost) ballStatus.set("failed");
    else if (!idle) ballStatus.set("pending");
    else if (ballStatus.get() !== "ready") ballStatus.set("loading");
  }, [wants, idle, dead, lost, generation]);

  // a lost context usually means the tab was in the background — try again
  // with a fresh canvas once it is visible
  useEffect(() => {
    if (!lost) return;
    const retry = () => {
      if (document.visibilityState !== "visible") return;
      setLost(false);
      setGeneration((g) => g + 1);
    };
    document.addEventListener("visibilitychange", retry);
    return () => document.removeEventListener("visibilitychange", retry);
  }, [lost]);

  const onReady = useCallback(() => ballStatus.set("ready"), []);
  const onLost = useCallback(() => setLost(true), []);
  const onFail = useCallback(() => setDead(true), []);

  if (!wants || !idle || dead || lost) return null;

  return (
    <CanvasBoundary onError={onFail}>
      <Suspense fallback={null}>
        <Scene3D key={generation} lite={liteMode} onReady={onReady} onLost={onLost} onFail={onFail} />
      </Suspense>
    </CanvasBoundary>
  );
}
