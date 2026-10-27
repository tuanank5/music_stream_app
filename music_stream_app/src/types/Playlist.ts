export interface Playlist {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  songIds: string[];
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}
