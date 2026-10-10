# Sieder — Informatiker-Portfolio

Persönliches Portfolio mit physikbasierter 3D-Volleyball-Animation.
**React 19 · React Three Fiber / Three.js · Tailwind CSS v4 · Vite 8**

```bash
npm install
npm run dev          # Entwicklung  → http://localhost:5173
npm run build        # Produktion   → dist/
npm run preview      # Build lokal ansehen
npm test             # Physik-Tests (node --test)
npm run sync:github  # Repo-Daten (Sprachen, Datum) neu von GitHub holen
npm run ball:svg     # 2D-Ball neu erzeugen (nach Änderung am Panel-Muster)
```

Testhilfen per URL: `?3d=force` erzwingt 3D (z. B. in VMs), `?3d=off` zeigt immer den 2D-Ball.

---

## 1. Einordnung ins bestehende Repo

Das Portfolio ist ein **eigenständiges Modul** in `Siederhub/portfolio/`. Die bestehende
GYM-STATS-Seite (Root `index.html`, `app/`, `training-plans/`, `extras/`, `css/`, `js/`)
bleibt unangetastet und läuft weiter. Die Struktur folgt bewusst dem `mc`-Repo
(`components/`, `components/three/`, `data/`, `hooks/`, `lib/`, `styles/`) — gleiche
Muster wie dort: lazy geladene 3D-Szene, WebGL-Prüfung, `CanvasBoundary`,
Inhalte zentral in `data/`.

```
Siederhub/
├── index.html, app/, training-plans/, extras/, css/, js/, img/   ← GYM STATS (unverändert)
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
    ├── tests/ballPhysics.test.js       Aufschlag, Feder, Trägheit, 30 vs. 144 FPS
    └── src/
        ├── main.jsx, App.jsx
        ├── data/                       ★ Inhalte — hier pflegst du alles
        │   ├── profile.js              Name, Headline, Social Links (null = ausgeblendet)
        │   ├── projects.js             Projekte, Tags, geprüfte Links
        │   └── github.json             generiert: Sprachen + letzte Aktualisierung
        ├── lib/                        Logik ohne UI
        │   ├── ballPhysics.js          reine Physik (exakte Integratoren, getestet)
        │   ├── volleyballPattern.js    18-Panel-Geometrie (Shader + SVG teilen sie)
        │   ├── scrollVelocity.js       Scroll-Geschwindigkeit in px/s
        │   ├── ballBridge.js           Brücke DOM ⇄ 3D-Szene (Status, Befehle)
        │   ├── motionStore.js          Animationen an/aus (WCAG 2.2.2)
        │   ├── interestStore.js        Personalisierung (nur localStorage)
        │   ├── filterStore.js          aktiver Projektfilter
        │   ├── capabilities.js         WebGL / Save-Data / Mobil-Erkennung
        │   ├── store.js, storage.js    Mini-Store + ausfallsicheres localStorage
        ├── hooks/                      useScrollSpin, useMagnetic, useInView, …
        ├── components/
        │   ├── layout/                 SiteHeader, MotionToggle, SiteFooter
        │   ├── hero/                   Hero, BallStage (Anker + 2D-Ball), StackChips
        │   ├── projects/               ProjectsSection, ProjectFilter, ProjectCard, LanguageBar
        │   ├── ball/                   VolleyballSVG + generierte Pfaddaten
        │   ├── ui/                     ExternalLink, Icons, Button-Stile
        │   ├── BallLayer.jsx           lädt die 3D-Szene lazy (oder gar nicht)
        │   ├── BallDock.jsx            „Nach oben“-Button, in dem der Ball landet
        │   └── three/                  ← eigener Lazy-Chunk (three + R3F)
        │       ├── Scene3D.jsx         2 Canvases, Qualitätsstufen, Kontextverlust
        │       ├── BallWorld.jsx       Volleyball: Aufschlag, Feder, Spin, Hover, Dock
        │       ├── volleyballMaterial.js  GLSL-Shader des Balls
        │       ├── Arena.jsx           Spielfeld, Netz, GPU-Staub, Wireframe-Satelliten
        │       ├── FrameGovernor.jsx   misst FPS, stuft herunter
        │       └── CanvasBoundary.jsx, camera.js
        └── styles/index.css            Tailwind-v4-Theme (@theme), Fokus, Motion-Schalter
```

## 2. Komponenten & Datenfluss

```
App
├── SiteHeader ─ Navigation · MotionToggle (aria-pressed)
├── BallLayer ── lazy ─► Scene3D
│                        ├── Canvas „Arena“ (z 0, hinter dem Inhalt) ─ Arena
│                        └── Canvas „Ball“  (z 30, über dem Inhalt)  ─ BallWorld, FrameGovernor
├── main
│   ├── Hero ── BallStage ([data-ball-anchor] · 2D-Ball · „Aufschlag wiederholen“) · StackChips
│   └── ProjectsSection ── ProjectFilter · ProjectCard ×6 (LanguageBar)
├── SiteFooter
└── BallDock ([data-ball-dock])
```

- **DOM-verankertes 3D:** Die Szene misst jedes Frame zwei leere DOM-Boxen —
  `[data-ball-anchor]` im Hero und `[data-ball-dock]` unten rechts — und rechnet sie in
  Weltkoordinaten um (Kamera fix auf z = 10, Blick entlang −z). Darum sitzt der Ball auf
  jeder Bildschirmgröße exakt im Layout, und zwar immer in einem **textfreien** Bereich.
- **Stores statt Provider:** `createStore` + `useSyncExternalStore`. Dieselben Stores
  liest auch der lazy geladene 3D-Chunk (gleiche Modulinstanz).
- **`ballBridge`:** Status `off | loading | ready | failed` (steuert 2D vs. 3D) und
  Befehle `serve` / `spike` vom DOM an die Szene.

## 3. Die Volleyball-Animation

| Phase | Umsetzung |
|---|---|
| **Aufschlag** beim Betreten | Der Aufschläger steht hinter der gegnerischen Grundlinie (z = −40) — genau auf dem Kamerastrahl durch den Anker, deshalb bleibt die Bahn auf dem Bildschirm in der Ball-Spalte. Wurf (Parabel, Scheitel exakt nach 0,62 s) → kurz nach dem Scheitel Treffer (Topspin 30 rad/s + kleiner Lichtring) → Flug mit Schwerkraft + Magnus-Zug, analytisch gelöst, sodass er **exakt** im Anker landet (`planServe`, getestet) → Annahme: 82 % des Impulses werden „geschluckt“, der Rest federt aus. Kometenschweif als Motion-Blur. |
| **Ruhe im Hero** | Gedämpfte Feder (ω 8,5, ζ 0,6) zum Anker, leichtes Schweben, Leerlauf-Drehung 0,5 rad/s, Bodenschatten über `--ball-shadow`. |
| **Scroll-Sync + Geschwindigkeitskopplung** | `ω_ziel = 0,0105 · v_scroll` (rad/s pro px/s, gedeckelt bei 30). Die echte Winkelgeschwindigkeit folgt mit Trägheit: `ω ← ω_ziel + (ω − ω_ziel)·e^(−2,6·dt)`. Der Drehwinkel wird pro Schritt **exakt** integriert ⇒ identisch bei 30 und 144 FPS (Test). Gemessen: Leerlauf 0,5 · langsam ≈ 3 · schnell ≈ 12–14 rad/s, danach sanftes Auslaufen. |
| **Dock** | Nach dem Hero fliegt der Ball (Feder) in den „Nach oben“-Button und dreht dort mit jedem Scrollen weiter. In Ruhe schläft die Render-Schleife. |
| **Interaktion** | Hover (Maus): +6 % Größe, Rim-Licht, Neigung zum Zeiger · Klick: Schmetterball (Impuls + Spin + Ring). Tastatur: „Aufschlag wiederholen“. |
| **Shader** | Panel-Muster wird pro Pixel aus der Kugelnormalen berechnet (Würfelprojektion, 3 Streifen/Fläche) — keine Textur, scharf in jeder Größe, Nähte per `fwidth` geglättet. Bei schnellem Spin verschmelzen die Farben (Motion-Blur). |

## 4. Die fünf Pflicht-Trends

| Trend | Umsetzung |
|---|---|
| **Interaktive 3D-Elemente** | Volleyballfeld mit Netz als dezenter Raum hinter dem Hero; 5 Wireframe-Satelliten reagieren auf Hover (Amber + größer + schneller), Klick (Spin-Stoß) und Scrollen (Parallaxe + Drehung); Kamera-Parallaxe zur Maus; Projektkarten mit leichtem 3D-Tilt. |
| **Barrierefreiheit (EAA)** | siehe Abschnitt 5 |
| **Micro-Interactions** | Magnetische CTA-Buttons, Karten mit zeigerfolgendem Rand-Glow + Lift + Bild-Zoom, Filter-Chips mit Zähler, Pfeil-Nudges an Links, Social-Buttons mit Lift + Glow, Replay-Icon dreht sich. **Jeder Hover-Effekt hat ein identisches `:focus-visible`-Gegenstück.** |
| **Personalisierte UX** | Filter nach Technologie; Hero-Chips springen vorgefiltert zu den Projekten. Klicks (Filter, Chips, Projektlinks) ergeben ein lokales, zeitlich abklingendes Interessenprofil → beim nächsten Besuch stehen passende Projekte oben („Für dich“), der passende Stack-Chip leuchtet live. Kein Tracking, nichts verlässt den Browser, „Zurücksetzen“ jederzeit. |
| **Performance** | siehe Abschnitt 6 |

## 5. Barrierefreiheit (EAA → EN 301 549 → WCAG 2.1 AA)

- **Semantik:** `header`/`nav`/`main`/`footer`, eine `h1`, `h2` je Sektion, `h3` je Karte,
  `article` pro Projekt, Listen für Chips/Technologien, `time` für Daten.
- **Tastatur:** Skip-Link, logische Tab-Reihenfolge (geprüft), Dock-Button setzt den Fokus
  nach oben, „Zurücksetzen“ fokussiert die Überschrift. Kartenklickfläche per
  Stretched-Link — keine verschachtelten Links.
- **ARIA:** Filter = Toggle-Buttons mit `aria-pressed` in `role="group"`, Ergebnis per
  `role="status"` angesagt („2 Projekte mit Flutter angezeigt“); externe Links mit
  „(öffnet in neuem Tab)“ + `rel="noopener noreferrer"`; Canvases `aria-hidden`, der Ball
  hat `role="img"` mit Beschreibung; dekorative Icons `aria-hidden`.
- **Bewegung:** `prefers-reduced-motion` ⇒ statischer 2D-Ball, **der 3D-Chunk wird gar
  nicht geladen** (geprüft). Sichtbarer Schalter „Animationen“ (WCAG 2.2.2), gespeichert,
  greift vor dem ersten Paint. Pausiert = exakt der Reduced-Motion-Pfad.
- **Kontrast (gemessen):** Text cream 17,2 : 1 · mist 9,5 : 1 · haze 6,3 : 1 · amber 11,1 : 1 ·
  Button-Text auf Amber 11,1 : 1 · Bedienelement-Rahmen ≥ 3,3 : 1 (WCAG 1.4.11).
  Der Ball ruht nie unter Text (Aufschlag-Bahn gemessen: 0 Überschneidungen mit Text,
  Desktop und Mobil). Spielfeld, Netz und Satelliten bleiben rechts vom Text — geprüft bei
  1024, 1280, 1366 und 1440 px Breite — und das Spielfeld entfällt im gestapelten
  Mobil-Layout (geprüft bei 390 px).
- **Alternativtexte** für alle Projektbilder (beschreiben den Bildinhalt).

## 6. Performance

| Teil | Größe (gzip) | Wann geladen |
|---|---|---|
| App (React + Seite) | ≈ 87 kB JS + 14 kB CSS | sofort |
| 3D-Chunk (three + R3F) | ≈ 248 kB | erst im Leerlauf nach dem ersten Paint — **nie** bei Reduced Motion, Save-Data oder ohne (schnelles) WebGL |
| Schriften (selbst gehostet) | ≈ 140 kB (nur Latin-Subsets) | sofort, `font-display: swap` |
| Projektbilder | 4–28 kB (640 px) / 9–89 kB (1200 px) WebP | lazy, mit `srcset`, feste Maße (kein Layout-Shift) |

- **Render on demand:** Arena rendert nur, solange der Hero sichtbar ist; der Ball
  schläft im Dock, sobald nichts mehr dreht. Pixel-Ratio gedeckelt (Ball 2, Arena 1,25).
- **Adaptive Qualität:** `FrameGovernor` misst FPS → Arena aus → Ball-DPR 1 → 2D-Fallback.
  Verlorener WebGL-Kontext → 2D, neuer Versuch beim Zurückkehren in den Tab.
- **Aufschlag auch auf langsamen Geräten:** getestet mit 4× CPU-Drosselung + 1,6 Mbit/s
  (3D nach 4,3 s) und 6× + 0,8 Mbit/s (3D nach 9,3 s) — der Aufschlag spielt in beiden
  Fällen. Erst wenn der 3D-Chunk *nach Ladebeginn* länger als 6 s braucht, springt der
  2D-Ball ein; der 3D-Ball blendet dann an Ort und Stelle ein.
- **Shader statt Wasm:** Die rechenintensiven Effekte (1 700 Staubpartikel, Panel-Muster,
  Glow-Schweif) laufen komplett auf der GPU — die CPU setzt pro Frame nur ein paar Uniforms.
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
- **Siederhub `app/`:** die Videos `app/media/*.mp4` sind nicht im Repo (404).

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

1. **Tech-Stack & Fähigkeiten** — Sektion mit Erfahrungslevel; liest `interestStore` und
   hebt die Skills hervor, die der Besucher angeklickt hat (Hook ist schon da).
2. **Kontakt** — Formular (z. B. Formspree / eigener Endpoint), Social Links aus `profile.js`
   (LinkedIn/X/Discord eintragen → erscheinen automatisch).
3. Optional: `og:image` (Vorschaubild beim Teilen), Portfolio als Startseite von Siederhub
   (GYM STATS nach `/gym/`).
