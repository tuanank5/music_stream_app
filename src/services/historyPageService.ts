import { getFirebaseAuth } from "./firebase";
import { backendGet } from "./backendService";
import type { HistoryEntry, Song } from "../types/domain";
export type HistoryRow = { song: Song; entry: HistoryEntry };
export function createHistorySource(uid: string) {
  let cursor: string | null = null,
    exhausted = false,
    emitted = 0;
  let buffer: HistoryRow[] = [];
  const seen = new Set<string>();
  let pageNumber = 0;
  const requests = new Map<
    string,
    Promise<{
      items: HistoryRow[];
      hasMore: boolean;
      nextCursor: string | null;
    }>
  >();
  const fetchPage = async (_cursor: string | null, size: number) => {
    if (getFirebaseAuth().currentUser?.uid !== uid)
      throw new Error("Phiên đăng nhập đã thay đổi.");
    for (
      let scan = 0;
      scan < 3 &&
      !exhausted &&
      buffer.length < size &&
      emitted + buffer.length < 100;
      scan++
    ) {
      const page = await backendGet<{
        items: { entry: HistoryEntry; song: Song | null }[];
        nextCursor: string | null;
      }>("/history", cursor ? { cursor } : {});
      const batchSeen = new Set(seen);
      const candidates = page.items.filter((row) => {
        if (batchSeen.has(row.entry.songId)) return false;
        batchSeen.add(row.entry.songId);
        return true;
      });
      const rows = candidates.map((row) =>
        row.song ? { song: row.song, entry: row.entry } : null,
      );
      if (getFirebaseAuth().currentUser?.uid !== uid)
        throw new Error("Phiên đăng nhập đã thay đổi.");
      // Commit cursor only when the complete metadata batch succeeds.
      for (let index = 0; index < candidates.length; index++) {
        const id = candidates[index].entry.songId;
        if (seen.has(id)) continue;
        seen.add(id);
        if (rows[index]) buffer.push(rows[index]!);
      }
      cursor = page.nextCursor;
      exhausted = !cursor;
    }
    const items = buffer.splice(0, Math.min(size, 100 - emitted));
    emitted += items.length;
    const hasMore = emitted < 100 && (buffer.length > 0 || !exhausted);
    return {
      items,
      hasMore,
      nextCursor: hasMore ? String(++pageNumber) : null,
    };
  };
  return (cursor: string | null, size: number) => {
    if (getFirebaseAuth().currentUser?.uid !== uid)
      return Promise.reject(new Error("Phiên đăng nhập đã thay đổi."));
    const key = `${cursor ?? "first"}:${size}`;
    const cached = requests.get(key);
    if (cached) return cached;
    while (requests.size >= 128) requests.delete(requests.keys().next().value!);
    const work = fetchPage(cursor, size);
    requests.set(key, work);
    void work.catch(() => {
      if (requests.get(key) === work) requests.delete(key);
    });
    return work;
  };
}
