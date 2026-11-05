import { useCursorList } from "./useCursorList";
export function useSearch(query: string, kind: string | null) {
  return useCursorList(
    "/search",
    {
      q: query.trim(),
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
