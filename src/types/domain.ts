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
export type Visibility = "public" | "unlisted" | "private" | "followers";

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
  isPublic?: boolean;
  description?: string;
  songCount?: number;
  durationSeconds?: number;
};

export type Playlist = {
  id: string;
  name: string;
  description: string;
  songIds: string[];
  isPublic?: boolean;
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
