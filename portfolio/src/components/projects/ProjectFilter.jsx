// Toggle buttons (aria-pressed) in a labelled group, drawn as one segmented
// strip: the pressed segment is the only amber in it. The count is plain text
// after the label. The result count is announced by the live region in
// sections/Rally.jsx, not here.
export default function ProjectFilter({ options, value, onChange }) {
  return (
    <div role="group" aria-label="Projekte nach Technologie filtern" className="seg">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className="seg-item">
          {o.label}
          <span className="seg-count">
            {o.count}
            <span className="sr-only"> {o.count === 1 ? "Projekt" : "Projekte"}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
