import { Playlist } from "../types/Playlist";

// TODO (phối hợp auth + backend): chỉ cho phép owner sửa/xóa playlist; enforcement cần Firestore Rules.
export async function getUserPlaylists(_userId: string): Promise<Playlist[]> {
  // Chưa kết nối Firestore.
  return [];
}
