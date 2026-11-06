import {
  subscribePrivateList,
  refreshPrivateList,
  subscribePlaylists,
  refreshPlaylists,
} from "./playlistSubscriptions";

import { getFirebaseAuth } from "./firebase";
import { Playlist } from "../types/domain";
import {
  backendDelete,
  backendPatch,
  backendPost,
  backendPut,
} from "./backendService";

export function watchPlaylists(
  uid: string,
  next: (p: Playlist[]) => void,
  fail: (e: Error) => void,
) {
  return subscribePlaylists(uid, next, fail);
}

export function watchFavorites(
  uid: string,
  next: (ids: string[]) => void,
  fail: (e: Error) => void,
) {
  return subscribePrivateList<{ id: string }>(
    uid,
    "/favorites",
    (items) => next(items.map((item) => item.id)),
    fail,
  );
}

export function watchFollowing(
  uid: string,
  next: (ids: string[]) => void,
  fail: (e: Error) => void,
) {
  return subscribePrivateList<{ id: string }>(
    uid,
    "/following",
    (items) => next(items.map((item) => item.id)),
    fail,
  );
}

function requireAccount(uid: string) {
  if (getFirebaseAuth().currentUser?.uid !== uid)
    throw new Error("Phiên đăng nhập đã thay đổi.");
}
export async function savePlaylist(
  uid: string,
  id: string | null,
  name: string,
  description: string,
  isPublic = false,
  idempotencyKey?: string,
) {
  requireAccount(uid);
  const fields = { name, description, isPublic };
  const result = await (id
    ? backendPatch(`/playlists/${encodeURIComponent(id)}`, fields)
    : backendPost("/playlists", fields, idempotencyKey));
  refreshPlaylists(uid);
  return result;
}
export async function deletePlaylist(uid: string, id: string) {
  requireAccount(uid);
  const result = await backendDelete(`/playlists/${encodeURIComponent(id)}`);
  refreshPlaylists(uid);
  return result;
}
export async function changePlaylistSong(
  uid: string,
  id: string,
  songId: string,
  add: boolean,
) {
  requireAccount(uid);
  const path = `/playlists/${encodeURIComponent(id)}/songs/${encodeURIComponent(songId)}`;
  const result = await (add ? backendPut(path) : backendDelete(path));
  refreshPlaylists(uid);
  return result;
}
export async function setFavorite(uid: string, songId: string, value: boolean) {
  requireAccount(uid);
  const path = `/favorites/${encodeURIComponent(songId)}`;
  const result = await (value ? backendPut(path) : backendDelete(path));
  refreshPrivateList(uid, "/favorites");
  return result;
}

const followQueues = new Map<string, Promise<void>>();

export async function setFollow(uid: string, target: string, value: boolean) {
  if (uid === target) {
    throw new Error("Không thể tự theo dõi.");
  }

  const auth = getFirebaseAuth();
  if (auth.currentUser?.uid !== uid)
    throw new Error("Cần đăng nhập đúng tài khoản.");
  const key = `${auth.app.name}:${uid}`;
  // Separate buttons can submit the same relationship before snapshots catch
  // up. Serialize this account's changes, including follow then unfollow.
  const previous = followQueues.get(key) ?? Promise.resolve();
  const work = previous
    .catch(() => {})
    .then(async () => {
      if (auth.currentUser?.uid !== uid)
        throw new Error("Phiên đăng nhập đã thay đổi.");
      await changeFollow(uid, target, value);
    });
  followQueues.set(key, work);
  try {
    await work;
  } finally {
    if (followQueues.get(key) === work) followQueues.delete(key);
  }
}

async function changeFollow(uid: string, target: string, value: boolean) {
  requireAccount(uid);
  const path = `/following/${encodeURIComponent(target)}`;
  if (value) await backendPut(path);
  else await backendDelete(path);
  refreshPrivateList(uid, "/following");
}
