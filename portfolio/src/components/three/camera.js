// Both canvases (arena behind the content, ball above it) share one camera
// setup, so the ball, the court and the satellites line up on screen.
export const CAMERA_Z = 10;
export const CAMERA_FOV = 30;
export const CAMERA = { position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 120 };
