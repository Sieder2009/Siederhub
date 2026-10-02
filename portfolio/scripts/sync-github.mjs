// Holt die Metadaten aller öffentlichen Repos von github.com/Sieder2009
// (Beschreibung, Sprachen, Erstellt-/Aktualisiert-Datum) und schreibt sie nach
// src/data/github.json. Die Projektkarten lesen Sprachen und Datum daraus.
//
//   npm run sync:github
//
// Läuft nur lokal bzw. beim Bauen — die fertige Website ruft keine API auf
// (schneller, kein Rate-Limit, keine Anfragen an Dritte). Ohne Token gilt das
// GitHub-Limit von 60 Anfragen pro Stunde; mit GITHUB_TOKEN=... deutlich mehr.
import { writeFile } from "node:fs/promises";

const USER = "Sieder2009";
const headers = { Accept: "application/vnd.github+json", "User-Agent": "sieder-portfolio-sync" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function get(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

const repos = await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`);
const out = { user: USER, fetchedAt: new Date().toISOString(), repos: {} };

for (const repo of repos) {
  if (repo.fork) continue;
  out.repos[repo.name] = {
    url: repo.html_url,
    description: repo.description,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
    stars: repo.stargazers_count,
    languages: await get(repo.languages_url),
  };
}

await writeFile(new URL("../src/data/github.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`github.json: ${Object.keys(out.repos).length} Repos von ${USER}`);
