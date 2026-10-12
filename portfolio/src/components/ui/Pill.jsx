import { forwardRef } from "react";
import RollLabel from "./RollLabel.jsx";

// The page's button: a pill with a round icon well on the left. On hover or
// keyboard focus the icon slides out while its twin slides in, and the label
// rolls over letter by letter (styles/index.css → .pill). Renders a link
// when it has an href, otherwise a button.
//   tone: "amber" (default) | "ghost" | "ink" | "ink-ghost"
//   size: undefined | "sm"
const Pill = forwardRef(function Pill(
  { href, external = false, icon: Icon, hoverIcon, label, tone = "amber", size, className = "", srContext, ...props },
  ref
) {
  const Twin = hoverIcon || Icon;
  const content = (
    <>
      {Icon && (
        <span className="pill-icon" aria-hidden="true">
          <Icon className="" />
          <Twin className="" />
        </span>
      )}
      <span className="pill-label">
        <RollLabel text={label} />
      </span>
      {srContext && <span className="sr-only">: {srContext}</span>}
      {external && <span className="sr-only"> (öffnet in neuem Tab)</span>}
    </>
  );

  const shared = {
    ref,
    className: `pill ${className}`,
    "data-tone": tone === "amber" ? undefined : tone,
    "data-size": size,
    ...props,
  };

  if (href) {
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)} {...shared}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" {...shared}>
      {content}
    </button>
  );
});

export default Pill;
