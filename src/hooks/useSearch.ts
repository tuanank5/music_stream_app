import { useCursorList } from "./useCursorList";
export function useSearch(query: string, kind: string | null, smart = false) {
  return useCursorList(
    "/search",
    {
      q: query.trim(),
      mode: smart ? "smart" : "keyword",
      kind:
        kind === "tracks"
          ? "song"
          : kind === "albums"
            ? "album"
            : kind === "artists"
              ? "artist"
              : "",
    },
    !!query.trim(),
    300,
  );
}
