const FAVORITES_KEY = "playting_favorites";

function readFavoriteIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeFavoriteIds(ids: Set<string>) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}

export function isFavorite(id: string): boolean {
  if (typeof window === "undefined") return false;
  return readFavoriteIds().has(id);
}

/** Flips the stored membership for `id` and returns the resulting state. */
export function toggleFavorite(id: string): boolean {
  const ids = readFavoriteIds();
  const nextFavorited = !ids.has(id);
  if (nextFavorited) ids.add(id);
  else ids.delete(id);
  writeFavoriteIds(ids);
  return nextFavorited;
}
