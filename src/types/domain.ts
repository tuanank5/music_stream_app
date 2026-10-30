// export type Song = {
//   id: string;
//   title: string;
//   artist: string;
//   artistId: string;
//   album: string;
//   cover: string;
//   audioUrl: string;
//   audioKey: string;
//   durationSeconds: number;
//   lyrics: string;
//   active: boolean;
// };
// export type SongInput = Omit<Song, "id" | "cover"> & { coverUrl: string };
// export type Artist = {
//   id: string;
//   name: string;
//   imageUrl: string;
//   biography: string;
//   active: boolean;
// };
// export type Playlist = {
//   id: string;
//   name: string;
//   description: string;
//   songIds: string[];
// };
// export type FeedPost = {
//   id: string;
//   ownerId: string;
//   authorName: string;
//   content: string;
//   songId: string;
//   active: boolean;
//   createdAt: number;
// };
// export type Comment = {
//   id: string;
//   ownerId: string;
//   authorName: string;
//   content: string;
//   createdAt: number;
// };

//Update Date 10/30/2026
export type Visibility =
  | "public"
  | "unlisted"
  | "private"
  | "followers";

export type Song = {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  artistNames: string[];
  album: string;
  albumId: string;
  cover: string;
  audioUrl: string;
  audioKey: string;
  durationSeconds: number;
  lyrics: string;
  genre: string[];
  playCount: number;
  visibility: Visibility;
  isPublished: boolean;
  active: boolean;
};

export type SongInput = Pick<
  Song,
  | "title"
  | "artist"
  | "artistId"
  | "album"
  | "audioUrl"
  | "audioKey"
  | "durationSeconds"
  | "lyrics"
  | "active"
> & {
  coverUrl: string;
  albumId?: string;
  genre?: string[];
  visibility?: Visibility;
  description?: string;
  tags?: string[];
};

export type Artist = {
  id: string;
  name: string;
  imageUrl: string;
  biography: string;
  active: boolean;
  followerCount?: number;
  followingCount?: number;
};

export type Album = {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  coverUrl: string;
  isPublished: boolean;
};

export type Playlist = {
  id: string;
  name: string;
  description: string;
  songIds: string[];
};

export type HistoryEntry = {
  id: string;
  songId: string;
  playedAt: number;
  progressSeconds: number;
  durationSeconds: number;
  listenedSeconds: number;
  completed: boolean;
  counted: boolean;
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
