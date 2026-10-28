export type Song = {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  cover: string;
  audioUrl: string;
  audioKey: string;
  durationSeconds: number;
  lyrics: string;
  active: boolean;
};
export type SongInput = Omit<Song, "id" | "cover"> & { coverUrl: string };
export type Artist = {
  id: string;
  name: string;
  imageUrl: string;
  biography: string;
  active: boolean;
};
export type Playlist = {
  id: string;
  name: string;
  description: string;
  songIds: string[];
};
export type FeedPost = {
  id: string;
  ownerId: string;
  authorName: string;
  content: string;
  songId: string;
  active: boolean;
  createdAt: number;
};
export type Comment = {
  id: string;
  ownerId: string;
  authorName: string;
  content: string;
  createdAt: number;
};
