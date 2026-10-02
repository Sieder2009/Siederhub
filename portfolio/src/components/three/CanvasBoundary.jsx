import { Component } from "react";

// WebGL can fail for reasons outside our control (blocked drivers, exhausted
// contexts, browser flags). If the 3D scene throws, swallow it and report —
// the page falls back to the 2D ball instead of going down. (Same idea as the
// mc repo's CanvasBoundary.)
export default class CanvasBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn("3D scene disabled:", error);
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
