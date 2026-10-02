// localStorage can be missing or throw (private mode, blocked site data,
// quota). Everything stored here is a per-visitor convenience, so every
// access fails soft and the page works the same without it.

export function readString(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — keep the in-memory value only */
  }
}

export function readJSON(key, fallback) {
  const raw = readString(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  writeString(key, JSON.stringify(value));
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to clean up */
  }
}
