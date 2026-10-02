// Small inline icons (stroke style like Lucide). Always decorative here —
// every icon sits next to visible text — so they are hidden from screen readers.

function Stroke({ children, className = "size-4", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowUpRight = (p) => (
  <Stroke {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Stroke>
);

export const ArrowDown = (p) => (
  <Stroke {...p}>
    <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
  </Stroke>
);

export const ArrowUp = (p) => (
  <Stroke {...p}>
    <path d="M12 19V5m0 0-6 6m6-6 6 6" />
  </Stroke>
);

export const Download = (p) => (
  <Stroke {...p}>
    <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 20h14" />
  </Stroke>
);

export const Code = (p) => (
  <Stroke {...p}>
    <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
  </Stroke>
);

export const Play = (p) => (
  <Stroke {...p}>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none" />
  </Stroke>
);

export const Pause = (p) => (
  <Stroke {...p}>
    <path d="M8 5v14M16 5v14" strokeWidth="3" />
  </Stroke>
);

export const Replay = (p) => (
  <Stroke {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Stroke>
);

export const Spark = (p) => (
  <Stroke {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" />
  </Stroke>
);

export const LinkIcon = (p) => (
  <Stroke {...p}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </Stroke>
);

// GitHub's mark (Octicons, MIT).
export const GitHub = ({ className = "size-4", ...props }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="currentColor" className={className} {...props}>
    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
  </svg>
);
