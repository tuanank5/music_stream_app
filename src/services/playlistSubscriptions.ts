import { backendGet } from "./backendService";
import { getFirebaseAuth } from "./firebase";
import type { Playlist } from "../types/domain";
import { observeBackendWrites } from "./backendEvents";
const subscribers = new Map<string, Set<() => void>>();
export function refreshPlaylists(uid: string) {
  refreshPrivateList(uid, "/my-playlists");
}
export function subscribePlaylists(
  uid: string,
  next: (items: Playlist[]) => void,
  fail: (error: Error) => void,
) {
  return subscribePrivateList(uid, "/my-playlists", next, fail);
}
export function refreshPrivateList(uid: string, path: string) {
  subscribers.get(`${uid}:${path}`)?.forEach((refresh) => refresh());
}
export function subscribePrivateList<T extends { id: string }>(
  uid: string,
  path: string,
  next: (items: T[]) => void,
  fail: (error: Error) => void,
) {
  const subscriptionKey = `${uid}:${path}`;
  let live = true,
    running = false,
    dirty = false;
  const valid = () => live && getFirebaseAuth().currentUser?.uid === uid;
  async function refresh() {
    if (!valid()) return;
    if (running) {
      dirty = true;
      return;
    }
    running = true;
    try {
      const items = new Map<string, T>(),
        seen = new Set<string>();
      let cursor: string | null = null;
      do {
        const page: { items: T[]; nextCursor: string | null } =
          await backendGet(path, {
            pageSize: "50",
            ...(cursor ? { cursor } : {}),
          });
        if (!valid()) return;
        page.items.forEach((item) => items.set(item.id, item));
        cursor = page.nextCursor;
        if (cursor && seen.has(cursor))
          throw new Error("Cursor playlist bị lặp.");
        if (cursor) seen.add(cursor);
      } while (cursor);
      if (valid() && !dirty) next([...items.values()]);
    } catch (error) {
      if (valid())
        fail(error instanceof Error ? error : new Error(String(error)));
    } finally {
      running = false;
      if (dirty && valid()) {
        dirty = false;
        void refresh();
      }
    }
  }
  const refreshNow = () => {
    void refresh();
  };
  const stopWrites = observeBackendWrites((changedUid, changedPath) => {
    if (changedUid !== uid) return;
    const ownSongs = ["/catalog/own-songs", "/catalog/public-songs"].includes(
      path,
    );
    const artist = path === "/catalog/artists";
    const album = path === "/catalog/albums";
    const follower =
      path.startsWith("/catalog/follower-songs/") &&
      changedPath === `/following/${path.split("/").at(-1)}`;
    const detail =
      path.startsWith("/song-items/") &&
      (changedPath === `/songs/${path.split("/").at(-1)}` ||
        changedPath === `/songs/${path.split("/").at(-1)}/cover`);
    if (
      (ownSongs && /^\/(songs|albums)(\/|$)/.test(changedPath)) ||
      (artist &&
        (changedPath === "/me" || changedPath.startsWith("/following/"))) ||
      (album && /^\/albums(\/|$)/.test(changedPath)) ||
      follower ||
      detail
    )
      refreshNow();
  });
  const group = subscribers.get(subscriptionKey) || new Set<() => void>();
  group.add(refreshNow);
  subscribers.set(subscriptionKey, group);
  refreshNow();
  return () => {
    stopWrites();
    live = false;
    group.delete(refreshNow);
    if (!group.size && subscribers.get(subscriptionKey) === group)
      subscribers.delete(subscriptionKey);
  };
}
