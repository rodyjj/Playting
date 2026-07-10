// Keyed by id and storing the full item (not just a Set of ids) so the
// "볼거에요"/"인생작" tabs have enough to render a poster grid without
// needing to re-fetch anything — a toggle from the home AI courses, 꿀맛
// 랭킹, search results, or a custom course order all carry different native
// shapes, so this is the one common shape they get normalized into.
export type FavoriteItem = {
  id: string;
  title: string;
  posterUrl: string | null;
  year?: number;
  ott?: string;
  watchUrl?: string;
};

export type CollectionKey = "watchlist" | "best" | "watched";

const STORAGE_KEYS: Record<CollectionKey, string> = {
  // Kept under the pre-existing "playting_favorites" key (from before
  // 인생작/볼거에요 were split into two separate lists) so favorites toggled
  // earlier keep showing up under their new home, 볼거에요.
  watchlist: "playting_favorites",
  best: "playting_best",
  watched: "playting_watched",
};

function readCollection(key: CollectionKey): Record<string, FavoriteItem> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[key]);
    return raw ? (JSON.parse(raw) as Record<string, FavoriteItem>) : {};
  } catch {
    return {};
  }
}

function writeCollection(key: CollectionKey, items: Record<string, FavoriteItem>) {
  window.localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(items));
}

export function isInCollection(key: CollectionKey, id: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(readCollection(key)[id]);
}

/** Newest-toggled first, for the poster grid. */
export function getCollection(key: CollectionKey): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  return Object.values(readCollection(key)).reverse();
}

/** Flips the stored membership for `item.id` within `key` and returns the resulting state. */
export function toggleCollection(key: CollectionKey, item: FavoriteItem): boolean {
  const items = readCollection(key);
  const nextActive = !items[item.id];
  if (nextActive) items[item.id] = item;
  else delete items[item.id];
  writeCollection(key, items);
  return nextActive;
}

/**
 * Logs `item` as watched — called from every external "watch" link/button
 * (poster click-through, 시청하기) rather than from a manual toggle button.
 * Re-inserts on a repeat view so it moves back to the front of "봤어요"
 * (getCollection reverses insertion order), matching a "recently watched" feel.
 */
export function markWatched(item: FavoriteItem): void {
  const items = readCollection("watched");
  delete items[item.id];
  items[item.id] = item;
  writeCollection("watched", items);
}

/** Removes `id` from `key` outright — used by the "제거" button in "봤어요". */
export function removeFromCollection(key: CollectionKey, id: string): void {
  const items = readCollection(key);
  delete items[id];
  writeCollection(key, items);
}
