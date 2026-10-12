// A label whose letters roll over one after another on hover/focus of the
// nearest .pill or .roll-host (CSS in styles/index.css). Each letter is
// stacked twice; the stack slides up by half. Screen readers get the plain
// text once.
export default function RollLabel({ text }) {
  return (
    <>
      <span className="roll" aria-hidden="true">
        {[...text].map((ch, i) => (
          <span key={i} className="roll-ch" style={{ "--i": i }}>
            <span>{ch}</span>
            <span>{ch}</span>
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
