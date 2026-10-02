import ExternalLink from "../ui/ExternalLink.jsx";
import { GitHub, LinkIcon } from "../ui/icons.jsx";

export default function SiteFooter({ profile }) {
  const socials = profile.socials.filter((s) => s.url);
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-night-700 bg-night-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="font-display text-xl font-bold">
            {profile.name.toLowerCase()}
            <span className="text-amber">.</span>
          </p>
          <p className="mt-2 text-sm text-mist">{profile.role}</p>
        </div>

        {socials.length > 0 && (
          <nav aria-label="Profile & Links">
            <ul className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <li key={s.id}>
                  <ExternalLink
                    href={s.url}
                    className="group/link inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-cream transition duration-300 hover:-translate-y-0.5 hover:border-amber hover:text-amber focus-visible:-translate-y-0.5 focus-visible:border-amber focus-visible:text-amber motion-on:hover:shadow-[0_10px_24px_-12px_rgb(255_179_71/0.6)]"
                  >
                    {s.id === "github" ? <GitHub className="size-4" /> : <LinkIcon className="size-4" />}
                    {s.label}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <div className="border-t border-night-700/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs leading-relaxed text-haze sm:px-6 md:flex-row md:justify-between">
          <p>
            © {year} {profile.name} · Gebaut mit React, Three.js &amp; Tailwind CSS
          </p>
          <p>Keine Cookies, kein Tracking — deine Filter-Auswahl merkt sich nur dein eigener Browser.</p>
        </div>
      </div>
    </footer>
  );
}
