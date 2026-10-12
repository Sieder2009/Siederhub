// Toggle buttons (aria-pressed) in a labelled group. The result count is
// announced by the live region in sections/Rally.jsx, not here.
export default function ProjectFilter({ options, value, onChange, compact = false }) {
  const size = compact ? "h-9 px-3.5 text-xs" : "h-10 px-4 text-sm";
  return (
    <div role="group" aria-label="Projekte nach Technologie filtern" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`group inline-flex ${size} items-center gap-2 rounded-full border border-line font-medium text-mist transition duration-300 hover:-translate-y-0.5 hover:border-amber hover:text-cream focus-visible:-translate-y-0.5 focus-visible:text-cream active:scale-[0.97] aria-pressed:border-amber aria-pressed:bg-amber aria-pressed:text-night-950 aria-pressed:hover:text-night-950`}
        >
          {o.label}
          <span className="min-w-5 rounded-full bg-night-700 px-1.5 text-center font-mono text-xs tabular-nums text-cream transition-colors group-aria-pressed:bg-night-950/15 group-aria-pressed:text-night-950">
            {o.count}
            <span className="sr-only"> {o.count === 1 ? "Projekt" : "Projekte"}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
