// GitHub's linguist colours for the languages in these repos.
const COLORS = {
  Dart: "#00b4ab",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  CSS: "#663399",
  "C++": "#f34b7d",
  CMake: "#da3434",
  "Inno Setup": "#264b99",
  C: "#555555",
  Kotlin: "#a97bff",
};
const OTHER = "#8792a8";

const pct = (n) => (n < 1 ? "<1" : Math.round(n)) + " %";

// Language split as GitHub reports it (data/github.json). The coloured bar
// is decorative; the same numbers are written out as text right below it.
export default function LanguageBar({ languages }) {
  const entries = Object.entries(languages || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (!total) return null;

  const top = entries.slice(0, 3).map(([name, bytes]) => ({ name, share: (bytes / total) * 100 }));
  const rest = 100 - top.reduce((sum, l) => sum + l.share, 0);
  const segments = rest > 0.5 ? [...top, { name: "Sonstige", share: rest }] : top;

  return (
    <div className="mt-4">
      <div aria-hidden="true" className="flex h-1.5 gap-px overflow-hidden rounded-full bg-night-700">
        {segments.map((l) => (
          <span key={l.name} style={{ width: `${l.share}%`, background: COLORS[l.name] || OTHER }} />
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-haze">
        <span className="sr-only">Sprachen laut GitHub:</span>
        {segments.map((l) => (
          <span key={l.name} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: COLORS[l.name] || OTHER }} />
            {l.name} {pct(l.share)}
          </span>
        ))}
      </p>
    </div>
  );
}
