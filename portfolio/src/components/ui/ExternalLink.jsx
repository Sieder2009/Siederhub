import { ArrowUpRight } from "./icons.jsx";

// Every link that leaves the site: new tab, no opener access, and screen
// readers are told up front that a new tab will open. The trailing arrow is
// sized by the link's own class (.serve, .line-link, .ctl), else by .ext-icon,
// and nudges toward where it goes on hover and focus.
export default function ExternalLink({ href, children, className = "", icon = true, srContext, ...props }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
      {children}
      {srContext && <span className="sr-only">: {srContext}</span>}
      <span className="sr-only"> (öffnet in neuem Tab)</span>
      {icon && <ArrowUpRight className="ext-icon" />}
    </a>
  );
}
