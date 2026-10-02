import { createStore } from "./store.js";
import { readJSON, removeKey, writeJSON } from "./storage.js";

// Personalisation without tracking: which technologies this visitor seems
// interested in, judged only by what they click here (project filters, hero
// stack chips, project links). Lives in their own browser's localStorage,
// is never sent anywhere, and can be reset from the projects section.
//
// Scores are recency-weighted: every new signal first fades all older ones,
// so the "focus" follows what someone looks at now, not last month.
const KEY = "sieder.interests.v1";
const FADE = 0.85;
const FOCUS_MIN = 1.5; // one filter click is a hint; it takes a little more to re-order the page

function load() {
  const raw = readJSON(KEY, {});
  const clean = {};
  if (raw && typeof raw === "object") {
    for (const [tag, score] of Object.entries(raw)) {
      if (typeof score === "number" && Number.isFinite(score) && score > 0) clean[tag] = score;
    }
  }
  return clean;
}

export const interestStore = createStore(typeof window !== "undefined" ? load() : {});

export function recordInterest(tags, weight = 1) {
  interestStore.set((prev) => {
    const round = (n) => Math.round(n * 1000) / 1000;
    const next = {};
    for (const [tag, score] of Object.entries(prev)) {
      const faded = score * FADE;
      if (faded > 0.05) next[tag] = round(faded);
    }
    for (const tag of tags) next[tag] = round((next[tag] || 0) + weight);
    writeJSON(KEY, next);
    return next;
  });
}

export function resetInterests() {
  interestStore.set({});
  removeKey(KEY);
}

// The visitor's strongest interest, or null if nothing stands out yet.
export function focusOf(scores) {
  let best = null;
  let bestScore = FOCUS_MIN;
  for (const [tag, score] of Object.entries(scores)) {
    if (score >= bestScore) {
      best = tag;
      bestScore = score;
    }
  }
  return best;
}
