import type { Song, Album, Artist } from "./domain";
export type SearchResult =
  | { kind: "song"; item: Song }
  | { kind: "album"; item: Album }
  | { kind: "artist"; item: Artist }
  | { kind: "user"; item: Artist };
