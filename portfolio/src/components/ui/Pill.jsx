import { forwardRef } from "react";

// Kept for the call sites that still use it: maps the old pill tones onto
// the two button styles of styles/index.css. The label is plain text, the
// one trailing icon says where the link goes, and the class sizes it.
//   tone "amber" (default) → .serve · "ink" → .serve[data-tone="ink"]
//   tone "ghost" | "ink-ghost", or size "sm" → .line-link
// hoverIcon is accepted and ignored (no icon swap any more). Renders a link
// when it has an href, otherwise a button.
const Pill = forwardRef(function Pill(
  { href, external = false, icon: Icon, hoverIcon, label, tone = "amber", size, className = "", srContext, ...props },
  ref
) {
  const line = tone === "ghost" || tone === "ink-ghost" || size === "sm";
  const content = (
    <>
      {label}
      {srContext && <span className="sr-only">: {srContext}</span>}
      {external && <span className="sr-only"> (öffnet in neuem Tab)</span>}
      {Icon && <Icon className="" />}
    </>
  );

  const shared = {
    ref,
    className: `${line ? "line-link" : "serve"} ${className}`.trim(),
    "data-tone": !line && tone === "ink" ? "ink" : undefined,
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
