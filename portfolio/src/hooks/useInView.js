import { useEffect, useRef, useState } from "react";

// Becomes true the first time the element scrolls into view (and stays true).
// Without IntersectionObserver everything simply counts as visible.
export function useInView(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => typeof window === "undefined" || !("IntersectionObserver" in window));

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}
