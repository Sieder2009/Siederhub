# Sieder — Informatiker-Portfolio

Persönliches Portfolio als ein einziger, durchchoreografierter Ballwechsel: ein
physikbasierter 3D-Volleyball reist durch die ganze Seite.
**React 19 · React Three Fiber / Three.js · GSAP ScrollTrigger · Lenis · Tailwind CSS v4 · Vite 8**

```bash
npm install
npm run dev          # Entwicklung  → http://localhost:5173
npm run build        # Produktion   → dist/
npm run preview      # Build lokal ansehen
npm test             # Tests (node --test): Physik, Ball-Plätze, Projekt-Reihe, Glyphen
npm run sync:github  # Repo-Daten (Sprachen, Datum) neu von GitHub holen
npm run ball:svg     # 2D-Ball neu erzeugen (nach Änderung am Panel-Muster)
```

Testhilfen per URL: `?3d=force` erzwingt 3D in voller Qualität, auch wenn es langsam ist
(z. B. VMs, automatisierte Checks), `?3d=off` zeigt immer den 2D-Ball.

## Die Seite als Ballwechsel

| # | Abschnitt | Was passiert (Desktop, Animationen an) |
|---|---|---|
| 01 | **Aufschlag** (`#top`) | Riesiger SIEDER-Schriftzug, Sternenhimmel. Der Ball wird von weit hinten aufgeschlagen; wenn er landet, läuft eine Erschütterung durch die Buchstaben — vom Buchstaben aus, der dem Ball am nächsten ist. |
| 02 | **Jeder Satz zählt** (`#warum`) | Die Überschrift bleibt stehen (sticky), vier Sätze über die Projekte scrollen vorbei; der gerade gelesene ist hell, die anderen treten zurück. Der Ball wartet unter der Überschrift. |
| 03 | **Ball im Spiel** (`#projekte`) | Gepinnte Projekt-Reihe: ein Pixel nach unten = ein Pixel nach links. Karten mit Status-Badge und Pill-Buttons; am Ende „Noch nicht genug?“ — der Ball fliegt auf das GitHub-Logo und bleibt darauf sitzen. |
| 04 | **Angriff** (`#angriff`) | Der Ball wird auf dich geschmettert: Er wächst, bis er den Bildschirm füllt, Creme flutet aus der Mitte, der Ball löst sich darin auf — der Tag (zweiter Akt) beginnt. |
| 05 | **Werkzeug mit Beleg** (`#werkzeug`) | Sechs Karten werden aus einem Stapel rechts unten ausgeteilt. Keine Prozent-Balken: Jede Karte nennt die Projekte, in denen das Werkzeug steckt (aus `projects.js` berechnet). |
| 06 | **Kontakt** (`#kontakt`, Footer) | „Lust auf ein Match?“ gleitet aus Masken hoch, der Ball dreht sich ein letztes Mal. Kontakt über GitHub und Modrinth — kein Formular, keine E-Mail-Adresse auf der Seite. |

Dazu: Fortschrittslinie oben, Tab-Icon mit Scroll-Fortschrittsring, Tab-Titel je
Abschnitt, Lichtschein unter der Maus (nur nachts), Buttons mit rollender Beschriftung und
Icon-Wechsel. Auf den Projektkarten zeigt Hover/Fokus, wohin ein Button führt: Die Adresse
tippt sich in einen Chip, bei „Quellcode“ wird der Screenshot zusätzlich hinter einem
Scan-Strich in Code-Zeichen umgerechnet.

**Ruhiger Pfad:** Handys, Bildschirme unter 960 × 700 px, „Bewegung reduzieren“ und der
Schalter „Animationen“ bekommen dieselben Inhalte als normales, senkrechtes Layout — nichts
gepinnt, kein Lenis. Bei „Bewegung reduzieren“ erklärt ein kurzer Hinweis, warum die Seite
ruhig ist, und bietet an, die Animationen trotzdem einzuschalten.

---

## 1. Einordnung ins bestehende Repo

Das Portfolio ist ein **eigenständiges Modul** in `Siederhub/portfolio/`. Die bestehende
GYM-STATS-Seite (Root `index.html`, `training-plans/`, `extras/`, `css/`, `js/`)
bleibt unangetastet und läuft weiter. Die Struktur folgt bewusst dem `mc`-Repo
(`components/`, `components/three/`, `data/`, `hooks/`, `lib/`, `styles/`) — gleiche
Muster wie dort: lazy geladene 3D-Szene, WebGL-Prüfung, `CanvasBoundary`,
Inhalte zentral in `data/`.

```
Siederhub/
├── index.html, training-plans/, extras/, css/, js/        ← GYM STATS (unverändert)
├── .github/
│   ├── workflows/pages.yml             Deploy: GYM STATS + Portfolio + Block Blast (Abschnitt 8)
│   └── scripts/assemble-site.sh        baut das Pages-Verzeichnis zusammen (CI und lokal)
└── portfolio/                          ← NEU
    ├── index.html                      Einstieg + Motion-Vorabschaltung (kein Flackern)
    ├── vite.config.js                  base "./" → läuft unter jedem Unterpfad
    ├── public/
    │   ├── favicon.svg
    │   └── projects/*.webp             Kartenbilder (echte Screenshots, 1200 + 640 px)
    ├── scripts/
    │   ├── sync-github.mjs             GitHub-API → src/data/github.json (nur beim Bauen)
    │   └── generate-ball-svg.mjs       Panel-Muster → 2D-Fallback-Ball
    ├── tests/                          ballPhysics, spots, rally, glyphs (node --test)
    └── src/
        ├── main.jsx, App.jsx
        ├── data/                       ★ Inhalte — hier pflegst du alles
        │   ├── profile.js              Name, Rolle, Intro, Social Links (null = ausgeblendet)
        │   ├── projects.js             Projekte, Tags, geprüfte Links
        │   ├── story.js                Texte „Jeder Satz zählt“ + Werkzeug-Karten (Belege berechnet)
        │   └── github.json             generiert: Sprachen + letzte Aktualisierung
        ├── lib/                        Logik ohne UI
        │   ├── sections.js             die Abschnitte: Tab-Titel, Akt (Nacht/Tag), Ball-Plätze
        │   ├── sectionStore.js         welcher Abschnitt gerade „spielt“ (+ Titel, Akt)
        │   ├── smoothScroll.js         Lenis + GSAP ScrollTrigger, Anker-Sprünge mit Fokus
        │   ├── spots.js                welcher Ball-Platz sichtbar ist (rein, getestet)
        │   ├── rally.js                Mathe der gepinnten Projekt-Reihe (rein, getestet)
        │   ├── glyphs.js               Screenshot → Code-Zeichen (rein, getestet)
        │   ├── ballPhysics.js          reine Physik (exakte Integratoren, getestet)
        │   ├── volleyballPattern.js    18-Panel-Geometrie (Shader + SVG teilen sie)
        │   ├── scrollVelocity.js       Scroll-Geschwindigkeit in px/s
        │   ├── ballBridge.js           Brücke DOM ⇄ 3D-Szene (Status, Befehle, aktueller Platz)
        │   ├── motionStore.js          Animationen an/aus (WCAG 2.2.2)
        │   ├── interestStore.js        Personalisierung (nur localStorage)
        │   ├── filterStore.js          aktiver Projektfilter
        │   ├── capabilities.js         WebGL / Save-Data / Mobil-Erkennung
        │   └── store.js, storage.js    Mini-Store + ausfallsicheres localStorage
        ├── hooks/                      useMedia (+ useCinematic), useMagnetic, useInView, …
        ├── components/
        │   ├── sections/               Hero, Beats, Rally (+ RallyCard, GlyphScan), Dive, Toolkit, Finale
        │   ├── motion/                 ScrollProgress, LiveFavicon, PointerGlow, CalmNotice
        │   ├── layout/                 SiteHeader, MotionToggle
        │   ├── hero/BallStage.jsx      Hero-Anker + 2D-Ball + „Aufschlag wiederholen“
        │   ├── projects/ProjectFilter.jsx
        │   ├── ball/                   VolleyballSVG + generierte Pfaddaten
        │   ├── ui/                     Pill, RollLabel, ExternalLink, Icons
        │   ├── BallLayer.jsx           lädt die 3D-Szene lazy (oder gar nicht)
        │   ├── BallDock.jsx            „Nach oben“-Button, in dem der Ball parken kann
        │   └── three/                  ← eigener Lazy-Chunk (three + R3F)
        │       ├── Scene3D.jsx         2 Canvases, Qualitätsstufen, Kontextverlust
        │       ├── BallWorld.jsx       Volleyball: Aufschlag, Reise zwischen den Plätzen, Spin, Hover
        │       ├── volleyballMaterial.js  GLSL-Shader des Balls
        │       ├── Arena.jsx           Sternenhimmel (Warp-Streifen beim Scrollen) + Wireframe-Satelliten
        │       ├── FrameGovernor.jsx   misst FPS, stuft herunter
        │       └── CanvasBoundary.jsx, camera.js
        └── styles/index.css            Tailwind-v4-Theme (@theme), Nacht/Tag, Pills, Effekte
```

## 2. Komponenten & Datenfluss

```
App ── useSectionTracking (Titel, Akt) · initAnchors · syncSmoothScroll (Lenis)
├── ScrollProgress · SiteHeader (Navigation · MotionToggle) · PointerGlow
├── BallLayer ── lazy ─► Scene3D
│                        ├── Canvas „Himmel“ (z 0, hinter dem Inhalt) ─ Arena
│                        └── Canvas „Ball“   (z 30, über dem Inhalt)  ─ BallWorld, FrameGovernor
├── main
│   ├── Hero ─── BallStage ([data-ball-spot="hero"])
│   ├── Beats ── [data-ball-spot="beats"]
│   ├── Rally ── ProjectFilter · RallyCard ×6 (AddressChip, GlyphScan) · GitHub-Karte [data-ball-spot="github"]
│   ├── Dive ─── [data-ball-spot="dive"] (wächst mit dem Scrollen)
│   └── Toolkit ─ 6 Karten · [data-ball-spot="toolkit"]
├── Finale (Footer) ─ [data-ball-spot="finale"]
└── BallDock ([data-ball-dock]) · CalmNotice · LiveFavicon
```

- **Der Ball reist:** `lib/sections.js` sagt für jeden Abschnitt, wo der Ball sein will
  (z. B. Projekte: erst das GitHub-Logo, sonst das Dock). Die Szene misst jedes Frame die
  leeren Platz-Boxen (`[data-ball-spot]`) und rechnet sie in Weltkoordinaten um (Kamera
  fix auf z = 10, Blick entlang −z); der erste Platz, der zu ≥ 60 % sichtbar ist, gewinnt
  (`pickSpot`, getestet). Darum sitzt der Ball auf jeder Bildschirmgröße exakt im Layout,
  und zwar immer in einem **textfreien** Bereich — nur beim Angriff fliegt er bewusst über alles.
- **Eine Scroll-Quelle:** Lenis glättet Mausrad/Trackpad und treibt den GSAP-Ticker; alle
  ScrollTrigger lesen dieselbe Position. Gepinnt wird mit CSS `sticky` in einer hohen
  „Runway“, nie mit `position: fixed` — kein Layout-Shift.
- **Stores statt Provider:** `createStore` + `useSyncExternalStore`. Dieselben Stores
  liest auch der lazy geladene 3D-Chunk (gleiche Modulinstanz).
- **`ballBridge`:** Status `off | loading | ready | failed` (steuert 2D vs. 3D), Befehle
  `serve` / `spike` vom DOM an die Szene und der aktuelle Platz des Balls.

## 3. Die Volleyball-Animation

| Phase | Umsetzung |
|---|---|
| **Aufschlag** beim Betreten | Der Aufschläger steht hinter der gegnerischen Grundlinie (z = −40) — genau auf dem Kamerastrahl durch den Anker, deshalb bleibt die Bahn auf dem Bildschirm in der Ball-Spalte. Wurf (Parabel, Scheitel exakt nach 0,62 s) → kurz nach dem Scheitel Treffer (Topspin 30 rad/s + kleiner Lichtring) → Flug mit Schwerkraft + Magnus-Zug, analytisch gelöst, sodass er **exakt** im Anker landet (`planServe`, getestet) → Annahme: 82 % des Impulses werden „geschluckt“, der Rest federt aus. Kometenschweif als Motion-Blur. |
| **Ruhe im Hero** | Gedämpfte Feder (ω 8,5, ζ 0,6) zum Anker, leichtes Schweben, Leerlauf-Drehung 0,5 rad/s, Bodenschatten über `--ball-shadow`. |
| **Scroll-Sync + Geschwindigkeitskopplung** | `ω_ziel = 0,0105 · v_scroll` (rad/s pro px/s, gedeckelt bei 30). Die echte Winkelgeschwindigkeit folgt mit Trägheit: `ω ← ω_ziel + (ω − ω_ziel)·e^(−2,6·dt)`. Der Drehwinkel wird pro Schritt **exakt** integriert ⇒ identisch bei 30 und 144 FPS (Test). Gemessen: Leerlauf 0,5 · langsam ≈ 3 · schnell ≈ 12–14 rad/s, danach sanftes Auslaufen. |
| **Reise durch die Seite** | Wechselt der Abschnitt, fliegt der Ball per Feder (mit Kometenschweif) zu dessen Platz: unter die Überschrift, ins Dock, aufs GitHub-Logo, zu den Werkzeug-Karten, an den Kontakt. Beim **Angriff** folgt er einer wachsenden Box mit straffer Feder, füllt den Bildschirm und wird ausgeblendet (`data-ball-opacity`). Im Dock schläft die Render-Schleife, sobald nichts mehr dreht. |
| **Interaktion** | Hover (Maus): +6 % Größe, Rim-Licht, Neigung zum Zeiger · Klick: Schmetterball (Impuls + Spin + Ring). Tastatur: „Aufschlag wiederholen“. |
| **Shader** | Panel-Muster wird pro Pixel aus der Kugelnormalen berechnet (Würfelprojektion, 3 Streifen/Fläche) — keine Textur, scharf in jeder Größe, Nähte per `fwidth` geglättet. Bei schnellem Spin verschmelzen die Farben (Motion-Blur). |

## 4. Die fünf Pflicht-Trends

| Trend | Umsetzung |
|---|---|
| **Interaktive 3D-Elemente** | Sternenhimmel, durch den man fliegt — schnelles Scrollen zieht die Sterne zu Lichtstreifen, nach oben scrollen kehrt die Flugrichtung um (alles im Vertex-Shader); 5 Wireframe-Satelliten um den Hero-Ball reagieren auf Hover, Klick (Spin-Stoß) und Scrollen; Kamera-Parallaxe zur Maus; der Ball selbst (Klick = Schmetterball) reist durch alle Abschnitte. |
| **Barrierefreiheit (EAA)** | siehe Abschnitt 5 |
| **Micro-Interactions** | Pill-Buttons: Beschriftung rollt Buchstabe für Buchstabe, Icon gleitet raus und sein Zwilling rein, leichter Magnet-Zug zum Zeiger. Projektkarten: Adresse tippt sich in einen Chip, „Quellcode“ scannt den Screenshot in Code-Zeichen, Bild-Zoom. Filter-Chips mit Zähler, Schriftzug-Erschütterung beim Aufschlag. **Jeder Hover-Effekt hat ein identisches `:focus-visible`-Gegenstück**, auf Touch zeigt Drücken die Vorschau. |
| **Personalisierte UX** | Filter nach Technologie; die Stack-Links im Hero springen vorgefiltert zu den Projekten. Klicks (Filter, Stack-Links, Projektlinks) ergeben ein lokales, zeitlich abklingendes Interessenprofil → beim nächsten Besuch stehen passende Projekte vorn („Für dich“), der passende Stack-Link leuchtet live, die passende Werkzeug-Karte ist als „Dein Schwerpunkt“ markiert. Kein Tracking, nichts verlässt den Browser, „Zurücksetzen“ jederzeit. |
| **Performance** | siehe Abschnitt 6 |

## 5. Barrierefreiheit (EAA → EN 301 549 → WCAG 2.1 AA)

- **Semantik:** `header`/`nav`/`main`/`footer`, eine `h1` (der Schriftzug ist für
  Screenreader „Sieder — Informatiker · Apps & Websites“), `h2` je Abschnitt, `h3` je Karte,
  `article` pro Projekt, Listen für Sätze/Karten/Stack, der reine Übergang „Angriff“ ist
  `aria-hidden`.
- **Tastatur:** Skip-Link, logische Tab-Reihenfolge, Anker-Sprünge (Navigation, „Nach oben“)
  setzen den Fokus auf die Überschrift des Ziels. Bekommt eine Karte der gepinnten Reihe den
  Fokus, während sie außerhalb des Bildes liegt, scrollt die Seite genau so weit, dass sie
  ganz sichtbar ist (`scrollForCard`, getestet). „Zurücksetzen“ fokussiert die Überschrift.
- **ARIA:** Filter = Toggle-Buttons mit `aria-pressed` in `role="group"`, Ergebnis per
  `role="status"` angesagt („2 Projekte mit Flutter angezeigt“); externe Links mit
  „(öffnet in neuem Tab)“ + `rel="noopener noreferrer"`; rollende Beschriftungen sind für
  Screenreader einfacher Text; Canvases und Vorschau-Effekte `aria-hidden`, der Hero-Ball hat
  `role="img"` mit Beschreibung.
- **Bewegung:** `prefers-reduced-motion` ⇒ ruhiger Pfad: statischer 2D-Ball, **der 3D-Chunk
  wird gar nicht geladen**, nichts gepinnt, kein Lenis — plus Hinweis mit „Animationen
  trotzdem zeigen“. Sichtbarer Schalter „Animationen“ (WCAG 2.2.2), gespeichert, greift vor
  dem ersten Paint. Pausiert = exakt der ruhige Pfad.
- **Kontrast:** Nacht — cream 17,2 : 1 · mist 9,5 : 1 · haze 6,3 : 1 · amber 11,1 : 1 · Text auf
  Amber 11,1 : 1. Tag — ink 16,9 : 1 · ink-soft 8,2 : 1 · court-deep 7,3 : 1 · ember-deep
  5,7 : 1. Zurückgetretene Sätze bei „Jeder Satz zählt“ bleiben bei 4,7 : 1 (Text) bzw.
  3,4 : 1 (große Überschrift). Bedienelement-Rahmen ≥ 3,3 : 1 (WCAG 1.4.11).
- **Alternativtexte** für alle Projektbilder (beschreiben den Bildinhalt).

## 6. Performance

| Teil | Größe (gzip) | Wann geladen |
|---|---|---|
| App (React + GSAP/ScrollTrigger + Lenis + Seite) | ≈ 145 kB JS + 17 kB CSS | sofort |
| 3D-Chunk (three + R3F) | ≈ 249 kB | erst im Leerlauf nach dem ersten Paint — **nie** bei Reduced Motion, Save-Data oder ohne (schnelles) WebGL |
| Schriften (selbst gehostet) | ≈ 150 kB (nur Latin-Subsets, inkl. Bebas Neue) | sofort, `font-display: swap` |
| Projektbilder | 4–28 kB (640 px) / 9–89 kB (1200 px) WebP | lazy, mit `srcset`, feste Maße (kein Layout-Shift) |

- **Render on demand:** Der Himmel rendert nur im ersten Akt (bis zum Angriff); der Ball
  schläft im Dock, sobald nichts mehr dreht. Pixel-Ratio gedeckelt (Ball 2, Himmel 1,25).
- **Nur Compositor-Arbeit beim Scrollen:** Scroll-getriebene Änderungen schreiben nur
  `transform`, `opacity`, `clip-path` bzw. Größen der leeren Ball-Plätze. Die Projekt-Reihe
  misst Kartengrößen nur beim Refresh (Resize, Filter), nicht pro Frame.
- **Glyphen-Scan:** wird erst beim ersten Hover gebaut (Bild auf eine Zelle pro Zeichen
  verkleinert, einmal pro Kartengröße berechnet) und zeichnet pro Frame nur die neu
  aufgedeckten Spalten.
- **Adaptive Qualität:** `FrameGovernor` misst FPS → Arena aus → Ball-DPR 1 → 2D-Fallback.
  Verlorener WebGL-Kontext → 2D, neuer Versuch beim Zurückkehren in den Tab.
- **Aufschlag auch auf langsamen Geräten:** getestet mit 4× CPU-Drosselung + 1,6 Mbit/s
  (3D nach 4,3 s) und 6× + 0,8 Mbit/s (3D nach 9,3 s) — der Aufschlag spielt in beiden
  Fällen. Erst wenn der 3D-Chunk *nach Ladebeginn* länger als 6 s braucht, springt der
  2D-Ball ein; der 3D-Ball blendet dann an Ort und Stelle ein.
- **Shader statt Wasm:** Die rechenintensiven Effekte (1 500 Sterne samt Warp-Streifen,
  Panel-Muster, Glow-Schweif) laufen komplett auf der GPU — die CPU setzt pro Frame nur ein
  paar Uniforms.
  WebAssembly lohnt sich erst bei CPU-lastiger Simulation vieler Körper (z. B. Rapier-Physik,
  ~1,5 MB); für einen Ball ist die exakte analytische Physik schneller und leichter.
- **Keine Fremd-Requests:** Schriften lokal, GitHub-Daten zur Build-Zeit — DSGVO-freundlich.

## 7. Projekte & Links

Jede Karte hat einen großen Button, über den man das Projekt **direkt ansehen** kann, plus
den Quellcode. Alle Links in `src/data/projects.js` wurden am 09.10.2026 im Browser geprüft
(gerendert — ein Status 200 allein beweist bei Single-Page-Apps nichts):

| Projekt | Button | Läuft unter |
|---|---|---|
| Ironpeak Fitness | Produktseite ansehen · Herunterladen | `ironpeak.siggidy.dev` (Produktseite aus dem GymTracker-Repo, drei Rechner der App zum Ausprobieren) · `GymTracker/releases/latest` |
| affenmal | Live ansehen | `mc.siggidy.dev` |
| GYM STATS | Live ansehen | `sieder2009.github.io/Siederhub/` |
| Block Blast | Im Browser spielen | `sieder2009.github.io/Siederhub/projects/blockblast/` — Flutter-Web-Build, entsteht bei jedem Deploy frisch aus dem BlockBlast-Repo |
| Raspberry Pi Website | Live ansehen | `sieder2009.github.io/Raspberrypi/` — tote Custom-Domain entfernt (`CNAME` gelöscht, 08.10.2026) |
| CyberSpace Terminal | Live ansehen | `sieder2009.github.io/Siederhub/extras/` (der Inhalt des Terminal-Repos läuft dort weiter) |

Link-Typen in `projects.js`: `live`, `play`, `download`, `code` — sie bestimmen Symbol und
Badge der Karte. `shader` (leer) und das Profil-README sind bewusst keine Karten.

Kleinigkeiten in den anderen Repos (betreffen das Portfolio nicht):

- **Terminal:** Pages leitet noch auf `monster.sieder.plattnericus.dev` (ohne DNS) — `CNAME`
  löschen öffnet `sieder2009.github.io/Terminal/` wieder.
- **mc:** Das „Website“-Feld des Repos zeigt noch auf `monster.sieder.plattnericus.dev/mc`.
- **GymTracker-Produktseite:** `canonical`, `og:url` und `og:image` enthalten noch den
  Platzhalter `__SITE_URL__`.
- **Raspberrypi:** Support-Formular (`/api/support`) und `/cdn-cgi/l/email-protection`-Links
  stammen von Cloudflare und funktionieren auf GitHub Pages nicht.

## 8. Deployment (GitHub Actions)

`.github/workflows/pages.yml` baut bei jedem Push auf `main` (oder per „Run workflow“) die
komplette Seite und veröffentlicht sie auf GitHub Pages:

| Pfad | Inhalt |
|---|---|
| `/Siederhub/` | GYM STATS — alle eingecheckten Dateien aus dem Repo-Root, wie bisher |
| `/Siederhub/portfolio/` | dieses Portfolio (`npm ci` → `npm test` → `npm run build`) |
| `/Siederhub/projects/blockblast/` | Block Blast: `flutter build web` (Flutter 3.47.4) aus `Sieder2009/BlockBlast` |

**Einmalig nötig:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
Danach Actions → „Pages“ → „Run workflow“ (oder den nächsten Push abwarten).

Lokal dasselbe zusammenbauen:

```bash
cd portfolio && npm run build && cd ..
bash .github/scripts/assemble-site.sh _site [pfad/zu/BlockBlast/build/web]
```

`_site/` muss unter `/Siederhub/` ausgeliefert werden (wie auf GitHub Pages), weil Block Blast
mit `--base-href /Siederhub/projects/blockblast/` gebaut wird. Unter Windows braucht
`flutter build web` für Plugins Symlinks (Entwicklermodus); im CI (Linux) entfällt das.

## 9. Nächste Schritte

1. **Erfahrungslevel** — die Werkzeug-Karten zeigen bewusst Belege statt Prozent-Balken;
   Level kommen erst dazu, wenn du sie selbst festlegst (`src/data/story.js`).
2. **Kontakt** — Formular (z. B. Formspree / eigener Endpoint), Social Links aus `profile.js`
   (LinkedIn/X/Discord eintragen → erscheinen automatisch in `Finale`).
3. **Projekt-Clips** — kurze Videos statt Screenshots auf den Karten (der Glyphen-Scan
   funktioniert mit jedem Bild).
4. Optional: `og:image` (Vorschaubild beim Teilen), Portfolio als Startseite von Siederhub
   (GYM STATS nach `/gym/`).
