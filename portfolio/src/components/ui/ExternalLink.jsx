import { ArrowUpRight } from "./icons.jsx";

// Every link that leaves the site: new tab, no opener access, and screen
// readers are told up front that a new tab will open.
export default function ExternalLink({ href, children, className = "", icon = true, srContext, ...props }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
      {children}
      {srContext && <span className="sr-only">: {srContext}</span>}
      {icon && <ArrowUpRight className="size-3.5 shrink-0 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 group-focus-visible/link:-translate-y-0.5 group-focus-visible/link:translate-x-0.5" />}
      <span className="sr-only"> (öffnet in neuem Tab)</span>
    </a>
  );
}
