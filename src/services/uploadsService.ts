import { backendGet } from "./backendService";
import { getFirebaseAuth } from "./firebase";
import type { Song } from "../types/domain";
import type { SearchResult } from "../types/search";
import type { CursorPage } from "../utils/pager";

/** Build a complete queue before playback; never play an incomplete failed scan. */
export async function loadUploadsQueue(
  isCurrent: () => boolean = () => true,
): Promise<Song[]> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Cần đăng nhập.");
  const check = () => {
    if (!isCurrent() || getFirebaseAuth().currentUser !== user)
      throw new Error("Phiên tải danh sách đã kết thúc.");
  };
  const songs = new Map<string, Song>();
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    check();
    const page: CursorPage<SearchResult> = await backendGet("/uploads", {
      pageSize: "20",
      ...(cursor ? { cursor } : {}),
    });
    check();
    for (const row of page.items) {
      if (row.kind === "song") songs.set(row.item.id, row.item);
    }
    if (!page.hasMore) return [...songs.values()];
    if (!page.nextCursor || seen.has(page.nextCursor))
      throw new Error("Không thể tải đủ danh sách bài hát. Hãy thử lại.");
    seen.add(page.nextCursor);
    cursor = page.nextCursor;
  } while (cursor);
  return [...songs.values()];
}
